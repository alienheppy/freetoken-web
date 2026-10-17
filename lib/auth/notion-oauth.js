import axios from 'axios'

const NOTION_OAUTH_TOKEN_URL = 'https://api.notion.com/v1/oauth/token'

const ERROR_MESSAGES = {
  missing_code: '授权码缺失，请重新发起授权。',
  missing_config: '授权服务尚未配置，请联系站点管理员。',
  exchange_failed: '授权未完成，请稍后重试。'
}

function normalizeErrorStatus(error) {
  const status = Number(error?.response?.status)
  return Number.isInteger(status) && status >= 400 && status < 600 ? status : 502
}

/**
 * Exchange a Notion OAuth authorization code for a token.
 *
 * The token response is deliberately not returned to callers. It contains the
 * access token, bot/workspace IDs and owner information, none of which belongs
 * in a redirect URL, page props or browser storage.
 *
 * @param {unknown} code
 * @returns {Promise<
 *   | { ok: true }
 *   | { ok: false, status: number, error: string }
 * >}
 */
export async function exchangeNotionOAuthCode(code) {
  const authorizationCode = typeof code === 'string' ? code.trim() : ''
  if (!authorizationCode || /[\r\n]/.test(authorizationCode)) {
    return {
      ok: false,
      status: 400,
      error: ERROR_MESSAGES.missing_code
    }
  }

  const clientId = process.env.OAUTH_CLIENT_ID
  const clientSecret = process.env.OAUTH_CLIENT_SECRET
  const redirectUri = process.env.OAUTH_REDIRECT_URI
  if (!clientId || !clientSecret || !redirectUri) {
    console.error('[NotionOAuth] OAuth environment variables are incomplete')
    return {
      ok: false,
      status: 500,
      error: ERROR_MESSAGES.missing_config
    }
  }

  const encoded = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

  try {
    await axios.post(
      NOTION_OAUTH_TOKEN_URL,
      {
        grant_type: 'authorization_code',
        code: authorizationCode,
        redirect_uri: redirectUri
      },
      {
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Basic ${encoded}`
        }
      }
    )

    // Log only non-sensitive completion metadata.
    console.info('[NotionOAuth] authorization code exchanged successfully')
    return { ok: true }
  } catch (error) {
    // Never log the Axios error/config object: it can contain the Basic auth
    // header and request body (including the authorization code).
    console.error(
      `[NotionOAuth] token exchange failed (status: ${normalizeErrorStatus(
        error
      )})`
    )
    return {
      ok: false,
      status: normalizeErrorStatus(error),
      error: ERROR_MESSAGES.exchange_failed
    }
  }
}

/**
 * Build a redirect URL containing only a coarse status and a safe message.
 * @param {{ ok: boolean, error?: string }} result
 * @returns {string}
 */
export function buildOAuthResultUrl(result) {
  const query = new URLSearchParams({
    status: result?.ok ? 'success' : 'error'
  })

  if (!result?.ok && result?.error) {
    query.set('message', result.error)
  }

  return `/auth/result?${query.toString()}`
}
