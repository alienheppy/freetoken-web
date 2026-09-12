import { fireEvent, render, screen, within } from '@testing-library/react'

// styled-jsx 在 jsdom 中 unmount 时会因为 style.sheet 为 null 而报错。
// 此处对主题测试单独 mock 掉 styled-jsx，不影响布局渲染验证。
jest.mock('styled-jsx/style', () => () => null)

// next/link 在 jsdom 中没有 Next Router 实例，点击会触发 navigation 异常；
// 用等价的 <a> 桩替代（仅测试环境），保留 onClick 透传以便验证“点击后关闭菜单”
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...rest }) => (
    <a href={typeof href === 'string' ? href : '#'} {...rest}>
      {children}
    </a>
  )
}))

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

/** 首页/列表用的已发布模型（含真实 ext 字段） */
const mockPosts = [
  {
    id: 'p1',
    title: 'GPT-4o',
    summary: 'summary1',
    href: '/gpt-4o',
    ext: {
      provider: 'OpenAI',
      platforms: ['OpenRouter', 'GitHub Models'],
      context: 131072,
      capabilities: { vision: true, tools: 'true' },
      verificationStatus: 'verified',
      sourceUrl: 'https://openrouter.ai'
    }
  },
  {
    id: 'p2',
    title: 'Claude 3',
    summary: 'summary2',
    href: '/claude-3',
    ext: {
      platforms: ['Groq Cloud'],
      capabilities: { reasoning: true },
      verificationStatus: 'pending'
    }
  },
  {
    id: 'p3',
    title: 'Legacy Model',
    summary: 'summary3',
    href: '/legacy-model',
    ext: {
      platforms: 'OpenRouter、Groq Cloud',
      verifiedAt: '2020-01-01',
      expiresHint: '2020-01-02',
      verificationStatus: 'verified'
    }
  }
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
  '2024': [mockPosts[0]]
}

/** 菜单 fixture：customMenu（title + SubMenu）与 customNav（name 字段） */
const mockCustomMenu = [
  {
    title: '模型库',
    href: '/#models',
    show: true,
    subMenus: [{ title: '开源模型', href: '/category/oss', show: true }]
  },
  { title: '平台', href: '/#platforms', show: true },
  { title: '暂不显示', href: '/hidden', show: false }
]

const mockCustomNav = [
  { name: '关于我们', href: '/about', show: true },
  { name: '提交模型', href: '/submit', show: true }
]

