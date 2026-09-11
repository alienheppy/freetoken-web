import { render, screen } from '@testing-library/react'

// styled-jsx 在 jsdom 中 unmount 时会因为 style.sheet 为 null 而报错。
// 此处对主题测试单独 mock 掉 styled-jsx，不影响布局渲染验证。
jest.mock('styled-jsx/style', () => () => null)

// NotionPage 依赖 react-notion-x ESM，jsdom 中不做真实渲染
jest.mock('@/components/NotionPage', () => ({
  __esModule: true,
  default: ({ post }) => <div data-testid='notion-page'>{post?.title}</div>
}))

import {
  LayoutBase,
  LayoutIndex,
  LayoutPostList,
  LayoutSlug,
  LayoutSearch,
  LayoutArchive,
  LayoutCategoryIndex,
  LayoutTagIndex,
  Layout404,
  THEME_CONFIG
} from '@/themes/freetoken'

jest.mock('@/lib/global', () => ({
  useGlobal: () => ({
    locale: {
      COMMON: { CATEGORY: '分类', TAG: '标签', ARCHIVE: '归档' },
      POST: { TOP: '回顶部' },
      SEARCH: { ARTICLES: '搜索文章', TAGS: '搜索标签' }
    },
    onLoading: false,
    isDarkMode: false,
    toggleDarkMode: jest.fn()
  })
}))

jest.mock('@/lib/config', () => ({
  siteConfig: (key, fallback, cfg) => {
    if (cfg && cfg[key] !== undefined) return cfg[key]
    if (key === 'FREETOKEN_LOGO_TEXT') return 'FreeTokenHub'
    if (key === 'FREETOKEN_HERO_TITLE') return '免费的大模型。\n一目了然。'
    if (key === 'FREETOKEN_HERO_SUB') return '副标题'
    if (key === 'FREETOKEN_HERO_EYEBROW') return 'eyebrow'
    if (key === 'POST_TITLE_ICON') return false
    return fallback
  }
}))

const mockPosts = [
  { id: 'p1', title: 'GPT-4o', summary: 'summary1', href: '/gpt-4o', ext: { capabilities: { vision: true } } },
  { id: 'p2', title: 'Claude 3', summary: 'summary2', href: '/claude-3', ext: {} }
]

const mockCategoryOptions = [
  { name: 'LLM', count: 2 },
  { name: 'Vision', count: 1 }
]

const mockTagOptions = [
  { name: 'free', count: 2 },
  { name: 'api', count: 1 }
]

const mockArchivePosts = {
  '2024': mockPosts
}

describe('themes/freetoken 官方 9 Layout 契约', () => {
  test('LayoutBase 渲染子元素', () => {
    render(
      <LayoutBase siteInfo={{ title: 'Hub' }}>
        <div data-testid='child'>content</div>
      </LayoutBase>
    )
    expect(screen.getByTestId('child')).toBeInTheDocument()
  })

  test('LayoutIndex 渲染 Hero 与模型占位', () => {
    render(<LayoutIndex posts={mockPosts} siteInfo={{ title: 'Hub' }} />)
    expect(screen.getByText(/免费的大模型/)).toBeInTheDocument()
    expect(screen.getByText('GPT-4o')).toBeInTheDocument()
  })

  test('LayoutPostList 渲染分类标题和占位卡片', () => {
    render(<LayoutPostList posts={mockPosts} category='LLM' />)
    expect(screen.getByText(/LLM/)).toBeInTheDocument()
    expect(screen.getByText('Claude 3')).toBeInTheDocument()
  })

  test('LayoutSlug 渲染文章标题', () => {
    render(<LayoutSlug post={{ id: 'p1', title: 'Test Post', href: '/test' }} />)
    expect(screen.getByRole('heading', { name: 'Test Post' })).toBeInTheDocument()
  })

  test('LayoutSearch 渲染搜索标题与输入框', () => {
    render(<LayoutSearch posts={mockPosts} keyword='gpt' />)
    expect(screen.getByText(/gpt/)).toBeInTheDocument()
  })

  test('LayoutArchive 渲染归档', () => {
    render(<LayoutArchive archivePosts={mockArchivePosts} />)
    expect(screen.getByText('2024')).toBeInTheDocument()
    expect(screen.getByText('GPT-4o')).toBeInTheDocument()
  })

  test('LayoutCategoryIndex 渲染分类列表', () => {
    render(<LayoutCategoryIndex categoryOptions={mockCategoryOptions} />)
    expect(screen.getByText(/LLM\(2\)/)).toBeInTheDocument()
  })

  test('LayoutTagIndex 渲染标签列表', () => {
    render(<LayoutTagIndex tagOptions={mockTagOptions} />)
    expect(screen.getByText(/#free\(2\)/)).toBeInTheDocument()
  })

  test('Layout404 渲染 404 提示', () => {
    render(<Layout404 />)
    expect(screen.getByText('404')).toBeInTheDocument()
  })

  test('THEME_CONFIG 包含 Freetoken 配置项', () => {
    expect(THEME_CONFIG.FREETOKEN_LOGO_TEXT).toBe('FreeTokenHub')
    expect(THEME_CONFIG.FREETOKEN_FALLBACK_MENU).toBeInstanceOf(Array)
  })
})
