import { verifyTurnstileToken } from '@/lib/freetoken/turnstile'

const createFetch = response =>
  jest.fn().mockResolvedValue({
    ok: response.ok ?? true,
    json: async () => response.body ?? {}
  })

describe('verifyTurnstileToken', () => {
  test('fails closed when the secret key is missing', async () => {
    const fetchImpl = createFetch({ body: { success: true } })
    const result = await verifyTurnstileToken({
      token: 'token',
      secretKey: '',
      fetchImpl
    })

    expect(result).toEqual({ ok: false, reason: 'not-configured' })
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  test('fails closed when the widget token is missing', async () => {
    const fetchImpl = createFetch({ body: { success: true } })
    const result = await verifyTurnstileToken({
      token: '',
      secretKey: 'secret',
      fetchImpl
    })

    expect(result).toEqual({ ok: false, reason: 'missing-token' })
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  test('posts the token and remote IP to Cloudflare', async () => {
    const fetchImpl = createFetch({
      body: { success: true, hostname: 'www.freetok.org', action: 'feedback' }
    })
    const result = await verifyTurnstileToken({
      token: 'widget-token',
      remoteIp: '203.0.113.10',
      secretKey: 'turnstile-secret',
      fetchImpl
    })

    expect(result).toEqual({ ok: true, hostname: 'www.freetok.org' })
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://challenges.cloudflare.com/turnstile/v0/api/siteverify',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      })
    )

    const body = fetchImpl.mock.calls[0][1].body
    expect(body.get('secret')).toBe('turnstile-secret')
    expect(body.get('response')).toBe('widget-token')
    expect(body.get('remoteip')).toBe('203.0.113.10')
  })

  test('rejects a token that Cloudflare does not accept', async () => {
    const fetchImpl = createFetch({
      body: { success: false, 'error-codes': ['invalid-input-response'] }
    })
    const result = await verifyTurnstileToken({
      token: 'bad-token',
      secretKey: 'secret',
      fetchImpl
    })

    expect(result).toEqual({
      ok: false,
      reason: 'rejected',
      errorCodes: ['invalid-input-response']
    })
  })

  test('rejects a token issued for a different action', async () => {
    const fetchImpl = createFetch({
      body: { success: true, action: 'login' }
    })
    const result = await verifyTurnstileToken({
      token: 'token',
      secretKey: 'secret',
      fetchImpl
    })

    expect(result).toEqual({ ok: false, reason: 'action-mismatch' })
  })

  test('fails closed when Cloudflare is unavailable', async () => {
    const fetchImpl = jest.fn().mockRejectedValue(new Error('network error'))
    const result = await verifyTurnstileToken({
      token: 'token',
      secretKey: 'secret',
      fetchImpl
    })

    expect(result).toMatchObject({
      ok: false,
      reason: 'verification-unavailable'
    })
  })
})
