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
import {
  adaptPost,
  adaptPosts,
  addDays,
  fmtCtx,
  isExpired,
  isReviewSoon,
  isStale,
  isValidDateStr,
  platformSummary,
  statsFromModels,
  toDateStr,
  verificationLabel
} from '@/themes/freetoken/lib/adaptModel'

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

/** 每次返回全新对象，避免命中 adaptPost 的记忆化缓存 */
const makePost = overrides => ({
  id: 'p1',
  title: 'GPT-4o',
  summary: 'desc',
  href: '/gpt-4o',
  ext: { provider: 'OpenAI', platforms: ['OpenAI'], verificationStatus: 'verified' },
  ...overrides
})

describe('themes/freetoken lib/adaptModel 严格解析', () => {
  test('缺失 ext / 非对象输入 → 安全默认（pending、0、空数组）', () => {
    const model = adaptPost(makePost({ ext: undefined }))
    expect(model.verificationStatus).toBe('pending')
    expect(model.context).toBe(0)
    expect(model.platforms).toEqual([])
    expect(model.sourceUrl).toBe('')
    expect(model.verifiedAt).toBe('')
    expect(model.capabilities).toEqual({ vision: false, tools: false, reasoning: false })

    const empty = adaptPost(null)
    expect(empty.verificationStatus).toBe('pending')
    expect(empty.name).toBe('')
    expect(empty.href).toBe('')
    expect(adaptPost(undefined).platforms).toEqual([])
    expect(adaptPost('x').context).toBe(0)
    expect(adaptPost([]).verificationStatus).toBe('pending')
  })

  test('verificationStatus：缺失/未知/草稿一律 pending，仅显式枚举通过', () => {
    expect(adaptPost(makePost({ ext: {} })).verificationStatus).toBe('pending')
    expect(
      adaptPost(makePost({ ext: { verificationStatus: 'draft' } })).verificationStatus
    ).toBe('pending')
    expect(
      adaptPost(makePost({ ext: { verificationStatus: '已核实' } })).verificationStatus
    ).toBe('pending')
    expect(
      adaptPost(makePost({ ext: { verificationStatus: '  ' } })).verificationStatus
    ).toBe('pending')
    expect(
      adaptPost(makePost({ ext: { verificationStatus: 1 } })).verificationStatus
    ).toBe('pending')
    expect(
      adaptPost(makePost({ ext: { verificationStatus: 'verified' } })).verificationStatus
    ).toBe('verified')
    expect(
      adaptPost(makePost({ ext: { verificationStatus: 'duplicate' } })).verificationStatus
    ).toBe('duplicate')
    expect(verificationLabel('verified')).toBe('已核实')
    expect(verificationLabel('unknown-value')).toBe('待核实')
  })

  test('capabilities 严格布尔：仅 true/false 与 "true"/"false"', () => {
    const model = adaptPost(
      makePost({
        ext: {
          capabilities: { vision: true, tools: 'true', reasoning: 'false' }
        }
      })
    )
    expect(model.capabilities).toEqual({ vision: true, tools: true, reasoning: false })
    // Boolean('false') === true 的坑不允许出现；1/0/'yes' 一律 false
    const tricky = adaptPost(
      makePost({
        ext: { capabilities: { vision: 1, tools: 'yes', reasoning: ' TRUE ' } }
      })
    )
    expect(tricky.capabilities).toEqual({ vision: false, tools: false, reasoning: true })
    const broken = adaptPost(makePost({ ext: { capabilities: 'true' } }))
    expect(broken.capabilities).toEqual({ vision: false, tools: false, reasoning: false })
    const arr = adaptPost(makePost({ ext: { capabilities: ['true'] } }))
    expect(arr.capabilities).toEqual({ vision: false, tools: false, reasoning: false })
    // 派生别名与 capabilities 同源
    expect(model.vision).toBe(true)
    expect(model.reasoning).toBe(false)
  })

  test('platforms 支持数组与逗号顿号字符串并去重', () => {
    const fromArray = adaptPost(
      makePost({ ext: { platforms: ['SiliconFlow', ' SiliconFlow ', '', 'DashScope', 42] } })
    )
    expect(fromArray.platforms).toEqual(['SiliconFlow', 'DashScope'])

    const fromString = adaptPost(
      makePost({ ext: { platforms: 'OpenRouter, 智谱开放平台、OpenRouter，Groq Cloud' } })
    )
    expect(fromString.platforms).toEqual(['OpenRouter', '智谱开放平台', 'Groq Cloud'])

    const none = adaptPost(makePost({ ext: { platforms: 42 } }))
    expect(none.platforms).toEqual([])
  })

  test('context 取有限正数，否则 0', () => {
    expect(adaptPost(makePost({ ext: { context: 131072 } })).context).toBe(131072)
    expect(adaptPost(makePost({ ext: { context: '131072' } })).context).toBe(131072)
    expect(adaptPost(makePost({ ext: { context: 0 } })).context).toBe(0)
    expect(adaptPost(makePost({ ext: { context: -5 } })).context).toBe(0)
    expect(adaptPost(makePost({ ext: { context: Infinity } })).context).toBe(0)
    expect(adaptPost(makePost({ ext: { context: NaN } })).context).toBe(0)
    expect(adaptPost(makePost({ ext: { context: 'abc' } })).context).toBe(0)
    expect(fmtCtx(131072)).toBe('131K')
    expect(fmtCtx(0)).toBe('0')
  })

  test('sourceUrl 仅 http(s)，其余降级为空', () => {
    expect(
      adaptPost(makePost({ ext: { sourceUrl: 'https://openrouter.ai' } })).sourceUrl
    ).toBe('https://openrouter.ai')
    expect(
      adaptPost(makePost({ ext: { sourceUrl: 'http://example.com/x' } })).sourceUrl
    ).toBe('http://example.com/x')
    expect(
      adaptPost(makePost({ ext: { sourceUrl: 'javascript:alert(1)' } })).sourceUrl
    ).toBe('')
    expect(adaptPost(makePost({ ext: { sourceUrl: 'ftp://x.y' } })).sourceUrl).toBe('')
    expect(adaptPost(makePost({ ext: { sourceUrl: '/relative' } })).sourceUrl).toBe('')
  })

  test('href 保留官方 post.href 原值，名称/日期等字段严格校验', () => {
    const model = adaptPost(
      makePost({
        href: '/zh-CN/gpt-4o',
        ext: {
          verifiedAt: '2026-09-09',
          expiresHint: '2026-02-31',
          limitsNote: ' 每日 50 次 ',
          provider: ' OpenAI '
        },
        pageIcon: '🤖'
      })
    )
    expect(model.href).toBe('/zh-CN/gpt-4o')
    expect(model.verifiedAt).toBe('2026-09-09')
    expect(model.expiresHint).toBe('') // 假日期 2026-02-31 不通过
    expect(model.limitsNote).toBe('每日 50 次')
    expect(model.provider).toBe('OpenAI')
    expect(model.pageIcon).toBe('🤖')
    expect(isValidDateStr('2026-09-09')).toBe(true)
    expect(isValidDateStr('2026-9-9')).toBe(false)
  })

  test('ext 为坏 JSON / null / 数组 / 标量字符串时不炸站', () => {
    expect(adaptPost(makePost({ ext: '{bad json' })).platforms).toEqual([])
    expect(adaptPost(makePost({ ext: 'null' })).verificationStatus).toBe('pending')
    expect(adaptPost(makePost({ ext: '[]' })).context).toBe(0)
    expect(adaptPost(makePost({ ext: '42' })).sourceUrl).toBe('')
    // 官方 convertToJSON 去空白路径：合法 JSON 字符串仍可解析
    const parsed = adaptPost(
      makePost({ ext: '{"platforms":["Groq Cloud"],"capabilities":{"tools":"true"}}' })
    )
    expect(parsed.platforms).toEqual(['Groq Cloud'])
    expect(parsed.tools).toBe(true)
  })

  test('同一 post 对象只适配一次（记忆化 + 已适配对象直通）', () => {
    const post = makePost({})
    const first = adaptPost(post)
    const second = adaptPost(post)
    expect(second).toBe(first)
    expect(adaptPost(first)).toBe(first)
    expect(adaptPosts([post])[0]).toBe(adaptPosts([post])[0])

    const list = adaptPosts([post, null, undefined, 'x'])
    expect(list).toHaveLength(1)
    expect(adaptPosts(null)).toEqual([])
  })
})

