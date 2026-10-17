import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'

const mockRouter = {
  query: {},
  push: jest.fn()
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

jest.mock('@/lib/global', () => ({
  useGlobal: () => ({
    locale: {
      SEARCH: {
        ARTICLES: '搜索文章',
        TAGS: '搜索标签'
      }
    }
  })
}))

jest.mock('@/lib/config', () => ({
  siteConfig: (key, fallback, cfg) =>
    cfg && cfg[key] !== undefined ? cfg[key] : fallback
}))

import CopyButton from '@/themes/freetoken/components/CopyButton'
import PlatformDetail from '@/themes/freetoken/components/PlatformDetail'
import SearchInput from '@/themes/freetoken/components/SearchInput'

const setClipboard = value => {
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value
  })
}

afterEach(() => {
  delete navigator.clipboard
})

describe('freetoken 搜索输入', () => {
  beforeEach(() => {
    mockRouter.push.mockClear()
  })

  test('特殊字符通过动态路由 query 传递，且组合态回车不触发搜索', () => {
    render(<SearchInput />)
    const input = screen.getByLabelText('站内搜索')
    const keyword = 'GPT/4?name=a#top&x=100%'

    fireEvent.change(input, { target: { value: keyword } })
    fireEvent.compositionStart(input)
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' })
    expect(mockRouter.push).not.toHaveBeenCalled()

    fireEvent.compositionEnd(input)
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', isComposing: true })
    expect(mockRouter.push).not.toHaveBeenCalled()

    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' })
    expect(mockRouter.push).toHaveBeenCalledTimes(1)
    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/search/[keyword]',
      query: { keyword }
    })
  })
})

describe('freetoken 复制反馈', () => {
  test('CopyButton 只在写入成功后显示已拷贝', async () => {
    let resolveWrite
    const writeText = jest.fn(
      () =>
        new Promise(resolve => {
          resolveWrite = resolve
        })
    )
    setClipboard({ writeText })
    render(<CopyButton code='sk-test' />)
    const button = screen.getByRole('button', { name: '拷贝' })

    fireEvent.click(button)
    expect(writeText).toHaveBeenCalledWith('sk-test')
    expect(button).toHaveTextContent('拷贝')
    expect(button).not.toHaveTextContent('已拷贝')

    await act(async () => {
      resolveWrite()
    })
    expect(button).toHaveTextContent('已拷贝')
  })

  test('CopyButton 写入失败与剪贴板缺失时报失败，不误报成功', async () => {
    setClipboard({
      writeText: jest.fn().mockRejectedValue(new Error('denied'))
    })
    const first = render(<CopyButton code='sk-test' />)
    fireEvent.click(screen.getByRole('button', { name: '拷贝' }))
    await waitFor(() =>
      expect(screen.getByRole('button')).toHaveTextContent('复制失败')
    )
    expect(screen.getByRole('button')).not.toHaveTextContent('已拷贝')
    first.unmount()

    setClipboard(undefined)
    render(<CopyButton code='sk-test' />)
    fireEvent.click(screen.getByRole('button', { name: '拷贝' }))
    await waitFor(() =>
      expect(screen.getByRole('button')).toHaveTextContent('复制失败')
    )
  })

  test('PlatformDetail 仅在 Base URL 写入成功后显示已复制', async () => {
    const writeText = jest.fn().mockResolvedValue(undefined)
    setClipboard({ writeText })
    render(
      <PlatformDetail
        platform={{
          name: 'Test Platform',
          baseUrl: 'https://api.example.com/v1',
          certifications: []
        }}
        posts={[]}
      />
    )

    fireEvent.click(screen.getByTitle('点击复制 Base URL'))
    expect(writeText).toHaveBeenCalledWith('https://api.example.com/v1')
    await waitFor(() => expect(screen.getByText('已复制')).toBeInTheDocument())
  })

  test('PlatformDetail 写入失败时显示复制失败', async () => {
    setClipboard({
      writeText: jest.fn().mockRejectedValue(new Error('denied'))
    })
    render(
      <PlatformDetail
        platform={{
          name: 'Test Platform',
          baseUrl: 'https://api.example.com/v1',
          certifications: []
        }}
        posts={[]}
      />
    )

    fireEvent.click(screen.getByTitle('点击复制 Base URL'))
    await waitFor(() =>
      expect(screen.getByText('复制失败')).toBeInTheDocument()
    )
    expect(screen.queryByText('已复制')).toBeNull()
  })
})
