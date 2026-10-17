/**
 * @jest-environment node
 */

import axios from 'axios'
import {
  buildOAuthResultUrl,
  exchangeNotionOAuthCode
} from '@/lib/auth/notion-oauth'

jest.mock('axios', () => ({
  __esModule: true,
  default: {
    post: jest.fn()
  }
}))

const SENSITIVE_TOKEN_RESPONSE = {
  access_token: 'secret_access_token',
  token_type: 'bearer',
  bot_id: 'secret_bot_id',
  workspace_name: 'Private Workspace',
  workspace_id: 'secret_workspace_id',
  owner: {
    type: 'user',
    user: {
      person: {
        email: 'owner@example.com'
      }
    }
  }
}

const ORIGINAL_ENV = {
  OAUTH_CLIENT_ID: process.env.OAUTH_CLIENT_ID,
  OAUTH_CLIENT_SECRET: process.env.OAUTH_CLIENT_SECRET,
  OAUTH_REDIRECT_URI: process.env.OAUTH_REDIRECT_URI
}

function restoreEnv() {
  Object.entries(ORIGINAL_ENV).forEach(([key, value]) => {
    if (value === undefined) {
      delete process.env[key]
    } else {
      process.env[key] = value
    }
  })
}

function captureConsole() {
  return {
    info: jest.spyOn(console, 'info').mockImplementation(() => {}),
    error: jest.spyOn(console, 'error').mockImplementation(() => {})
  }
}

function allLoggedText(spies) {
  return [...spies.info.mock.calls, ...spies.error.mock.calls]
    .flat()
    .map(value => (typeof value === 'string' ? value : JSON.stringify(value)))
    .join('\n')
}

describe('Notion OAuth security', () => {
  beforeEach(() => {
    process.env.OAUTH_CLIENT_ID = 'test_client_id'
    process.env.OAUTH_CLIENT_SECRET = 'test_client_secret'
    process.env.OAUTH_REDIRECT_URI = 'https://example.com/auth'
  })

  afterEach(() => {
    restoreEnv()
  })

  it('does not call Notion when the authorization code is missing', async () => {
    const spies = captureConsole()

    const result = await exchangeNotionOAuthCode(undefined)

    expect(result).toEqual({
      ok: false,
      status: 400,
      error: '授权码缺失，请重新发起授权。'
    })
    expect(axios.post).not.toHaveBeenCalled()
    expect(allLoggedText(spies)).not.toContain('test_client_secret')
  })

  it('does not call Notion when OAuth environment variables are incomplete', async () => {
    delete process.env.OAUTH_CLIENT_SECRET
    const spies = captureConsole()

    const result = await exchangeNotionOAuthCode('authorization_code')

    expect(result.ok).toBe(false)
    expect(result.status).toBe(500)
    expect(axios.post).not.toHaveBeenCalled()
    expect(allLoggedText(spies)).not.toContain('authorization_code')
    expect(allLoggedText(spies)).not.toContain('test_client_secret')
  })

  it('returns only a coarse success result and never logs the token payload', async () => {
    axios.post.mockResolvedValue({
      status: 200,
      data: SENSITIVE_TOKEN_RESPONSE
    })
    const spies = captureConsole()

    const result = await exchangeNotionOAuthCode('authorization_code')

    expect(result).toEqual({ ok: true })
    expect(buildOAuthResultUrl(result)).toBe('/auth/result?status=success')
    expect(JSON.stringify(result)).not.toContain('secret_access_token')
    expect(allLoggedText(spies)).not.toContain('secret_access_token')
    expect(allLoggedText(spies)).not.toContain('secret_workspace_id')
    expect(allLoggedText(spies)).not.toContain('owner@example.com')
    expect(allLoggedText(spies)).not.toContain('authorization_code')
    expect(allLoggedText(spies)).not.toContain('test_client_secret')
  })

  it('does not allow a CR/LF authorization code to alter request parameters', async () => {
    axios.post.mockResolvedValue({ status: 200 })
    const spies = captureConsole()

    await exchangeNotionOAuthCode('valid_code\r\ninjected=1')

    expect(axios.post).not.toHaveBeenCalled()
    expect(allLoggedText(spies)).not.toContain('valid_code')
    expect(allLoggedText(spies)).not.toContain('injected=1')
  })

  it('returns a safe error when Notion rejects the exchange', async () => {
    axios.post.mockRejectedValue({
      response: { status: 401 },
      config: {
        headers: {
          Authorization: 'Basic secret_basic_auth',
          code: 'authorization_code'
        }
      },
      message: 'secret_access_token authorization_code'
    })
    const spies = captureConsole()

    const result = await exchangeNotionOAuthCode('authorization_code')

    expect(result).toEqual({
      ok: false,
      status: 401,
      error: '授权未完成，请稍后重试。'
    })
    expect(buildOAuthResultUrl(result)).toBe(
      '/auth/result?status=error&message=%E6%8E%88%E6%9D%83%E6%9C%AA%E5%AE%8C%E6%88%90%EF%BC%8C%E8%AF%B7%E7%A8%8D%E5%90%8E%E9%87%8D%E8%AF%95%E3%80%82'
    )
    expect(allLoggedText(spies)).not.toContain('secret_basic_auth')
    expect(allLoggedText(spies)).not.toContain('secret_access_token')
    expect(allLoggedText(spies)).not.toContain('authorization_code')
    expect(allLoggedText(spies)).not.toContain('test_client_secret')
  })
})
