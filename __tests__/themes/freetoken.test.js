import fs from 'fs'
import path from 'path'

import { fireEvent, render, screen, within } from '@testing-library/react'

// styled-jsx 在 jsdom 中 unmount 时会因为 style.sheet 为 null 而报错。
// 此处对主题测试单独 mock 掉 styled-jsx，不影响布局渲染验证。
jest.mock('styled-jsx/style', () => () => null)

// next/link 在 jsdom 中没有 Next Router 实例，点击会触发 navigation 异常；
// 用等价的 <a> 桩替代（仅测试环境），保留 onClick 透传
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

// siteConfig：主题组件始终把主题 CONFIG 作为第三参数传入，命中即返回（等价官方实现）
jest.mock('@/lib/config', () => ({
  siteConfig: (key, fallback, cfg) =>
    cfg && cfg[key] !== undefined ? cfg[key] : fallback
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
import {
  buildCurl,
  daysFrom,
  filterAndSortModels,
  latestVerifiedAt,
  maxContext,
  offerRows,
  platformCards,
  providerOptions,
  staleTitle
} from '@/themes/freetoken/lib/modelView'

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
      verifiedAt: '2026-09-09',
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
      provider: 'Anthropic',
      platforms: ['Groq Cloud'],
      context: 8192,
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
      provider: 'OpenAI',
      platforms: 'OpenRouter、Groq Cloud',
      context: 32768,
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

const mockArchivePosts = { '2024': [mockPosts[0]] }

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

const cardNames = () =>
  screen.getAllByTestId('ft-model-card').map(el => el.querySelector('.mname')?.textContent)

describe('themes/freetoken 官方 9 Layout 契约', () => {
  test('LayoutBase 渲染子元素、样式作用域在 #theme-freetoken，且没有左侧边栏', () => {
    const { container } = render(
      <LayoutBase siteInfo={{ title: 'Hub' }}>
        <div data-testid='child'>content</div>
      </LayoutBase>
    )
    expect(screen.getByTestId('child')).toBeInTheDocument()
    expect(container.querySelector('#theme-freetoken')).toBeTruthy()
    // 返工要求：删除原 nav 主题的左侧边栏
    expect(container.querySelector('aside')).toBeNull()
    expect(screen.queryByTestId('ft-side-menu')).toBeNull()
  })

  test('顶部导航为原设计结构：nav > .navin > logo + .navlinks 三链接', () => {
    const { container } = render(
      <LayoutBase siteInfo={{ title: 'Hub' }}>
        <div />
      </LayoutBase>
    )
    const nav = container.querySelector('nav')
    expect(nav).toBeTruthy()
    const navin = nav.querySelector('.navin')
    expect(navin).toBeTruthy()
    expect(navin.querySelector('.logo').textContent).toBe('FreeTokenHub')

    const links = nav.querySelector('.navlinks')
    expect(links.querySelectorAll('a')).toHaveLength(3)
    expect(within(links).getByText('模型库')).toHaveAttribute('href', '/#models')
    expect(within(links).getByText('平台')).toHaveAttribute('href', '/#platforms')
    expect(within(links).getByText('关于')).toHaveAttribute('href', '#')
  })

  test('LayoutIndex 渲染原设计 DOM：hero / strip / toolbar / grid / plats', () => {
    const { container } = render(
      <LayoutIndex posts={mockPosts} siteInfo={{ title: 'Hub' }} />
    )

    // hero：原设计文案与按钮
    const hero = screen.getByTestId('ft-hero')
    expect(hero).toHaveClass('hero')
    expect(within(hero).getByText(/免费的大模型/)).toBeInTheDocument()
    expect(within(hero).getByText('持续更新 · 逐条核实')).toBeInTheDocument()
    expect(within(hero).getByText('浏览模型')).toHaveAttribute('href', '#models')
    expect(within(hero).getByText('查看平台')).toHaveAttribute('href', '#platforms')

    // 统计条：原设计四项
    const stats = screen.getByTestId('ft-stats')
    expect(stats).toHaveClass('strip')
    expect(stats.querySelector('.stripin')).toBeTruthy()
    expect(within(stats).getByText('免费模型 · 已收录')).toBeInTheDocument()
    expect(within(stats).getByText('平台收录')).toBeInTheDocument()
    expect(within(stats).getByText('最大上下文窗口')).toBeInTheDocument()
    expect(within(stats).getByText('使用成本')).toBeInTheDocument()
    const models = adaptPosts(mockPosts)
    expect(screen.getByTestId('ft-stat-modelCount').textContent).toBe(String(models.length))
    expect(screen.getByTestId('ft-stat-platformCount').textContent).toBe(
      String(platformCards(models).length)
    )
    expect(screen.getByTestId('ft-stat-maxContext').textContent).toBe(
      fmtCtx(maxContext(models))
    )
    expect(screen.getByTestId('ft-stat-cost').textContent).toBe('¥0')

    // 工具栏：搜索 + 能力 chips + 排序下拉 + 供应商 chips
    const toolbar = container.querySelectorAll('.toolbar')
    expect(toolbar).toHaveLength(2)
    expect(toolbar[1]).toHaveClass('provbar')
    expect(screen.getByPlaceholderText('搜索模型或厂商')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '视觉' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '工具调用' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '深度推理' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '128K+' })).toBeInTheDocument()
    const sortmenu = screen.getByTestId('ft-sortmenu')
    expect(within(sortmenu).getByText('供应商最多')).toBeInTheDocument()
    expect(within(sortmenu).getByText('A → Z')).toBeInTheDocument()
    // 供应商 chips = ['全部', ...真实厂商]
    const provbar = toolbar[1]
    expect(within(provbar).getAllByRole('button').map(b => b.textContent)).toEqual(
      providerOptions(models)
    )

    // 卡片网格：3 列 .grid + .mcard 结构
    const grid = screen.getByTestId('ft-model-grid')
    expect(grid).toHaveClass('grid')
    expect(screen.getAllByTestId('ft-model-card')).toHaveLength(3)
    const first = grid.querySelector('.mcard')
    expect(first.querySelector('.mname').textContent).toBe('GPT-4o')
    expect(first.querySelector('.prov').textContent).toBe('OpenAI')
    expect(first.querySelector('.mdesc').textContent).toBe('summary1')
    expect(first.querySelector('.ctxrow b').textContent).toBe('128K')
    expect(first.querySelectorAll('.tag').length).toBeGreaterThan(1)

    // 过期条目：原设计的 stale 弱化 + 徽标 + 角标
    const stale = grid.querySelector('.mcard.stale')
    expect(stale.querySelector('.stale-badge').textContent).toBe('过期')
    expect(stale.querySelector('.stale-label').textContent).toBe('可能过期')

    // 平台区块：.plats > .pcard
    expect(container.querySelector('#platforms')).toBeTruthy()
    expect(screen.getByText('免费平台一览。')).toBeInTheDocument()
    expect(screen.getAllByTestId('ft-platform')).toHaveLength(
      platformCards(models).length
    )
    expect(screen.getAllByText('已核实').length).toBeGreaterThan(0)
    expect(screen.getAllByText('待核实').length).toBeGreaterThan(0)

    // 阶段占位文案不得回归
    expect(screen.queryByText(/阶段/)).toBeNull()
    expect(screen.queryByText('验证周期/天')).toBeNull()
  })

  test('首页工具栏行为与原设计一致：搜索(名/厂/ID)、能力筛选、供应商筛选、排序', () => {
    const { container } = render(<LayoutIndex posts={mockPosts} />)
    const search = screen.getByPlaceholderText('搜索模型或厂商')

    // 搜索模型名
    fireEvent.change(search, { target: { value: 'claude' } })
    expect(cardNames()).toEqual(['Claude 3'])

    // 搜索厂商
    fireEvent.change(search, { target: { value: 'anthropic' } })
    expect(cardNames()).toEqual(['Claude 3'])

    // 搜索模型 ID
    fireEvent.change(search, { target: { value: 'p3' } })
    expect(cardNames()).toEqual(['Legacy Model'])

    fireEvent.change(search, { target: { value: '' } })
    expect(cardNames()).toHaveLength(3)

    // 能力筛选：视觉
    fireEvent.click(screen.getByRole('button', { name: '视觉' }))
    expect(cardNames()).toEqual(['GPT-4o'])
    fireEvent.click(screen.getByRole('button', { name: '深度推理' }))
    expect(cardNames()).toEqual(['Claude 3'])
    fireEvent.click(screen.getByRole('button', { name: '128K+' }))
    expect(cardNames()).toEqual(['GPT-4o'])
    const filterbar = container.querySelectorAll('.toolbar')[0]
    fireEvent.click(within(filterbar).getByRole('button', { name: '全部' }))

    // 供应商筛选（与能力筛选为 AND）
    const provbar = container.querySelectorAll('.toolbar')[1]
    fireEvent.click(within(provbar).getByRole('button', { name: 'OpenAI' }))
    expect(cardNames()).toEqual(['GPT-4o', 'Legacy Model'])
    fireEvent.click(within(provbar).getByRole('button', { name: '全部' }))
    expect(cardNames()).toHaveLength(3)

    // 排序：A → Z
    fireEvent.click(within(screen.getByTestId('ft-sortmenu')).getByText('A → Z'))
    expect(cardNames()).toEqual(['Claude 3', 'GPT-4o', 'Legacy Model'])

    // 排序：供应商最多（平台收录数之和降序）
    fireEvent.click(within(screen.getByTestId('ft-sortmenu')).getByText('供应商最多'))
    expect(cardNames()).toEqual(['Legacy Model', 'GPT-4o', 'Claude 3'])
  })

  test('首页无数据时使用原设计空态样式', () => {
    const { container } = render(<LayoutIndex posts={[]} />)
    expect(screen.getByText('没有符合条件的模型。')).toHaveClass('empty')
    expect(container.querySelectorAll('.mcard')).toHaveLength(0)
    expect(screen.getByText('暂无可汇总的平台数据，等待 Notion 后台同步。')).toHaveClass(
      'empty'
    )
    expect(screen.getByTestId('ft-stat-modelCount').textContent).toBe('0')
    expect(screen.getByTestId('ft-stat-maxContext').textContent).toBe('0')
  })

  test('LayoutPostList 渲染分类标题与卡片网格，空列表有兜底文案', () => {
    const { unmount } = render(<LayoutPostList posts={mockPosts} category='LLM' />)
    expect(screen.getByText('LLM')).toBeInTheDocument()
    expect(screen.getAllByTestId('ft-model-card')).toHaveLength(3)
    unmount()

    render(<LayoutPostList posts={[]} category='LLM' />)
    expect(screen.getByText('没有符合条件的模型。')).toBeInTheDocument()
  })

  test('LayoutSlug 逐块渲染原设计结构（hero/facts/featlist/offers/curl/pagefoot）', () => {
    const post = {
      id: 'd1',
      title: 'DeepSeek V3',
      summary: '性价比之选',
      href: '/deepseek-v3',
      blockMap: { block: {} },
      ext: {
        provider: 'DeepSeek',
        platforms: ['DeepSeek 开放平台', '火山方舟'],
        context: 131072,
        capabilities: { tools: true, reasoning: 'true' },
        limitsNote: '注册赠送额度，用完需充值',
        verifiedAt: '2026-09-09',
        verificationStatus: 'pending',
        sourceUrl: 'https://platform.deepseek.com'
      }
    }
    const { container } = render(<LayoutSlug post={post} />)

    // 返回模型库 + eyebrow + h1 + herosub + heropills
    const hero = screen.getByTestId('ft-detail-hero')
    expect(within(hero).getByText('返回模型库')).toHaveAttribute('href', '/#models')
    expect(hero.querySelector('.eyebrow').textContent).toBe('DeepSeek')
    expect(within(hero).getByRole('heading', { name: 'DeepSeek V3' })).toBeInTheDocument()
    expect(hero.querySelector('.herosub').textContent).toBe('性价比之选')
    const pills = Array.from(hero.querySelectorAll('.hpill')).map(p => p.textContent)
    expect(pills[0]).toBe('免费 ¥0')
    expect(pills[1]).toBe('上下文 128K')
    expect(pills).toContain('工具调用')
    expect(pills).toContain('深度推理')
    expect(pills).toContain('OpenAI 兼容')
    expect(pills.some(t => /^核实 2026-09-09 · 距今 -?\d+ 天$/.test(t))).toBe(true)

    // 模型特性：facts 六格 + featlist
    const facts = screen.getByTestId('ft-facts')
    expect(within(facts).getByText('上下文窗口')).toBeInTheDocument()
    expect(within(facts).getByText('128K tokens')).toBeInTheDocument()
    expect(within(facts).getAllByText('文本')).toHaveLength(2) // 输入模态 + 输出模态
    expect(within(facts).getAllByText('支持')).toHaveLength(2) // 工具调用 + 深度推理
    expect(within(facts).getByText('免费')).toBeInTheDocument()
    const featlist = screen.getByTestId('ft-featlist')
    expect(within(featlist).getByText('长上下文')).toBeInTheDocument()
    expect(within(featlist).getByText('Agent 就绪')).toBeInTheDocument()
    expect(within(featlist).getByText('深度推理')).toBeInTheDocument()
    expect(within(featlist).getByText('零成本')).toBeInTheDocument()

    // 免费获取渠道：每行平台 + 核实徽标 + 额度说明 + 前往外链
    const offers = screen.getByTestId('ft-offers')
    expect(within(offers).getByText('DeepSeek 开放平台')).toBeInTheDocument()
    expect(within(offers).getByText('火山方舟')).toBeInTheDocument()
    expect(within(offers).getAllByText('注册赠送额度，用完需充值')).toHaveLength(2)
    expect(offers.querySelectorAll('.badge.todo')).toHaveLength(2) // 每行核实徽标
    expect(offers.querySelectorAll('.st.todo')).toHaveLength(2) // 每行状态点
    const goLinks = within(offers).getAllByText('前往')
    expect(goLinks).toHaveLength(2)
    expect(goLinks[0].closest('a')).toHaveAttribute(
      'href',
      'https://platform.deepseek.com'
    )
    expect(goLinks[0].closest('a')).toHaveAttribute('target', '_blank')

    // 快速接入：curl 代码块 + 拷贝按钮
    const code = screen.getByTestId('ft-curl')
    expect(code.querySelector('code').textContent).toContain(
      'curl https://openrouter.ai/api/v1/chat/completions'
    )
    expect(code.querySelector('code').textContent).toContain('"model": "d1"')
    expect(within(code).getByRole('button', { name: '拷贝' })).toBeInTheDocument()

    // Notion 正文（官方内容维护方式保留）
    expect(screen.getByTestId('notion-page')).toBeInTheDocument()

    // 页脚报告入口
    const foot = container.querySelector('.pagefoot')
    const report = within(foot).getByText('报告过期')
    expect(report.closest('a').getAttribute('href')).toContain(
      'https://github.com/FreeTokenHub/FreeTokenHub/issues/new?template=expired.md&title='
    )
    expect(report.closest('a').getAttribute('href')).toContain(
      encodeURIComponent('过期报告：DeepSeek V3')
    )
    expect(within(foot).getByText(/核实日期 2026-09-09/)).toBeInTheDocument()

    // 未真实探测过的健康声明一律不得出现
    expect(screen.queryByText(/接口正常/)).toBeNull()
    expect(screen.queryByText(/接口异常/)).toBeNull()
  })

  test('LayoutSlug 过期条目出现“信息可能过期”pill 与页脚提示', () => {
    const post = {
      id: 'd2',
      title: 'Old Model',
      href: '/old-model',
      ext: {
        provider: 'Legacy',
        platforms: ['OpenRouter'],
        verifiedAt: '2020-01-01',
        expiresHint: '2020-01-02',
        verificationStatus: 'verified'
      }
    }
    render(<LayoutSlug post={post} />)
    expect(screen.getByText('信息可能过期')).toBeInTheDocument()
    expect(screen.getByText(/信息可能过期，请以官网为准/)).toBeInTheDocument()
  })

  test('LayoutSlug 无渠道数据时用原设计空态，来源链接仅允许 http(s)', () => {
    const post = {
      id: 'd3',
      title: 'Bad Source',
      href: '/bad-source',
      ext: { sourceUrl: 'javascript:alert(1)', verificationStatus: 'verified' }
    }
    render(<LayoutSlug post={post} />)
    expect(screen.getByText('暂无已收录的免费获取渠道。')).toHaveClass('empty')
    expect(document.querySelector('a[href^="javascript"]')).toBeNull()
  })

  test('LayoutSlug 未找到模型时渲染原设计 .missing 空态', () => {
    render(<LayoutSlug post={{ id: 'x', title: 'X', ext: {} }} />)
    // 无 ext.platforms → offers 空态（.missing 仅用于缺 post/加锁场景）
    expect(screen.getByTestId('ft-offers').querySelector('.empty')).toBeTruthy()

    const { container } = render(<LayoutSlug post={null} lock />)
    expect(container.querySelector('.missing')).toBeTruthy()
  })

  test('LayoutSearch 渲染搜索框与结果网格', () => {
    render(<LayoutSearch posts={mockPosts} keyword='gpt' />)
    expect(screen.getByText('gpt')).toBeInTheDocument()
    expect(screen.getByLabelText('站内搜索')).toHaveClass('search')
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

  test('THEME_CONFIG 包含 Freetoken 配置项（原设计文案）', () => {
    expect(THEME_CONFIG.FREETOKEN_LOGO_TEXT).toBe('FreeTokenHub')
    expect(THEME_CONFIG.FREETOKEN_HERO_CTA_PRIMARY).toBe('浏览模型')
    expect(THEME_CONFIG.FREETOKEN_HERO_CTA_SECONDARY).toBe('查看平台')
    expect(THEME_CONFIG.FREETOKEN_FALLBACK_MENU).toHaveLength(3)
  })
})

describe('themes/freetoken 菜单与可访问性', () => {
  test('菜单三级回退：customMenu → customNav → 内置回退', () => {
    const { unmount } = render(
      <LayoutBase
        customMenu={mockCustomMenu}
        customNav={mockCustomNav}
        siteInfo={{ title: 'Hub' }}
      />
    )
    expect(screen.getAllByText('模型库').length).toBeGreaterThan(0)
    expect(screen.queryByText('关于我们')).toBeNull()
    unmount()

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

  test('customMenu 的 SubMenu 以同样式的下拉渲染', () => {
    render(<LayoutBase customMenu={mockCustomMenu} siteInfo={{ title: 'Hub' }} />)
    const menu = screen.getByTestId('ft-navmenu')
    expect(within(menu).getByText('开源模型')).toHaveAttribute(
      'href',
      '/category/oss'
    )
    expect(document.querySelector('.navdd')).toBeTruthy()
  })

  test('回到顶部按钮存在且默认隐藏', () => {
    const { container } = render(
      <LayoutBase siteInfo={{ title: 'Hub' }}>
        <div />
      </LayoutBase>
    )
    const totop = container.querySelector('.totop')
    expect(totop).toBeTruthy()
    expect(totop).not.toHaveClass('show')
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

  test('context 取有限正数，否则 0；fmtCtx 与原设计同口径（1024 进制）', () => {
    expect(adaptPost(makePost({ ext: { context: 131072 } })).context).toBe(131072)
    expect(adaptPost(makePost({ ext: { context: '131072' } })).context).toBe(131072)
    expect(adaptPost(makePost({ ext: { context: 0 } })).context).toBe(0)
    expect(adaptPost(makePost({ ext: { context: -5 } })).context).toBe(0)
    expect(adaptPost(makePost({ ext: { context: Infinity } })).context).toBe(0)
    expect(adaptPost(makePost({ ext: { context: NaN } })).context).toBe(0)
    expect(adaptPost(makePost({ ext: { context: 'abc' } })).context).toBe(0)
    // 原设计 lib/shared.js：Math.round(n/1024) + 'K'，百万以上 M
    expect(fmtCtx(131072)).toBe('128K')
    expect(fmtCtx(262144)).toBe('256K')
    expect(fmtCtx(512000)).toBe('500K')
    expect(fmtCtx(1000000)).toBe('1M')
    expect(fmtCtx(1500000)).toBe('1.5M')
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

describe('themes/freetoken lib/modelView 视图层工具', () => {
  const models = adaptPosts(mockPosts)

  test('providerOptions / maxContext / latestVerifiedAt', () => {
    expect(providerOptions(models)).toEqual(['全部', 'OpenAI', 'Anthropic'])
    expect(providerOptions(null)).toEqual(['全部'])
    expect(maxContext(models)).toBe(131072)
    expect(maxContext([])).toBe(0)
    expect(latestVerifiedAt(models)).toBe('2026-09-09')
    expect(latestVerifiedAt([])).toBe('')
  })

  test('filterAndSortModels 与原设计 page.jsx 行为一致', () => {
    expect(filterAndSortModels(models, { kw: 'gpt' }).map(m => m.name)).toEqual(['GPT-4o'])
    expect(
      filterAndSortModels(models, { filter: 'vision' }).map(m => m.name)
    ).toEqual(['GPT-4o'])
    expect(
      filterAndSortModels(models, { provider: 'OpenAI' }).map(m => m.name)
    ).toEqual(['GPT-4o', 'Legacy Model'])
    expect(
      filterAndSortModels(models, { sort: 'az' }).map(m => m.name)
    ).toEqual(['Claude 3', 'GPT-4o', 'Legacy Model'])
    expect(
      filterAndSortModels(models, { sort: 'providers' }).map(m => m.name)
    ).toEqual(['Legacy Model', 'GPT-4o', 'Claude 3'])
    // 入参不被修改
    const before = models.map(m => m.name)
    filterAndSortModels(models, { sort: 'az' })
    expect(models.map(m => m.name)).toEqual(before)
  })

  test('platformCards 只输出可核实字段，全 verified 才标已核实', () => {
    const cards = platformCards(models)
    expect(cards.map(c => c.name)).toEqual(['Groq Cloud', 'OpenRouter', 'GitHub Models'])
    const openrouter = cards.find(c => c.name === 'OpenRouter')
    expect(openrouter.count).toBe(2)
    expect(openrouter.verifiedCount).toBe(2)
    expect(openrouter.verified).toBe(true)
    expect(openrouter.verifiedAt).toBe('2026-09-09')
    const groq = cards.find(c => c.name === 'Groq Cloud')
    expect(groq.count).toBe(2)
    expect(groq.verifiedCount).toBe(1)
    expect(groq.verified).toBe(false) // 只要有一条未核实就不标已核实
    expect(platformCards(null)).toEqual([])
  })

  test('daysFrom / staleTitle 与原设计同口径', () => {
    expect(daysFrom('2026-09-20', '2026-09-10')).toBe(10)
    expect(daysFrom('2026-09-01', '2026-09-10')).toBe(-9)
    expect(daysFrom('', '2026-09-10')).toBe(0)
    expect(staleTitle({ expiresHint: '2020-01-02', verifiedAt: '2020-01-01' }, '2026-09-10'))
      .toContain('截止提示 2020-01-02 已过')
    expect(staleTitle({ verifiedAt: '2026-01-01' }, '2026-09-10')).toContain(
      '距今超 30 天'
    )
    expect(staleTitle({ verifiedAt: '2026-09-09' }, '2026-09-10')).toBe('')
  })

  test('buildCurl / offerRows 输出原设计结构', () => {
    const code = buildCurl({ id: 'nex-agi/nex-n2.5-mini:free' }, 'https://openrouter.ai/api/v1/')
    expect(code.split('\n')[0]).toBe(
      'curl https://openrouter.ai/api/v1/chat/completions \\'
    )
    expect(code).toContain('"model": "nex-agi/nex-n2.5-mini:free"')
    expect(code).toContain('-H "Authorization: Bearer ***"')
    expect(buildCurl({ id: 'x' }, '')).toContain('curl https://openrouter.ai/api/v1/')

    const rows = offerRows(models[0])
    expect(rows.map(r => r.name)).toEqual(['OpenRouter', 'GitHub Models'])
    expect(rows[0].verified).toBe(true)
    expect(rows[0].url).toBe('https://openrouter.ai')
    expect(offerRows(null)).toEqual([])
  })
})

describe('themes/freetoken 样式作用域（不污染全局）', () => {
  const root = process.cwd()
  const styleSource = fs.readFileSync(
    path.join(root, 'themes/freetoken/style.js'),
    'utf8'
  )

  test('style.js 不出现全局 :root，所有选择器都限定在 #theme-freetoken', () => {
    expect(styleSource).not.toMatch(/:root\s*{/)
    const selectorLines = styleSource
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.endsWith('{'))
      .filter(line => !line.startsWith('/*'))
      .filter(line => !line.startsWith('@media'))
      .filter(line => !line.startsWith('${'))
    expect(selectorLines.length).toBeGreaterThan(30)
    for (const line of selectorLines) {
      expect(
        line.startsWith('#theme-freetoken') || line.startsWith('.dark #theme-freetoken')
      ).toBe(true)
    }
  })

  test('正文区（#article-wrapper）被排除在元素级样式之外', () => {
    expect(styleSource).toContain('#theme-freetoken a:not(#article-wrapper a)')
    expect(styleSource).toContain('#theme-freetoken h1:not(#article-wrapper h1)')
    expect(styleSource).toContain('#theme-freetoken h2:not(#article-wrapper h2)')
    expect(styleSource).toContain(
      '#theme-freetoken section:not(#article-wrapper section)'
    )
  })

  test('组件不再使用自创 ft-* class（data-testid 除外）', () => {
    const dir = path.join(root, 'themes/freetoken/components')
    const sources = fs
      .readdirSync(dir)
      .map(file => fs.readFileSync(path.join(dir, file), 'utf8'))
      .concat([fs.readFileSync(path.join(root, 'themes/freetoken/index.js'), 'utf8')])
      .join('\n')
    expect(sources).not.toMatch(/className={?'[^']*ft-[a-z]/)
    expect(sources).not.toMatch(/className={?"[^"]*ft-[a-z]/)
  })
})
