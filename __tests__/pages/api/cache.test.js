/**
 * @jest-environment node
 */

import handler from '@/pages/api/cache'
import { cleanCache } from '@/lib/cache/local_file_cache'
import { refreshNotionSiteDataInBackground } from '@/lib/cache/notion-runtime-refresh'

jest.mock('@/lib/cache/local_file_cache', () => ({
  cleanCache: jest.fn()
}))

jest.mock('@/lib/cache/notion-runtime-refresh', () => ({
  refreshNotionSiteDataInBackground: jest.fn()
}))

const createResponse = () => {
  const res = {}
  res.status = jest.fn(() => res)
  res.json = jest.fn(() => res)
  return res
}

describe('/api/cache authorization', () => {
  const originalToken = process.env.CACHE_REVALIDATION_TOKEN

  beforeEach(() => {
    process.env.CACHE_REVALIDATION_TOKEN = 'expected-token'
    refreshNotionSiteDataInBackground.mockReturnValue({ started: true })
  })

  afterEach(() => {
    if (originalToken === undefined) {
      delete process.env.CACHE_REVALIDATION_TOKEN
    } else {
      process.env.CACHE_REVALIDATION_TOKEN = originalToken
    }
  })

  it('returns 503 when CACHE_REVALIDATION_TOKEN is missing', () => {
    delete process.env.CACHE_REVALIDATION_TOKEN
    const res = createResponse()

    handler({ method: 'POST', headers: {}, body: {} }, res)

    expect(res.status).toHaveBeenCalledWith(503)
    expect(cleanCache).not.toHaveBeenCalled()
    expect(refreshNotionSiteDataInBackground).not.toHaveBeenCalled()
  })

  it('returns 401 when the bearer token is wrong', () => {
    const res = createResponse()

    handler(
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

  it('starts the background refresh with the correct bearer token', () => {
    const res = createResponse()

    handler(
      {
        method: 'POST',
        headers: { authorization: 'Bearer expected-token' },
        body: {}
      },
      res
    )

    expect(refreshNotionSiteDataInBackground).toHaveBeenCalledWith('api-cache')
    expect(res.status).toHaveBeenCalledWith(202)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'accepted' })
    )
  })

  it('keeps clearOnly on the synchronous cache clean path', () => {
    const res = createResponse()

    handler(
      {
        method: 'POST',
        headers: { authorization: 'Bearer expected-token' },
        body: { clearOnly: true }
      },
      res
    )

    expect(cleanCache).toHaveBeenCalledTimes(1)
    expect(refreshNotionSiteDataInBackground).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(200)
  })
})
