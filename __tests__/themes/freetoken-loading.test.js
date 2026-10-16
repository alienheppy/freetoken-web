import { act, render, screen } from '@testing-library/react'

// styled-jsx 在 jsdom 中 unmount 时会因为 style.sheet 为 null 而报错（同 freetoken.test.js）
jest.mock('styled-jsx/style', () => () => null)

// next/link 在 jsdom 中没有 Router 实例；LayoutBase 内的导航用 <a> 桩替代
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...rest }) => (
    <a href={typeof href === 'string' ? href : '#'} {...rest}>
      {children}
    </a>
  )
}))

// useGlobal 的 onLoading 需要能在用例中切换，故用可变对象（必须以 mock 前缀命名）
const mockGlobalState = { onLoading: false, isDarkMode: false, locale: {} }
jest.mock('@/lib/global', () => ({
  useGlobal: () => mockGlobalState
}))

jest.mock('@/lib/config', () => ({
  siteConfig: (key, fallback, cfg) =>
    cfg && cfg[key] !== undefined ? cfg[key] : fallback
}))

import LoadingIndicator from '@/themes/freetoken/components/LoadingIndicator'
import LayoutBase from '@/themes/freetoken/components/LayoutBase'

/**
 * 路由切换反馈。
 *
 * 背景（线上实测）：未预生成的模型详情页在冷 serverless 实例上首次打开要在
 * 服务端现场重建整站 Notion 数据，最慢 296 秒；期间页面毫无变化，用户会以为
 * 「点击失效」并反复点。主题此前完全没有消费全局 onLoading，也没有任何加载提示。
 */
describe('freetoken 路由切换反馈', () => {
  beforeEach(() => {
    mockGlobalState.onLoading = false
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  test('未在跳转中时不渲染任何加载 UI', () => {
    const { container } = render(<LoadingIndicator />)
    expect(container).toBeEmptyDOMElement()
    expect(screen.queryByTestId('ft-loading-bar')).toBeNull()
  })

  test('跳转开始时立刻出现进度条，文字胶囊延后出现（避免快跳转闪烁）', () => {
    jest.useFakeTimers()
    mockGlobalState.onLoading = true

    render(<LoadingIndicator />)

    // 进度条立即出现：点击必须马上有确定响应
    expect(screen.getByTestId('ft-loading-bar')).toBeInTheDocument()
    expect(screen.getByTestId('ft-loading-bar')).toHaveAttribute(
      'role',
      'progressbar'
    )
    // 胶囊延迟：低于延迟阈值时不出文案
    expect(screen.queryByTestId('ft-loading-pill')).toBeNull()

    act(() => {
      jest.advanceTimersByTime(400)
    })

    const pill = screen.getByTestId('ft-loading-pill')
    expect(pill).toBeInTheDocument()
    expect(pill).toHaveAttribute('role', 'status')
    expect(pill.textContent).toContain('正在打开')
  })

  test('等待超过 3 秒时显示已等待秒数，让用户看出仍在进行', () => {
    jest.useFakeTimers()
    mockGlobalState.onLoading = true

    render(<LoadingIndicator />)

    act(() => {
      jest.advanceTimersByTime(3000)
    })

    expect(screen.getByTestId('ft-loading-pill').textContent).toContain(
      '已等待 3s'
    )
  })

  test('跳转结束后加载 UI 立即消失', () => {
    jest.useFakeTimers()
    mockGlobalState.onLoading = true

    const { rerender } = render(<LoadingIndicator />)
    act(() => {
      jest.advanceTimersByTime(1000)
    })
    expect(screen.getByTestId('ft-loading-pill')).toBeInTheDocument()

    mockGlobalState.onLoading = false
    rerender(<LoadingIndicator />)

    expect(screen.queryByTestId('ft-loading-bar')).toBeNull()
    expect(screen.queryByTestId('ft-loading-pill')).toBeNull()
  })

  test('LayoutBase 挂载了加载反馈（主题层消费全局 onLoading）', () => {
    mockGlobalState.onLoading = true
    render(
      <LayoutBase siteInfo={{ title: 'Hub' }}>
        <div />
      </LayoutBase>
    )

    expect(screen.getByTestId('ft-loading-bar')).toBeInTheDocument()
  })
})
