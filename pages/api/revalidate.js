import BLOG from '@/blog.config'
import { triggerVercelDeployHook } from '@/lib/server/deploy-hook'

const MAX_PATHS = 100
const REVALIDATE_CONCURRENCY = 3
const REVALIDATE_DEADLINE_MS = 45 * 1000

export const config = {
  maxDuration: 60
}

/**
 * On-Demand Revalidation API
 *
 * POST /api/revalidate
 * Authorization: Bearer <REVALIDATION_TOKEN>
 *
 * Body:
 *   { "path": "/article/my-post" }
 *   { "paths": ["/", "/article/post-1"] }
 *   { "all": true }
 *   { "mode": "full" }
 *
 * Locally, paths are revalidated directly for testing. On Vercel, all requests
 * trigger a Deploy Hook instead: rebuilding a route inside a serverless
 * function can still assemble the full Notion data set and exceed the function
 * timeout. Vercel builds do not have that request-duration limit and regenerate
 * every static route from the same committed source.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      ok: false,
      message: 'Method Not Allowed. Use POST.'
    })
  }

  const token = process.env.REVALIDATION_TOKEN || BLOG.REVALIDATION_TOKEN
  if (!token) {
    return res.status(503).json({
      ok: false,
      message: 'Revalidation is disabled: REVALIDATION_TOKEN not set'
    })
  }

  const authHeader = req.headers?.authorization || ''
  const receivedToken = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : req.body?.token || ''

  if (receivedToken !== token) {
    return res.status(401).json({ ok: false, message: 'Unauthorized' })
  }

  const body = parseBody(req.body)
  const reason = String(body.reason || 'manual').slice(0, 120)

  try {
    if (body.all === true || body.mode === 'full' || body.refreshData === true) {
      return await handleFullRebuild(res, reason)
    }

    const requestedPaths = collectRequestedPaths(body)
    if (requestedPaths.error) {
      return res.status(400).json({ ok: false, message: requestedPaths.error })
    }

    const normalized = []
    const invalid = []
    for (const rawPath of requestedPaths.paths) {
      const result = normalizeRevalidationPath(rawPath)
      if (result.ok) {
        if (!normalized.includes(result.path)) normalized.push(result.path)
      } else {
        invalid.push(result)
      }
    }

    if (invalid.length > 0) {
      return res.status(400).json({
        ok: false,
        message: 'One or more paths are invalid',
        invalid
      })
    }

    if (normalized.length === 0) {
      return res.status(400).json({
        ok: false,
        message: 'No paths to revalidate'
      })
    }

    if (isVercelDeployment()) {
      return await handleFullRebuild(res, reason, normalized)
    }

    const batch = await revalidatePaths(res, normalized, {
      deadlineMs: resolveRevalidateDeadlineMs()
    })
    const failures = batch.results.filter(item => !item.revalidated)
    const status = getResponseStatus(batch, failures)

    return res.status(status).json({
      ok: batch.complete && failures.length === 0,
      complete: batch.complete,
      partial: !batch.complete || failures.length > 0,
      message: batch.complete
        ? `Revalidated ${batch.results.length - failures.length}/${batch.results.length} paths`
        : `Revalidated ${batch.results.length - failures.length}/${batch.results.length} paths; ${batch.remainingPaths.length} remaining${batch.timedOut ? ' (deadline exceeded)' : ''}`,
      mode: 'page-only',
      dataRefreshed: false,
      generation: null,
      results: batch.results,
      remainingPaths: batch.remainingPaths,
      timedOut: batch.timedOut
    })
  } catch (error) {
    console.error('[revalidate] Error:', error)
    return res.status(500).json({
      ok: false,
      message: 'Revalidation failed',
      error: String(error?.message || error)
    })
  }
}

async function handleFullRebuild(res, reason, requestedPaths = []) {
  const deploy = await triggerVercelDeployHook(reason)

  if (!deploy.configured) {
    return res.status(503).json({
      ok: false,
      message:
        'Full-site rebuild is not configured. Set VERCEL_DEPLOY_HOOK_URL.',
      deploy
    })
  }

  if (!deploy.triggered) {
    return res.status(502).json({
      ok: false,
      message: deploy.message,
      deploy
    })
  }

  return res.status(202).json({
    ok: true,
    accepted: true,
    message: 'Vercel rebuild queued. The new deployment will regenerate routes.',
    mode: 'full',
    dataRefreshed: false,
    rebuildQueued: true,
    requestedPaths,
    generation: null,
    deploy
  })
}

function isVercelDeployment() {
  return process.env.VERCEL === '1' || Boolean(process.env.VERCEL_ENV)
}

async function revalidatePaths(
  res,
  paths,
  { deadlineMs = REVALIDATE_DEADLINE_MS } = {}
) {
  const results = new Array(paths.length)
  let nextIndex = 0
  const startedAt = Date.now()
  let timedOut = false

  const worker = async () => {
    while (true) {
      const index = nextIndex++
      if (index >= paths.length) return
      const remainingMs = deadlineMs - (Date.now() - startedAt)
      if (remainingMs <= 0 || timedOut) {
        timedOut = true
        return
      }

      const path = paths[index]
      const outcome = await withDeadline(res.revalidate(path), remainingMs)
      if (!outcome.completed) {
        timedOut = true
        results[index] = {
          path,
          revalidated: false,
          timedOut: true,
          error: 'Revalidation deadline exceeded'
        }
        return
      }
      if (!outcome.error) {
        results[index] = { path, revalidated: true }
      } else {
        results[index] = {
          path,
          revalidated: false,
          error: String(outcome.error?.message || outcome.error)
        }
      }
    }
  }

  const workerCount = Math.min(REVALIDATE_CONCURRENCY, paths.length)
  await Promise.all(Array.from({ length: workerCount }, () => worker()))

  const completed = results.filter(Boolean)
  const remainingPaths = paths.filter((_, index) => !results[index])
  return {
    results: completed,
    remainingPaths,
    complete: !timedOut && remainingPaths.length === 0,
    timedOut
  }
}

function getResponseStatus(batch, failures) {
  if (!batch.complete) return 202
  if (failures.length === 0) return 200
  if (failures.length < batch.results.length) return 207
  return 502
}

function withDeadline(promise, remainingMs) {
  let timer
  const guarded = Promise.resolve(promise).then(
    value => ({ completed: true, value }),
    error => ({ completed: true, error })
  )
  const timeout = new Promise(resolve => {
    timer = setTimeout(() => resolve({ completed: false }), remainingMs)
  })

  return Promise.race([guarded, timeout]).finally(() => clearTimeout(timer))
}

function resolveRevalidateDeadlineMs() {
  const configured = Number(process.env.REVALIDATE_DEADLINE_MS)
  if (!Number.isFinite(configured) || configured <= 0) {
    return REVALIDATE_DEADLINE_MS
  }
  return Math.min(Math.max(Math.trunc(configured), 1000), REVALIDATE_DEADLINE_MS)
}

function parseBody(body) {
  if (!body) return {}
  if (typeof body !== 'string') return body
  try {
    return JSON.parse(body)
  } catch {
    return {}
  }
}

function collectRequestedPaths(body) {
  const raw = []
  if (body.path !== undefined) raw.push(body.path)
  if (body.paths !== undefined) {
    if (!Array.isArray(body.paths)) {
      return { error: '`paths` must be an array' }
    }
    raw.push(...body.paths)
  }

  if (raw.length === 0) raw.push('/')
  if (raw.length > MAX_PATHS) {
    return { error: `At most ${MAX_PATHS} paths can be revalidated at once` }
  }

  return { paths: raw }
}

/**
 * Only local page paths are accepted. This prevents the endpoint from being
 * used as an open redirect, SSRF helper, or API-cache purge primitive.
 */
