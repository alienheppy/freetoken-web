const SITEVERIFY_URL =
  'https://challenges.cloudflare.com/turnstile/v0/siteverify'

/**
 * Verify a Turnstile token on the server.
 *
 * The widget token is single-use and short-lived. Never accept it based on the
 * browser callback alone; the API must confirm it with Cloudflare.
 */
export async function verifyTurnstileToken({
  token,
  remoteIp,
  secretKey,
  fetchImpl = fetch
}) {
  const responseToken = typeof token === 'string' ? token.trim() : ''
  const responseSecret = typeof secretKey === 'string' ? secretKey.trim() : ''

  if (!responseSecret) {
    return { ok: false, reason: 'not-configured' }
  }
  if (!responseToken) {
    return { ok: false, reason: 'missing-token' }
  }

  const body = new URLSearchParams({
    secret: responseSecret,
    response: responseToken
  })
  if (remoteIp) body.set('remoteip', remoteIp)

  try {
    const response = await fetchImpl(SITEVERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body
    })
    if (!response.ok) {
      return { ok: false, reason: 'verification-unavailable' }
    }

    const result = await response.json()
    if (result?.success !== true) {
      return {
        ok: false,
        reason: 'rejected',
        errorCodes: Array.isArray(result?.['error-codes'])
          ? result['error-codes']
          : []
      }
    }
    if (result.action && result.action !== 'feedback') {
      return { ok: false, reason: 'action-mismatch' }
    }

    return {
      ok: true,
      hostname: typeof result.hostname === 'string' ? result.hostname : ''
    }
  } catch (error) {
    return {
      ok: false,
      reason: 'verification-unavailable',
      error
    }
  }
}
