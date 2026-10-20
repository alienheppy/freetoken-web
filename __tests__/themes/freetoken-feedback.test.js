import { fireEvent, render, screen, waitFor } from '@testing-library/react'

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
    React.useEffect(() => onVerify('verified-token'), [onVerify])
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

  test('keeps submission disabled when Turnstile is not configured', () => {
    render(<FeedbackPage />)

    expect(screen.getByRole('alert')).toHaveTextContent(
      '反馈验证尚未配置，暂时无法提交。'
    )
    expect(screen.getByRole('button', { name: '提交反馈' })).toBeDisabled()
  })
})
