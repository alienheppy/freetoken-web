import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'

const mockRouter = {
  isReady: true,
  query: {
    type: '额度或信息过期',
    objectType: '模型',
    objectName: 'DeepSeek V4.1 Flash',
    title: '过期报告：DeepSeek V4.1 Flash',
    pageUrl: '/article/deepseek-v4.1-flash'
  }
}

jest.mock('next/router', () => ({
  useRouter: () => mockRouter
}))

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...rest }) => (
    <a href={typeof href === 'string' ? href : '#'} {...rest}>
      {children}
    </a>
  )
}))

jest.mock('@/lib/config', () => ({
  siteConfig: (key, fallback, cfg) =>
    cfg && cfg[key] !== undefined ? cfg[key] : fallback
}))

jest.mock('@/themes/freetoken/components/TurnstileWidget', () => {
  const React = require('react')
  const MockTurnstile = ({ siteKey, onVerify }) => {
    React.useEffect(() => {
      globalThis.__ftMockVerify = onVerify
      if (globalThis.__ftMockAutoVerify !== false) onVerify('verified-token')
      return () => {
        if (globalThis.__ftMockVerify === onVerify) {
          globalThis.__ftMockVerify = null
        }
      }
    }, [onVerify])
    return (
      <div data-testid='ft-turnstile-widget' data-sitekey={siteKey} />
    )
  }
  return { __esModule: true, default: MockTurnstile }
})

import FeedbackPage from '@/themes/freetoken/components/FeedbackPage'
import SmartLink from '@/components/SmartLink'

describe('freetoken feedback page', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
  })

  afterEach(() => {
    global.fetch = originalFetch
    delete globalThis.__ftMockAutoVerify
    delete globalThis.__ftMockVerify
  })

  test('prefills the object and turns a relative page URL into an absolute URL', () => {
    render(<FeedbackPage turnstileSiteKey='test-site-key' />)

    expect(screen.getByLabelText('对象名称 *')).toHaveValue(
      'DeepSeek V4.1 Flash'
    )
    expect(screen.getByLabelText('反馈标题')).toHaveValue(
      '过期报告：DeepSeek V4.1 Flash'
    )
    expect(screen.getByLabelText('页面地址 *')).toHaveValue(
      `${window.location.origin}/article/deepseek-v4.1-flash`
    )
  })

  test('does not carry feedback prefill query parameters into site navigation', () => {
    window.history.replaceState({}, '', '/feedback?type=test')
    render(<SmartLink href='/'>返回首页</SmartLink>)
    expect(screen.getByRole('link', { name: '返回首页' })).toHaveAttribute(
      'href',
      '/'
    )
  })

  test('submits all form fields after Turnstile verification', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true })
    })

    render(<FeedbackPage turnstileSiteKey='test-site-key' />)
    fireEvent.change(screen.getByLabelText('问题说明 *'), {
      target: { value: '额度已从 1M 调整为 128K。' }
    })
    fireEvent.change(screen.getByLabelText('电子邮件 选填'), {
      target: { value: 'reader@example.com' }
    })
    fireEvent.click(screen.getByRole('button', { name: '提交反馈' }))

    await waitFor(() =>
      expect(screen.getByTestId('ft-feedback-success')).toBeInTheDocument()
    )
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/feedback',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining(
          '"turnstileToken":"verified-token"'
        )
      })
    )
  })

  test('keeps the form and resets Turnstile when submission fails', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: '反馈服务尚未完成 Notion 授权' })
    })

    render(<FeedbackPage turnstileSiteKey='test-site-key' />)
    fireEvent.change(screen.getByLabelText('问题说明 *'), {
      target: { value: '额度已变化。' }
    })
    fireEvent.click(screen.getByRole('button', { name: '提交反馈' }))

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        '反馈服务尚未完成 Notion 授权'
      )
    )
    expect(screen.getByTestId('ft-feedback-page')).toBeInTheDocument()
    expect(screen.queryByTestId('ft-feedback-success')).toBeNull()
    expect(screen.getByTestId('ft-turnstile-widget')).toBeInTheDocument()
  })

  test('连续提交：成功页返回后旧令牌作废，必须重新完成人机验证', async () => {
    globalThis.__ftMockAutoVerify = false
    const fetchMock = jest
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ ok: true }) })
    global.fetch = fetchMock

    render(<FeedbackPage turnstileSiteKey='test-site-key' />)
    // 第一条：完成验证后提交成功
    await act(async () => {
      globalThis.__ftMockVerify('token-1')
    })
    fireEvent.change(screen.getByLabelText('问题说明 *'), {
      target: { value: '第一条反馈' }
    })
    fireEvent.click(screen.getByRole('button', { name: '提交反馈' }))
    await waitFor(() =>
      expect(screen.getByTestId('ft-feedback-success')).toBeInTheDocument()
    )

    // 令牌已随成功提交消费，回到表单时必须重新验证
    fireEvent.click(screen.getByRole('button', { name: '再提交一条' }))
    const submitButton = screen.getByRole('button', { name: '提交反馈' })
    await waitFor(() => expect(submitButton).toBeDisabled())
    expect(screen.getByTestId('ft-turnstile-widget')).toBeInTheDocument()

    // 第二条：重新验证拿到新令牌，才能再次提交
    await act(async () => {
      globalThis.__ftMockVerify('token-2')
    })
    fireEvent.change(screen.getByLabelText('对象名称 *'), {
      target: { value: '第二个对象' }
    })
    fireEvent.change(screen.getByLabelText('页面地址 *'), {
      target: { value: 'https://www.freetok.org/article/second' }
    })
    fireEvent.change(screen.getByLabelText('问题说明 *'), {
      target: { value: '第二条反馈' }
    })
    await waitFor(() => expect(submitButton).toBeEnabled())
    fireEvent.click(submitButton)

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    expect(fetchMock.mock.calls[1][1].body).toContain(
      '"turnstileToken":"token-2"'
    )
  })

  test('keeps submission disabled when Turnstile is not configured', () => {
    render(<FeedbackPage />)

    expect(screen.getByRole('alert')).toHaveTextContent(
      '反馈验证尚未配置，暂时无法提交。'
    )
    expect(screen.getByRole('button', { name: '提交反馈' })).toBeDisabled()
  })
})
