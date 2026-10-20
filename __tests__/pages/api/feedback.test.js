/**
 * @jest-environment node
 */

const mockCreate = jest.fn()
const mockVerifyTurnstile = jest.fn()

jest.mock('@notionhq/client', () => ({
  Client: jest.fn().mockImplementation(() => ({
    pages: { create: mockCreate }
  }))
}))

jest.mock('@/lib/freetoken/turnstile', () => ({
  verifyTurnstileToken: (...args) => mockVerifyTurnstile(...args)
}))

import handler from '@/pages/api/feedback'

const createResponse = () => {
  const res = {}
  res.status = jest.fn(() => res)
  res.json = jest.fn(() => res)
  res.setHeader = jest.fn(() => res)
  return res
}

const createRequest = (body, method = 'POST') => ({
  method,
  body,
  headers: {
    'x-forwarded-for': '203.0.113.10',
    'user-agent': 'jest'
  }
})

const valid = {
  type: '信息错误',
  objectType: '平台',
  objectName: 'AMD',
  description: '平台页面上的免费模型数量已经变化。',
  pageUrl: 'https://www.freetok.org/platform/AMD',
  email: '',
  turnstileToken: 'valid-turnstile-token'
}

describe('/api/feedback', () => {
  const originalToken = process.env.NOTION_TOKEN
  const originalApiToken = process.env.NOTION_API_TOKEN
  const originalFeedbackToken = process.env.NOTION_FEEDBACK_TOKEN
  const originalTurnstileSecret = process.env.TURNSTILE_SECRET_KEY

  beforeEach(() => {
    jest.clearAllMocks()
    process.env.NOTION_TOKEN = 'test-token'
    process.env.TURNSTILE_SECRET_KEY = 'test-turnstile-secret'
    delete process.env.NOTION_API_TOKEN
    delete process.env.NOTION_FEEDBACK_TOKEN
    mockVerifyTurnstile.mockResolvedValue({ ok: true })
  })

  afterEach(() => {
    if (originalToken === undefined) delete process.env.NOTION_TOKEN
    else process.env.NOTION_TOKEN = originalToken
    if (originalApiToken === undefined) delete process.env.NOTION_API_TOKEN
    else process.env.NOTION_API_TOKEN = originalApiToken
    if (originalFeedbackToken === undefined) {
      delete process.env.NOTION_FEEDBACK_TOKEN
    } else {
      process.env.NOTION_FEEDBACK_TOKEN = originalFeedbackToken
    }
    if (originalTurnstileSecret === undefined) {
      delete process.env.TURNSTILE_SECRET_KEY
    } else {
      process.env.TURNSTILE_SECRET_KEY = originalTurnstileSecret
    }
  })

  test('rejects non-POST methods', async () => {
    const res = createResponse()
    await handler(createRequest({}, 'GET'), res)

    expect(res.status).toHaveBeenCalledWith(405)
    expect(res.setHeader).toHaveBeenCalledWith('Allow', 'POST')
    expect(mockCreate).not.toHaveBeenCalled()
  })

  test('rejects an invalid payload before calling Notion', async () => {
    const res = createResponse()
    await handler(createRequest({ ...valid, pageUrl: 'not-a-url' }), res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(mockCreate).not.toHaveBeenCalled()
    expect(mockVerifyTurnstile).not.toHaveBeenCalled()
  })

  test('rejects a missing or invalid Turnstile token before calling Notion', async () => {
    mockVerifyTurnstile.mockResolvedValue({
      ok: false,
      reason: 'rejected'
    })
    const res = createResponse()
    await handler(createRequest(valid), res)

    expect(mockVerifyTurnstile).toHaveBeenCalledWith(
      expect.objectContaining({
        token: 'valid-turnstile-token',
        remoteIp: '203.0.113.10',
        secretKey: 'test-turnstile-secret'
      })
    )
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({
      error: '人机验证未通过，请刷新后重试'
    })
    expect(mockCreate).not.toHaveBeenCalled()
  })

  test('fails closed when Turnstile is not configured', async () => {
    mockVerifyTurnstile.mockResolvedValue({
      ok: false,
      reason: 'not-configured'
    })
    const res = createResponse()
    await handler(createRequest(valid), res)

    expect(res.status).toHaveBeenCalledWith(503)
    expect(res.json).toHaveBeenCalledWith({ error: '反馈验证尚未配置' })
    expect(mockCreate).not.toHaveBeenCalled()
  })

  test('fails closed when Cloudflare verification is unavailable', async () => {
    mockVerifyTurnstile.mockResolvedValue({
      ok: false,
      reason: 'verification-unavailable'
    })
    const res = createResponse()
    await handler(createRequest(valid), res)

    expect(res.status).toHaveBeenCalledWith(503)
    expect(res.json).toHaveBeenCalledWith({
      error: '人机验证服务暂时不可用，请稍后再试'
    })
    expect(mockCreate).not.toHaveBeenCalled()
  })

  test('creates a Notion page with the mapped schema', async () => {
    mockCreate.mockResolvedValue({ id: 'feedback-page-id' })
    const res = createResponse()
    await handler(createRequest(valid), res)

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        parent: { database_id: '3fe2570237f4805bbdadf7c7c78dfb6f' },
        properties: expect.objectContaining({
          反馈标题: expect.any(Object),
          反馈类型: { select: { name: '信息错误' } },
          对象类型: { select: { name: '平台' } },
          对象名称: expect.any(Object),
          问题说明: expect.any(Object),
          页面地址: { url: valid.pageUrl }
        })
      })
    )
    expect(mockVerifyTurnstile).toHaveBeenCalledTimes(1)
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({
      ok: true,
      id: 'feedback-page-id'
    })
  })
})
