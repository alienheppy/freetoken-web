/**
 * @jest-environment node
 */

import handler from '@/pages/api/revalidate'
import { triggerVercelDeployHook } from '@/lib/server/deploy-hook'

jest.mock('@/blog.config', () => ({
  __esModule: true,
  default: {
    REVALIDATION_TOKEN: ''
  }
}))

jest.mock('@/lib/server/deploy-hook', () => ({
  triggerVercelDeployHook: jest.fn()
}))

const createResponse = () => {
  const res = {}
  res.status = jest.fn(() => res)
  res.json = jest.fn(() => res)
  res.revalidate = jest.fn()
  return res
}

const createRequest = (body = {}, token = 'test-token') => ({
  method: 'POST',
  headers: {
    authorization: `Bearer ${token}`
  },
  body
})

describe('/api/revalidate', () => {
  const originalToken = process.env.REVALIDATION_TOKEN
  const originalDeployHook = process.env.VERCEL_DEPLOY_HOOK_URL
  const originalDeadline = process.env.REVALIDATE_DEADLINE_MS
  const originalVercel = process.env.VERCEL
  const originalVercelEnv = process.env.VERCEL_ENV

  beforeEach(() => {
    jest.clearAllMocks()
    process.env.REVALIDATION_TOKEN = 'test-token'
    delete process.env.VERCEL_DEPLOY_HOOK_URL
    delete process.env.REVALIDATE_DEADLINE_MS
    delete process.env.VERCEL
    delete process.env.VERCEL_ENV
    triggerVercelDeployHook.mockResolvedValue({
      configured: true,
      triggered: true,
      status: 200,
      message: 'queued'
    })
  })

  afterEach(() => {
    if (originalToken === undefined) delete process.env.REVALIDATION_TOKEN
    else process.env.REVALIDATION_TOKEN = originalToken
    if (originalDeployHook === undefined) delete process.env.VERCEL_DEPLOY_HOOK_URL
    else process.env.VERCEL_DEPLOY_HOOK_URL = originalDeployHook
    if (originalDeadline === undefined) delete process.env.REVALIDATE_DEADLINE_MS
    else process.env.REVALIDATE_DEADLINE_MS = originalDeadline
    if (originalVercel === undefined) delete process.env.VERCEL
    else process.env.VERCEL = originalVercel
    if (originalVercelEnv === undefined) delete process.env.VERCEL_ENV
    else process.env.VERCEL_ENV = originalVercelEnv
  })

  it('rejects non-POST requests', async () => {
    const res = createResponse()
    await handler({ method: 'GET', headers: {} }, res)
    expect(res.status).toHaveBeenCalledWith(405)
  })

  it('rejects a missing or wrong token', async () => {
    const res = createResponse()
    await handler(createRequest({ path: '/' }, 'wrong'), res)
    expect(res.status).toHaveBeenCalledWith(401)
  })

  it('revalidates a path without rotating the full-site data cache', async () => {
    const res = createResponse()
    await handler(createRequest({ path: '/article/demo' }), res)

    expect(res.revalidate).toHaveBeenCalledWith('/article/demo')
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        ok: true,
        complete: true,
        mode: 'page-only',
        dataRefreshed: false,
        generation: null
      })
    )
  })

  it('queues a Vercel rebuild for path requests on Vercel', async () => {
    process.env.VERCEL = '1'
    const res = createResponse()
    await handler(
      createRequest({ path: '/article/demo', reason: 'notion-edit' }),
      res
    )

    expect(res.revalidate).not.toHaveBeenCalled()
    expect(triggerVercelDeployHook).toHaveBeenCalledWith('notion-edit')
    expect(res.status).toHaveBeenCalledWith(202)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        accepted: true,
        mode: 'full',
        dataRefreshed: false,
        rebuildQueued: true,
        requestedPaths: ['/article/demo']
      })
    )
  })

  it('rejects external URLs and traversal paths', async () => {
    const res = createResponse()
    await handler(
      createRequest({ paths: ['https://evil.example', '/article/../secret'] }),
      res
    )

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.revalidate).not.toHaveBeenCalled()
  })

  it('returns 207 when only part of a batch succeeds', async () => {
    const res = createResponse()
    res.revalidate
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('not found'))

    await handler(createRequest({ paths: ['/', '/missing'] }), res)

    expect(res.status).toHaveBeenCalledWith(207)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        ok: false,
        partial: true,
        results: expect.arrayContaining([
          expect.objectContaining({ path: '/', revalidated: true }),
          expect.objectContaining({ path: '/missing', revalidated: false })
        ])
      })
    )
  })

  it('uses a Vercel Deploy Hook for all:true and fails clearly when absent', async () => {
    const res = createResponse()
    await handler(createRequest({ all: true }), res)

    expect(triggerVercelDeployHook).toHaveBeenCalledWith('manual')
    expect(res.status).toHaveBeenCalledWith(202)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        accepted: true,
        mode: 'full',
        dataRefreshed: false,
        rebuildQueued: true
      })
    )

    triggerVercelDeployHook.mockResolvedValueOnce({
      configured: false,
      triggered: false,
      message: 'VERCEL_DEPLOY_HOOK_URL is not configured'
    })
    const missingHookResponse = createResponse()
    await handler(createRequest({ all: true }), missingHookResponse)
    expect(missingHookResponse.status).toHaveBeenCalledWith(503)
  })

  it('does not wait past the revalidation deadline', async () => {
    process.env.REVALIDATE_DEADLINE_MS = '1000'
    const res = createResponse()
    res.revalidate.mockImplementation(() => new Promise(() => {}))

    const response = new Promise(resolve => {
      res.json.mockImplementation(value => resolve(value))
    })

    const start = Date.now()
    await handler(createRequest({ path: '/slow' }), res)
    expect(Date.now() - start).toBeLessThan(2500)
    expect(await response).toEqual(
      expect.objectContaining({
        complete: false,
        timedOut: true,
        results: [
          expect.objectContaining({
            path: '/slow',
            revalidated: false,
            timedOut: true
          })
        ]
      })
    )
  })
})
