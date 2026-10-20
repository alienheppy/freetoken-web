/**
 * @jest-environment node
 */

import handler from '@/pages/api/cache'
import { cleanCache } from '@/lib/cache/local_file_cache'
import { refreshNotionSiteDataInBackground } from '@/lib/cache/notion-runtime-refresh'
import { bumpCacheGeneration } from '@/lib/cache/cache_generation'
import { triggerVercelDeployHook } from '@/lib/server/deploy-hook'

jest.mock('@/lib/cache/local_file_cache', () => ({
  cleanCache: jest.fn()
}))

jest.mock('@/lib/cache/notion-runtime-refresh', () => ({
  refreshNotionSiteDataInBackground: jest.fn()
}))

jest.mock('@/lib/cache/cache_generation', () => ({
  bumpCacheGeneration: jest.fn()
}))

jest.mock('@/lib/server/deploy-hook', () => ({
  triggerVercelDeployHook: jest.fn()
}))

const createResponse = () => {
  const res = {}
  res.status = jest.fn(() => res)
  res.json = jest.fn(() => res)
  return res
}

describe('/api/cache authorization', () => {
  const originalToken = process.env.CACHE_REVALIDATION_TOKEN
  const originalVercel = process.env.VERCEL
  const originalVercelEnv = process.env.VERCEL_ENV

  beforeEach(() => {
    jest.clearAllMocks()
    process.env.CACHE_REVALIDATION_TOKEN = 'expected-token'
    delete process.env.VERCEL
    delete process.env.VERCEL_ENV
    refreshNotionSiteDataInBackground.mockReturnValue({ started: true })
    bumpCacheGeneration.mockResolvedValue({
      previous: 'old',
      current: 'new',
      reason: 'test'
    })
    triggerVercelDeployHook.mockResolvedValue({
      configured: true,
      triggered: true,
      status: 200,
      message: 'queued'
    })
  })

  afterEach(() => {
    if (originalToken === undefined) {
      delete process.env.CACHE_REVALIDATION_TOKEN
    } else {
      process.env.CACHE_REVALIDATION_TOKEN = originalToken
    }
    if (originalVercel === undefined) {
      delete process.env.VERCEL
    } else {
      process.env.VERCEL = originalVercel
    }
    if (originalVercelEnv === undefined) {
      delete process.env.VERCEL_ENV
    } else {
      process.env.VERCEL_ENV = originalVercelEnv
    }
  })

  it('returns 503 when CACHE_REVALIDATION_TOKEN is missing', async () => {
    delete process.env.CACHE_REVALIDATION_TOKEN
    const res = createResponse()

    await handler({ method: 'POST', headers: {}, body: {} }, res)

    expect(res.status).toHaveBeenCalledWith(503)
    expect(cleanCache).not.toHaveBeenCalled()
    expect(refreshNotionSiteDataInBackground).not.toHaveBeenCalled()
  })

  it('returns 401 when the bearer token is wrong', async () => {
    const res = createResponse()

    await handler(
      {
        method: 'POST',
        headers: { authorization: 'Bearer wrong-token' },
        body: {}
      },
      res
    )

    expect(res.status).toHaveBeenCalledWith(401)
    expect(cleanCache).not.toHaveBeenCalled()
    expect(refreshNotionSiteDataInBackground).not.toHaveBeenCalled()
  })

  it('starts the background refresh with the correct bearer token', async () => {
    const res = createResponse()

    await handler(
      {
        method: 'POST',
        headers: { authorization: 'Bearer expected-token' },
        body: {}
      },
      res
    )

    expect(bumpCacheGeneration).toHaveBeenCalledWith('cache-refresh')
    expect(refreshNotionSiteDataInBackground).toHaveBeenCalledWith('api-cache')
    expect(res.status).toHaveBeenCalledWith(202)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'accepted' })
    )
  })

  it('keeps clearOnly on the synchronous cache clean path', async () => {
    const res = createResponse()

    await handler(
      {
        method: 'POST',
        headers: { authorization: 'Bearer expected-token' },
        body: { clearOnly: true }
      },
      res
    )

    expect(cleanCache).toHaveBeenCalledTimes(1)
    expect(bumpCacheGeneration).toHaveBeenCalledWith('cache-clear-only')
    expect(refreshNotionSiteDataInBackground).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(200)
  })

  it('uses the Vercel Deploy Hook instead of an in-process refresh on Vercel', async () => {
    process.env.VERCEL = '1'
    const res = createResponse()

    await handler(
      {
        method: 'POST',
        headers: { authorization: 'Bearer expected-token' },
        body: {}
      },
      res
    )

    expect(triggerVercelDeployHook).toHaveBeenCalledWith('cache-refresh')
    expect(refreshNotionSiteDataInBackground).not.toHaveBeenCalled()
    expect(bumpCacheGeneration).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(202)
  })
})