describe('themes/freetoken lib/adaptModel 日期与统计', () => {
  test('toDateStr / addDays 边界', () => {
    expect(toDateStr('2026-09-10')).toBe('2026-09-10')
    expect(toDateStr('2026-09-10T12:00:00+08:00')).toBe('2026-09-10')
    expect(toDateStr('bad')).toBe('')
    expect(toDateStr(null)).toBe('')
    expect(toDateStr(new Date(2026, 8, 10))).toBe('2026-09-10')
    expect(addDays('2026-09-10', 30)).toBe('2026-10-10')
    expect(addDays('2026-09-10', -30)).toBe('2026-08-11')
    expect(addDays('bad', 1)).toBe('')
  })

  test('isExpired / isStale / isReviewSoon 口径', () => {
    const today = '2026-09-10'
    const expired = { expiresHint: '2026-09-01', verifiedAt: '2026-09-01' }
    const edge = { expiresHint: today, verifiedAt: today }
    const soon = { expiresHint: '2026-10-10', verifiedAt: '' }
    const later = { expiresHint: '2026-10-11', verifiedAt: '' }
    const oldVerified = { expiresHint: '', verifiedAt: '2026-08-01' }
    const freshVerified = { expiresHint: '', verifiedAt: '2026-09-09' }
    const bare = { expiresHint: '', verifiedAt: '' }

    expect(isExpired(expired, today)).toBe(true)
    expect(isExpired(edge, today)).toBe(false) // 等于今天不算过期
    expect(isStale(edge, today)).toBe(false)
    expect(isStale(oldVerified, today)).toBe(true)
    expect(isStale(freshVerified, today)).toBe(false)

    expect(isReviewSoon(expired, today)).toBe(true)
    expect(isReviewSoon(edge, today)).toBe(true)
    expect(isReviewSoon(soon, today)).toBe(true) // today + 30 天边界
    expect(isReviewSoon(later, today)).toBe(false) // today + 31 天
    expect(isReviewSoon(oldVerified, today)).toBe(true)
    expect(isReviewSoon(freshVerified, today)).toBe(false)
    expect(isReviewSoon(bare, today)).toBe(false)
  })

  test('statsFromModels 返回模型数/平台并集数/能力计数/临近复核数', () => {
    const today = '2026-09-10'
    const models = adaptPosts([
      makePost({
        id: 'a',
        ext: {
          platforms: ['OpenRouter', 'Groq Cloud'],
          capabilities: { vision: true, tools: 'true' },
          verifiedAt: '2026-09-09',
          expiresHint: '2026-09-20',
          verificationStatus: 'verified'
        }
      }),
      makePost({
        id: 'b',
        ext: {
          platforms: ['Groq Cloud', 'OpenRouter'],
          capabilities: { reasoning: true },
          verifiedAt: '2026-09-09',
          expiresHint: '2026-12-31',
          verificationStatus: 'pending'
        }
      }),
      makePost({
        id: 'c',
        ext: { capabilities: { vision: true }, verifiedAt: '2026-07-01' }
      })
    ])

    const stats = statsFromModels(models, today)
    expect(stats.modelCount).toBe(3)
    expect(stats.platformCount).toBe(2) // OpenRouter + Groq Cloud
    expect(stats.capabilityCounts).toEqual({ vision: 2, tools: 1, reasoning: 1 })
    // a: 30 天内到期；b: 距今 > 30 天不临近；c: 无 expiresHint 且核实超 30 天
    expect(stats.reviewSoonCount).toBe(2)

    const emptyStats = statsFromModels(null, today)
    expect(emptyStats).toEqual({
      modelCount: 0,
      platformCount: 0,
      capabilityCounts: { vision: 0, tools: 0, reasoning: 0 },
      reviewSoonCount: 0
    })
    expect(statsFromModels([null, 'x', 1], today).modelCount).toBe(0)
    // Date 形态 today 同样可用
    expect(statsFromModels(models, new Date(2026, 8, 10)).reviewSoonCount).toBe(2)
  })

  test('platformSummary 平台并集去重并按模型数降序', () => {
    const models = adaptPosts([
      makePost({ id: 'a', ext: { platforms: ['A', 'B'] } }),
      makePost({ id: 'b', ext: { platforms: ['B'] } }),
      makePost({ id: 'c', ext: { platforms: 'B、C' } })
    ])
    expect(platformSummary(models)).toEqual([
      { name: 'B', count: 3 },
      { name: 'A', count: 1 },
      { name: 'C', count: 1 }
    ])
    expect(platformSummary(null)).toEqual([])
  })
})