function normalizeRevalidationPath(rawPath) {
  if (typeof rawPath !== 'string') {
    return { ok: false, rawPath, error: 'Path must be a string' }
  }

  let path = rawPath.trim()
  if (!path) path = '/'
  if (path.length > 2048) {
    return { ok: false, rawPath, error: 'Path is too long' }
  }
  if (/[\u0000-\u001f\\]/.test(path)) {
    return { ok: false, rawPath, error: 'Path contains invalid characters' }
  }
  if (
    path.startsWith('http://') ||
    path.startsWith('https://') ||
    path.startsWith('//')
  ) {
    return { ok: false, rawPath, error: 'External URLs are not allowed' }
  }
  if (path.includes('?') || path.includes('#')) {
    return {
      ok: false,
      rawPath,
      error: 'Query strings and hashes are not allowed'
    }
  }
  if (path.includes('//')) {
    return { ok: false, rawPath, error: 'Duplicate slashes are not allowed' }
  }
  if (!path.startsWith('/')) path = `/${path}`
  if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1)

  const segments = path.split('/').filter(Boolean)
  if (segments.some(segment => segment === '.' || segment === '..')) {
    return { ok: false, rawPath, error: 'Path traversal is not allowed' }
  }
  if (segments.some(segment => /%(2e|2f|5c)/i.test(segment))) {
    return {
      ok: false,
      rawPath,
      error: 'Encoded path separators are not allowed'
    }
  }
  if (path === '/api' || path.startsWith('/api/')) {
    return { ok: false, rawPath, error: 'API routes cannot be revalidated' }
  }
  if (path.startsWith('/_next/')) {
    return {
      ok: false,
      rawPath,
      error: 'Next.js internal routes cannot be revalidated'
    }
  }

  return { ok: true, path }
}

export const __test__ = {
  normalizeRevalidationPath,
  collectRequestedPaths,
  revalidatePaths,
  resolveRevalidateDeadlineMs
}