describe('themes/freetoken 官方 9 Layout 契约', () => {
  test('LayoutBase 渲染子元素且样式作用域在 #theme-freetoken 根节点', () => {
    const { container } = render(
      <LayoutBase siteInfo={{ title: 'Hub' }}>
        <div data-testid='child'>content</div>
      </LayoutBase>
    )
    expect(screen.getByTestId('child')).toBeInTheDocument()
    expect(container.querySelector('#theme-freetoken')).toBeTruthy()
  })

  test('LayoutIndex 渲染 Hero、真实统计条与模型卡片（无阶段占位文案）', () => {
    render(<LayoutIndex posts={mockPosts} siteInfo={{ title: 'Hub' }} />)
    expect(screen.getByText(/免费的大模型/)).toBeInTheDocument()

    // 模型卡片：模型名 / 平台 / 能力标签 / 审核状态
    expect(screen.getByText('GPT-4o')).toBeInTheDocument()
    expect(screen.getAllByText('OpenRouter').length).toBeGreaterThan(0)
    expect(screen.getByText('视觉')).toBeInTheDocument()
    expect(screen.getAllByText('已核实').length).toBeGreaterThan(0)
    expect(screen.getByText('待核实')).toBeInTheDocument()
    expect(screen.getAllByTestId('ft-model-card')).toHaveLength(3)

    // 统计条：真实来自 statsFromModels（同一纯函数在同一输入下的结果）
    const stats = screen.getByTestId('ft-stats')
    const expected = statsFromModels(adaptPosts(mockPosts))
    expect(within(stats).getByText('已收录模型')).toBeInTheDocument()
    expect(screen.getByTestId('ft-stat-modelCount').textContent).toBe(
      String(expected.modelCount)
    )
    expect(screen.getByTestId('ft-stat-platformCount').textContent).toBe(
      String(expected.platformCount)
    )
    expect(screen.getByTestId('ft-stat-capabilityTotal').textContent).toBe(
      String(
        expected.capabilityCounts.vision +
          expected.capabilityCounts.tools +
          expected.capabilityCounts.reasoning
      )
    )
    expect(screen.getByTestId('ft-stat-reviewSoonCount').textContent).toBe(
      String(expected.reviewSoonCount)
    )
    // legend 行展示三项能力明细（视觉/工具/推理）
    expect(within(stats).getByText(/视觉 1/)).toBeInTheDocument()

    // 已过期条目弱化 + 标记
    expect(screen.getByText('可能过期')).toBeInTheDocument()

    // 平台并集区块
    expect(screen.getByText('免费平台一览。')).toBeInTheDocument()
    expect(screen.getAllByTestId('ft-platform')).toHaveLength(
      platformSummary(adaptPosts(mockPosts)).length
    )

    // 阶段 1 的硬编码占位必须消失
    expect(screen.queryByText(/阶段/)).toBeNull()
    expect(screen.queryByText('验证周期/天')).toBeNull()
  })

  test('LayoutPostList 渲染分类标题与真实模型卡片', () => {
    render(<LayoutPostList posts={mockPosts} category='LLM' />)
    expect(screen.getByText(/LLM/)).toBeInTheDocument()
    expect(screen.getByText('Claude 3')).toBeInTheDocument()
    expect(screen.getAllByText('Groq Cloud').length).toBeGreaterThan(0)
    expect(screen.getAllByTestId('ft-model-card')).toHaveLength(3)
  })

  test('LayoutPostList 空列表有兜底文案', () => {
    render(<LayoutPostList posts={[]} category='LLM' />)
    expect(screen.getByText('没有符合条件的模型。')).toBeInTheDocument()
  })

  test('LayoutSlug 渲染文章标题', () => {
    render(<LayoutSlug post={{ id: 'p1', title: 'Test Post', href: '/test' }} />)
    expect(screen.getByRole('heading', { name: 'Test Post' })).toBeInTheDocument()
  })

  test('LayoutSlug 展示平台/额度说明/核实日期/截止提示/来源，不出现“接口正常”', () => {
    const post = {
      id: 'd1',
      title: 'DeepSeek V3',
      summary: '性价比之选',
      href: '/deepseek-v3',
      ext: {
        provider: 'DeepSeek',
        platforms: ['DeepSeek 开放平台', '火山方舟'],
        context: 131072,
        capabilities: { tools: true, reasoning: 'true' },
        limitsNote: '注册赠送额度，用完需充值',
        verifiedAt: '2026-09-09',
        expiresHint: '2020-01-01',
        verificationStatus: 'pending',
        sourceUrl: 'https://platform.deepseek.com'
      }
    }
    render(<LayoutSlug post={post} />)
    expect(screen.getByRole('heading', { name: 'DeepSeek V3' })).toBeInTheDocument()

    const facts = screen.getByTestId('ft-facts')
    expect(within(facts).getByText('DeepSeek 开放平台')).toBeInTheDocument()
    expect(within(facts).getByText('火山方舟')).toBeInTheDocument()
    expect(within(facts).getByText('注册赠送额度，用完需充值')).toBeInTheDocument()
    expect(within(facts).getByText('2026-09-09')).toBeInTheDocument()
    expect(within(facts).getByText('2020-01-01')).toBeInTheDocument()
    expect(within(facts).getByText('待核实')).toBeInTheDocument()
    expect(within(facts).getByText('可能已变化，请以平台官网为准。', { exact: false })).toBeInTheDocument()

    const sourceLink = within(facts).getByRole('link', {
      name: 'https://platform.deepseek.com'
    })
    expect(sourceLink).toHaveAttribute('href', 'https://platform.deepseek.com')

    // 未真实探测过的健康声明一律不得出现
    expect(screen.queryByText(/接口正常/)).toBeNull()
    expect(screen.queryByText(/接口异常/)).toBeNull()
  })

  test('LayoutSlug 来源链接仅允许 http(s)，非法协议降级为“未标注”', () => {
    const post = {
      id: 'd2',
      title: 'Bad Source',
      href: '/bad-source',
      ext: { sourceUrl: 'javascript:alert(1)', verificationStatus: 'verified' }
    }
    render(<LayoutSlug post={post} />)
    const facts = screen.getByTestId('ft-facts')
    expect(within(facts).queryByText('javascript:alert(1)')).toBeNull()
    expect(within(facts).getAllByText('未标注').length).toBeGreaterThan(0)
    expect(document.querySelector('a[href^="javascript"]')).toBeNull()
  })

  test('LayoutSearch 渲染搜索标题与带 aria-label 的搜索框', () => {
    render(<LayoutSearch posts={mockPosts} keyword='gpt' />)
    expect(screen.getByText(/gpt/)).toBeInTheDocument()
    expect(screen.getByLabelText('站内搜索')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '搜索' })).toBeInTheDocument()
    expect(screen.getAllByTestId('ft-model-card')).toHaveLength(3)
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

describe('themes/freetoken 菜单与可访问性', () => {
  test('菜单三级回退：customMenu → customNav → 内置回退', () => {
    // 1) customMenu 优先，customNav 不参与
    const { unmount } = render(
      <LayoutBase customMenu={mockCustomMenu} customNav={mockCustomNav} siteInfo={{ title: 'Hub' }} />
    )
    expect(screen.getAllByText('模型库').length).toBeGreaterThan(0)
    expect(screen.queryByText('关于我们')).toBeNull()
    unmount()

    // 2) 无 customMenu 时使用 customNav（name 字段）
    render(<LayoutBase customNav={mockCustomNav} siteInfo={{ title: 'Hub' }} />)
    expect(screen.getAllByText('关于我们').length).toBeGreaterThan(0)
    expect(screen.getAllByText('提交模型').length).toBeGreaterThan(0)
    expect(screen.queryByText('关于')).toBeNull()
  })

  test('三级菜单都不存在时回退到 CONFIG.FREETOKEN_FALLBACK_MENU，并尊重 show:false', () => {
    render(<LayoutBase siteInfo={{ title: 'Hub' }} />)
    expect(screen.getAllByText('模型库').length).toBeGreaterThan(0)
    expect(screen.getAllByText('平台').length).toBeGreaterThan(0)
    expect(screen.queryByText('暂不显示')).toBeNull()
  })

  test('customMenu 的 SubMenu 可展开（button + aria-expanded）', () => {
    render(<LayoutBase customMenu={mockCustomMenu} siteInfo={{ title: 'Hub' }} />)
    const toggle = screen.getByRole('button', { name: /模型库/ })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getAllByText('开源模型').length).toBeGreaterThan(0)
    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
  })

  test('移动端菜单：点击后展开、点击链接后自动关闭', () => {
    render(<LayoutBase customMenu={mockCustomMenu} siteInfo={{ title: 'Hub' }} />)
    expect(screen.queryByTestId('ft-mobile-menu')).toBeNull()

    const mobileToggle = screen.getByRole('button', { name: '切换菜单' })
    expect(mobileToggle).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(mobileToggle)

    const panel = screen.getByTestId('ft-mobile-menu')
    expect(mobileToggle).toHaveAttribute('aria-expanded', 'true')
    expect(within(panel).getAllByText('模型库').length).toBe(1)
    expect(within(panel).getByText('开源模型')).toBeInTheDocument()

    fireEvent.click(within(panel).getByText('模型库'))
    expect(screen.queryByTestId('ft-mobile-menu')).toBeNull()
    expect(mobileToggle).toHaveAttribute('aria-expanded', 'false')
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
