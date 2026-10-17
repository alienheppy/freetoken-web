/**
 * @jest-environment node
 */

import notionCallbackHandler from '@/pages/api/auth/callback/notion'
import { getServerSideProps as notionAuthPage } from '@/pages/auth'
import {
  buildOAuthResultUrl,
  exchangeNotionOAuthCode
} from '@/lib/auth/notion-oauth'

jest.mock('@/lib/auth/notion-oauth', () => ({
  exchangeNotionOAuthCode: jest.fn(),
  buildOAuthResultUrl: jest.fn()
}))

function createResponse() {
  return {
    setHeader: jest.fn(),
    redirect: jest.fn(),
    status: jest.fn().mockReturnThis(),
    json: jest.fn()
  }
}

describe('OAuth entrypoints', () => {
  beforeEach(() => {
    exchangeNotionOAuthCode.mockResolvedValue({ ok: true })
    buildOAuthResultUrl.mockReturnValue('/auth/result?status=success')
  })

  it('redirects the page callback without putting token data in props', async () => {
    const setHeader = jest.fn()
    const result = await notionAuthPage({
      query: { code: 'authorization_code' },
      res: { setHeader }
    })

    expect(exchangeNotionOAuthCode).toHaveBeenCalledWith('authorization_code')
    expect(result).toEqual({
      redirect: {
        destination: '/auth/result?status=success',
        permanent: false
      }
    })
    expect(JSON.stringify(result)).not.toContain('authorization_code')
    expect(setHeader).toHaveBeenCalledWith('Cache-Control', 'no-store')
    expect(setHeader).toHaveBeenCalledWith('Referrer-Policy', 'no-referrer')
  })

  it('redirects the API callback to the safe result URL', async () => {
    const res = createResponse()
    await notionCallbackHandler(
      { query: { code: 'authorization_code' } },
      res
    )

    expect(exchangeNotionOAuthCode).toHaveBeenCalledWith('authorization_code')
    expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-store')
    expect(res.setHeader).toHaveBeenCalledWith('Referrer-Policy', 'no-referrer')
    expect(res.redirect).toHaveBeenCalledWith(
      302,
      '/auth/result?status=success'
    )
    expect(JSON.stringify(res.redirect.mock.calls)).not.toContain(
      'authorization_code'
    )
  })
})
