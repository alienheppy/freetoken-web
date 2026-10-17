/**
 * @jest-environment node
 */

import handler from '@/pages/api/claude/contribution-refresh'
import { markContributionCacheDirty } from '@/lib/server/claude/contributionStore'

jest.mock('@/lib/server/claude/contributionStore', () => ({
  markContributionCacheDirty: jest.fn()
}))

const createResponse = () => {
  const res = {}
  res.status = jest.fn(() => res)
  res.json = jest.fn(() => res)
  return res
}

const createRequest = (headers = {}, query = {}) => ({
  method: 'POST',
  headers,
  query
})

describe('/api/claude/contribution-refresh authorization', () => {
  const originalToken = process.env.CLAUDE_CONTRIBUTION_TRIGGER_TOKEN

  beforeEach(() => {
    process.env.CLAUDE_CONTRIBUTION_TRIGGER_TOKEN = 'expected-token'
  })

  afterEach(() => {
    if (originalToken === undefined) {
      delete process.env.CLAUDE_CONTRIBUTION_TRIGGER_TOKEN
    } else {
      process.env.CLAUDE_CONTRIBUTION_TRIGGER_TOKEN = originalToken
    }
  })

  it('returns 503 when CLAUDE_CONTRIBUTION_TRIGGER_TOKEN is missing', async () => {
    delete process.env.CLAUDE_CONTRIBUTION_TRIGGER_TOKEN
    const res = createResponse()

    await handler(createRequest({}, { path: '/' }), res)

    expect(res.status).toHaveBeenCalledWith(503)
    expect(markContributionCacheDirty).not.toHaveBeenCalled()
  })

  it('does not accept the token from the URL query string', async () => {
    const res = createResponse()

    await handler(
      createRequest({}, { token: 'expected-token', path: '/' }),
      res
    )

    expect(res.status).toHaveBeenCalledWith(401)
    expect(markContributionCacheDirty).not.toHaveBeenCalled()
  })

  it('accepts an Authorization Bearer token', async () => {
    const res = createResponse()

    await handler(
      createRequest(
        { authorization: 'Bearer expected-token' },
        { path: '/', revalidate: '0' }
      ),
      res
    )

    expect(markContributionCacheDirty).toHaveBeenCalledTimes(1)
    expect(res.status).toHaveBeenCalledWith(200)
  })

  it.each(['x-contribution-trigger-token', 'x-contrib-trigger-token'])(
    'accepts the existing %s header',
    async headerName => {
      const res = createResponse()

      await handler(
        createRequest(
          { [headerName]: 'expected-token' },
          { path: '/', revalidate: '0' }
        ),
        res
      )

      expect(markContributionCacheDirty).toHaveBeenCalledTimes(1)
      expect(res.status).toHaveBeenCalledWith(200)
    }
  )
})
