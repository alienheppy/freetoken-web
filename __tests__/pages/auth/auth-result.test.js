/**
 * @jest-environment node
 */

import { getServerSideProps } from '@/pages/auth/result'

function createResponse() {
  return {
    setHeader: jest.fn()
  }
}

describe('OAuth result page', () => {
  it('reads success on the server and disables caching/referrer leakage', async () => {
    const res = createResponse()
    const result = await getServerSideProps({
      query: { status: 'success' },
      res
    })

    expect(result).toEqual({
      props: {
        success: true,
        message: '',
        authResultQuery: { status: 'success' }
      }
    })
    expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-store')
    expect(res.setHeader).toHaveBeenCalledWith('Referrer-Policy', 'no-referrer')
  })

  it('passes only a bounded public error message', async () => {
    const res = createResponse()
    const result = await getServerSideProps({
      query: {
        status: 'error',
        message: '授权未完成，请稍后重试。',
        access_token: 'must-not-be-forwarded'
      },
      res
    })

    expect(result.props.success).toBe(false)
    expect(result.props.message).toBe('授权未完成，请稍后重试。')
    expect(JSON.stringify(result)).not.toContain('must-not-be-forwarded')
  })

  it('does not forward arbitrary query parameters into the page', async () => {
    const query = {
      status: 'success',
      access_token: 'secret-token',
      workspace_id: 'secret-workspace'
    }
    const result = await getServerSideProps({
      query,
      res: createResponse()
    })

    expect(result.props).toEqual({
      success: true,
      message: '',
      authResultQuery: { status: 'success' }
    })
    expect(query).toEqual({ status: 'success' })
  })

  it('preserves a safe error message while dropping extra parameters', async () => {
    const result = await getServerSideProps({
      query: {
        status: 'error',
        message: '授权未完成，请稍后重试。',
        code: 'secret-code'
      },
      res: createResponse()
    })

    expect(result.props.authResultQuery).toEqual({
      status: 'error',
      message: '授权未完成，请稍后重试。'
    })
    expect(JSON.stringify(result)).not.toContain('secret-code')
  })
})
