import { cleanCache } from '@/lib/cache/local_file_cache'
import { refreshNotionSiteDataInBackground } from '@/lib/cache/notion-runtime-refresh'
import { bumpCacheGeneration } from '@/lib/cache/cache_generation'
import { triggerVercelDeployHook } from '@/lib/server/deploy-hook'

/**
 * 清理缓存
 * @param {*} req
 * @param {*} res
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res
      .status(405)
      .json({ status: 'error', message: 'Method not allowed' })
  }

  const token = process.env.CACHE_REVALIDATION_TOKEN
  if (!token) {
    return res.status(503).json({
      status: 'error',
      message:
        'Cache revalidation is disabled: missing CACHE_REVALIDATION_TOKEN'
    })
  }

  if (req.headers.authorization !== `Bearer ${token}`) {
    return res.status(401).json({ status: 'error', message: 'Unauthorized' })
  }

  try {
    let body = req.body
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body)
      } catch {
        body = null
      }
    }

    if (body?.clearOnly === true) {
      const generation = await bumpCacheGeneration('cache-clear-only')
      cleanCache()
      return res
        .status(200)
        .json({
          status: 'success',
          message: 'Clean cache successful!',
          generation
        })
    }

    if (isVercelDeployment()) {
      const deploy = await triggerVercelDeployHook('cache-refresh')
      if (!deploy.configured) {
        return res.status(503).json({
          status: 'error',
          message:
            'Full cache refresh is not configured. Set VERCEL_DEPLOY_HOOK_URL.',
          deploy
        })
      }
      if (!deploy.triggered) {
        return res.status(502).json({
          status: 'error',
          message: deploy.message,
          deploy
        })
      }
      return res.status(202).json({
        status: 'accepted',
        message:
          'Vercel rebuild queued. The new deployment will refresh the site data.',
        deploy
      })
    }

    const generation = await bumpCacheGeneration('cache-refresh')
    const { started } = refreshNotionSiteDataInBackground('api-cache')
    res.status(202).json({
      status: 'accepted',
      message: started
        ? 'Notion refresh started in background. Old cache remains available.'
        : 'A Notion refresh is already running. Reused the current task.',
      generation
    })
  } catch (error) {
    console.error('Cache refresh scheduling error:', error)
    res
      .status(400)
      .json({ status: 'error', message: 'Cache refresh scheduling failed!' })
  }
}

function isVercelDeployment() {
  return process.env.VERCEL === '1' || Boolean(process.env.VERCEL_ENV)
}
