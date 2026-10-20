/**
 * Freetoken 主题视图层小工具（纯函数，返工版）
 *
 * 只消费 `lib/adaptModel.js`（严格解析后的模型对象），不触碰官方 props 形状：
 *   - 筛选/排序：复刻原设计 `app/app/page.jsx` 的工具栏行为（搜索 name+provider+id、
 *     能力筛选、供应商筛选、排序 默认/供应商最多/A→Z）
 *   - 平台聚合：由模型行 ext.platforms 并集派生（原设计取 PLATFORMS 常量，主题侧无该常量）
 *   - curl 示例：复刻原设计 `app/app/model/[slug]/page.jsx` 的拼装方式
 */

/** 能力筛选项（原设计 page.jsx FILTERS） */
export const FILTERS = [
  { key: 'all', label: '全部' },
  { key: 'vision', label: '视觉' },
  { key: 'tools', label: '工具调用' },
  { key: 'reasoning', label: '深度推理' },
  { key: 'big', label: '128K+' }
]

/** 排序项（原设计 page.jsx SORTS） */
export const SORTS = [
  { key: 'default', label: '默认' },
  { key: 'providers', label: '供应商最多' },
  { key: 'az', label: 'A → Z' }
]

/**
 * 平台详情页「免费模型」表头的可排序列（顺序与表格列一一对应）。
 * first：首次点击该列时的方向——数值列先看最大值（降序），名称列先看 A→Z（升序）。
 */
export const PLATFORM_SORTS = [
  { key: 'name', label: '模型', first: 'asc' },
  { key: 'context', label: '上下文', first: 'desc' },
  { key: 'caps', label: '能力', first: 'desc' },
  { key: 'providers', label: '模型提供商', first: 'desc' }
]

/** 供应商筛选的「全部」项（原设计字面量） */
export const ALL_PROVIDERS = '全部'

/**
 * 平台详情页链接：以平台名作为路径段（URL 编码），无名称时回退到首页平台区块。
 * 与 pages/platform/[platform] 一一对应。
 */
export function platformHref(name) {
  const n = typeof name === 'string' ? name.trim() : ''
  return n ? `/platform/${encodeURIComponent(n)}` : '/#platforms'
}

/** 128K+ 筛选阈值（原设计 131072） */
export const BIG_CONTEXT = 131072

const asList = models => (Array.isArray(models) ? models.filter(m => m && typeof m === 'object') : [])

/** 标签字段归一：数组或逗号字符串 → 去空白/去重字符串数组（坏值丢弃） */
const asStringList = value => {
  const raw = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(',')
      : []
  const out = []
  for (const item of raw) {
    if (typeof item !== 'string') continue
    const s = item.trim()
    if (!s || s === '__NO__' || out.includes(s)) continue
    out.push(s)
  }
  return out
}

/** 模型行的列表展示名（name → id → href 兜底，避免排序/筛选读到 undefined） */
const modelName = m => String(m.name || m.id || m.href || '')

/**
 * 供应商（provider）去重列表，保持出现顺序（原设计 new Set(data.map(m => m.provider))）
 * @returns {string[]}
 */
export function providersOf(models) {
  const out = []
  for (const m of asList(models)) {
    const provider = typeof m.provider === 'string' ? m.provider.trim() : ''
    if (provider && !out.includes(provider)) out.push(provider)
  }
  return out
}

/** 可选供应商 chips：全部 + 真实供应商（原设计 `['全部', ...new Set(...)]`） */
export function providerOptions(models) {
  return [ALL_PROVIDERS, ...providersOf(models)]
}

/** 平台 → 收录模型数（原设计排序 'providers' 用的 cnt 表） */
function platformCounts(models) {
  const cnt = Object.create(null)
  for (const m of asList(models)) {
    for (const p of Array.isArray(m.platforms) ? m.platforms : []) {
      const name = typeof p === 'string' ? p.trim() : ''
      if (name) cnt[name] = (cnt[name] || 0) + 1
    }
  }
  return cnt
}

/** 单个模型的“平台热度”= 其平台各收录数之和（原设计排序算法） */
function platformScore(model, cnt) {
  const platforms = Array.isArray(model.platforms) ? model.platforms : []
  return platforms.reduce((sum, p) => sum + (cnt[p] || 0), 0)
}

/**
 * 该模型已收录的免费提供商（渠道）数——与卡片底栏「模型提供商 N」同源同口径。
 * @param {object} model
 * @returns {number}
 */
function providerCount(model) {
  return Array.isArray(model?.platforms) ? model.platforms.length : 0
}

/** 能力标签数量（视觉 / 工具 / 推理），用于「能力」列表头排序 */
function capabilityCount(model) {
  return ['vision', 'tools', 'reasoning'].reduce(
    (n, key) => n + (model?.[key] ? 1 : 0),
    0
  )
}

/** 数值归一：非有限值按 0（排序时缺失值排在最后而不是当成最大/最小乱序） */
const toSortNumber = v => (Number.isFinite(v) ? v : 0)

/**
 * 筛选 + 排序（纯函数，行为对齐原设计 page.jsx）
 * @param {Array} models adaptPosts 输出
 * @param {{kw?: string, filter?: string, provider?: string, sort?: string}} options
 * @returns {Array} 新数组（不修改入参顺序，不修改模型对象）
 */
export function filterAndSortModels(models, options = {}) {
  const list = asList(models)
  const kw = String(options.kw || '').trim().toLowerCase()
  const filter = options.filter || 'all'
  const provider = options.provider || ALL_PROVIDERS
  const sort = options.sort || 'default'

  let result = list.filter(m => {
    if (kw) {
      // 平台名（AMD / Kiraai…）也算命中：平台卡片与模型卡片共用同一个搜索框，
      // 输入平台名时用户期望看到「这个平台免费提供哪些模型」。
      const platforms = Array.isArray(m.platforms) ? m.platforms.join(' ') : ''
      const text = `${modelName(m)} ${m.provider || ''} ${m.id || ''} ${platforms}`.toLowerCase()
      if (!text.includes(kw)) return false
    }
    if (provider !== ALL_PROVIDERS && m.provider !== provider) return false
    if (filter === 'vision') return Boolean(m.vision)
    if (filter === 'tools') return Boolean(m.tools)
    if (filter === 'reasoning') return Boolean(m.reasoning)
    if (filter === 'big') return Number(m.context) >= BIG_CONTEXT
    return true
  })

  if (sort === 'providers') {
    const cnt = platformCounts(list)
    // 「供应商最多」以卡片显示的「模型提供商 N」为准（平台数降序）；
    // 平台数相同时再用平台热度分（各平台收录数之和）做次级排序，最后按名称稳定收尾。
    // 旧版仅按热度分排序，会出现「1 个提供商的模型排到 3 个提供商之前」的观感错误。
    result = [...result].sort((a, b) => {
      const byCount = providerCount(b) - providerCount(a)
      if (byCount !== 0) return byCount
      const byScore = platformScore(b, cnt) - platformScore(a, cnt)
      if (byScore !== 0) return byScore
      return modelName(a).localeCompare(modelName(b), 'en')
    })
  } else if (sort === 'az') {
    result = [...result].sort((a, b) => modelName(a).localeCompare(modelName(b), 'en'))
  }

  return result
}

/**
 * 平台卡片的关键词过滤（与模型库共用同一个搜索框）。
 * 匹配平台名 / 简介 / 网址，大小写不敏感；空关键词原样返回。
 * @param {Array} cards platformCards 输出
 * @param {string} kw
 * @returns {Array}
 */
export function filterPlatforms(cards, kw) {
  const list = Array.isArray(cards) ? cards.filter(c => c && typeof c === 'object') : []
  const key = String(kw || '').trim().toLowerCase()
  if (!key) return list
  return list.filter(c => {
    const text = `${c.name || ''} ${c.limits || ''} ${c.url || ''}`.toLowerCase()
    return text.includes(key)
  })
}

/**
 * 前端分页切片（纯函数）。
 * 页码越界时夹到有效范围内，避免筛选后 page 残留导致的空页。
 * @param {Array} items 已筛选/排序的列表
 * @param {number} page 1 起
 * @param {number} perPage 每页条数（<=0 视为不分页）
 * @returns {{items: Array, page: number, totalPage: number}}
 */
export function paginate(items, page, perPage) {
  const list = Array.isArray(items) ? items : []
  const size = Number(perPage) > 0 ? Math.floor(Number(perPage)) : 0
  if (!size) return { items: list, page: 1, totalPage: list.length ? 1 : 0 }
  const totalPage = Math.ceil(list.length / size)
  if (totalPage <= 0) return { items: [], page: 1, totalPage: 0 }
  const current = Math.min(Math.max(Number(page) || 1, 1), totalPage)
  const start = (current - 1) * size
  return { items: list.slice(start, start + size), page: current, totalPage }
}

/**
 * 表头排序（平台详情页「免费模型」表格，纯函数）。
 * 同值一律按名称升序收尾，保证排序结果稳定、不会随渲染顺序抖动。
 * @param {Array} models adaptPosts 输出
 * @param {'name'|'context'|'caps'|'providers'} key 列标识
 * @param {'asc'|'desc'} dir 方向
 * @returns {Array} 新数组；key 未知 → 原顺序副本（不修改入参）
 */
export function sortModelsBy(models, key, dir) {
  const list = asList(models)
  const compare = {
    name: (a, b) => modelName(a).localeCompare(modelName(b), 'en'),
    context: (a, b) => toSortNumber(a.context) - toSortNumber(b.context),
    caps: (a, b) => capabilityCount(a) - capabilityCount(b),
    providers: (a, b) => providerCount(a) - providerCount(b)
  }[key]
  if (!compare) return list.slice()
  const desc = dir === 'desc'
  return [...list].sort((a, b) => {
    const diff = compare(a, b)
    if (diff !== 0) return desc ? -diff : diff
    return modelName(a).localeCompare(modelName(b), 'en')
  })
}

/**
 * 表头排序状态机：点同一列按 首击方向 → 反向 → 恢复默认（原顺序）循环；
 * 点另一列则切到该列并采用其首击方向。
 * @param {{key: string, dir: string}|null} current 当前排序状态
 * @param {string} key 被点击的列标识
 * @returns {{key: string, dir: string}|null} 新的排序状态（null = 默认顺序）
 */
export function togglePlatformSort(current, key) {
  const column = PLATFORM_SORTS.find(c => c.key === key)
  if (!column) return null
  const other = column.first === 'asc' ? 'desc' : 'asc'
  if (!current || current.key !== key) return { key, dir: column.first }
  if (current.dir === column.first) return { key, dir: other }
  return null
}

/**
 * 平台卡片数据（由模型行 ext.platforms 派生）
 * 只输出可核实的字段：收录数、已核实模型数、最近核实日期、免费限制说明（取自模型行 limitsNote）
 *
 * 方案A：可选传入「平台档案」（type=Platform 行）——
 * 平台档案提供名称/简介/网址；收录数仍由模型行的 ext.platforms 统计。
 * 徽标文案由平台档案的「平台认证」标签驱动（选中「平台认证」→ 已认证），
 * 未配置认证的平台一律弱化为「待核实」；不再依赖模型行核实状态自动推算。
 * 未传 profiles 时行为与旧版完全一致（纯模型派生）。
 * @param {Array} models adaptPosts 输出
 * @param {Array} [profiles] 平台档案（normalizePlatformProfiles 输出或主库原始行）
 * @param {Object} [platformCounts] 服务端全量口径的「平台 → 模型数」（SiteDataApi
 *        collectFreetokenStats 下发）。首页 posts 会被 POSTS_PER_PAGE 截断，
 *        此时模型派生计数会偏小，以该全量值为准；缺失/未下发时回退模型派生值。
 * @returns {Array<{name: string, count: number, verifiedCount: number, verified: boolean,
 *                  certified: boolean, certifications: string[],
 *                  verifiedAt: string, limits: string, url: string}>}
 */
export function platformCards(models, profiles, platformCounts) {
  const map = new Map()
  for (const m of asList(models)) {
    const platforms = Array.isArray(m.platforms) ? m.platforms : []
    for (const raw of platforms) {
      const name = typeof raw === 'string' ? raw.trim() : ''
      if (!name) continue
      const card =
        map.get(name) ||
        {
          name,
          count: 0,
          verifiedCount: 0,
          verifiedAt: '',
          limits: '',
          url: '',
          certifications: []
        }
      card.count += 1
      if (m.verificationStatus === 'verified') {
        card.verifiedCount += 1
        if (typeof m.verifiedAt === 'string' && m.verifiedAt > card.verifiedAt) {
          card.verifiedAt = m.verifiedAt
        }
      }
      if (!card.limits && typeof m.limitsNote === 'string' && m.limitsNote) {
        card.limits = m.limitsNote
      }
      map.set(name, card)
    }
  }
  // 合并平台档案：补名称/简介/网址；无模型的平台档案也展示（count 0）
  const profileList = Array.isArray(profiles) ? profiles : []
  for (const p of profileList) {
    if (!p || typeof p !== 'object') continue
    const name = String(p.name || p.title || '').trim()
    if (!name) continue
    const card =
      map.get(name) ||
      {
        name,
        count: 0,
        verifiedCount: 0,
        verifiedAt: '',
        limits: '',
        url: '',
        certifications: []
      }
    const desc =
      typeof p.desc === 'string' && p.desc.trim()
        ? p.desc.trim()
        : typeof p['供应商简介'] === 'string'
          ? p['供应商简介'].trim()
          : ''
    const url =
      typeof p.url === 'string' && /^https?:\/\//i.test(p.url.trim())
        ? p.url.trim()
        : typeof p['网址'] === 'string' && /^https?:\/\//i.test(p['网址'].trim())
          ? p['网址'].trim()
          : ''
    if (!card.limits && desc) card.limits = desc
    if (!card.url && url) card.url = url
    const certifications = asStringList(
      p.certifications != null ? p.certifications : p['平台认证']
    )
    if (certifications.length) card.certifications = certifications
    map.set(name, card)
  }
  const fullCounts =
    platformCounts && typeof platformCounts === 'object' ? platformCounts : null
  return Array.from(map.values())
    .map(card => ({
      ...card,
      // 收录数优先用服务端全量口径（不受首页分页截断影响）；
      // 没有该平台记录时沿用模型派生值（兼容不传第三参的旧调用）。
      count:
        fullCounts && Number.isFinite(fullCounts[card.name])
          ? fullCounts[card.name]
          : card.count,
      // 认证标签驱动展示；未配置认证一律「待核实」（不再用模型行状态反推）。
      certified: card.certifications.length > 0,
      verified: card.certifications.length > 0
    }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'en'))
}

/**
 * 列表内最大上下文窗口（原设计统计条第 3 格 Math.max(...data.map(m => m.context))）
 * @returns {number} 无有效值时 0
 */
export function maxContext(models) {
  return asList(models).reduce(
    (max, m) => (Number.isFinite(m.context) && m.context > max ? m.context : max),
    0
  )
}

/** 最近一次核实日期（页脚「最近核实」；无记录返回 ''） */
export function latestVerifiedAt(models) {
  return asList(models).reduce(
    (latest, m) =>
      typeof m.verifiedAt === 'string' && m.verifiedAt > latest ? m.verifiedAt : latest,
    ''
  )
}

/**
 * 核实日期距今的天数（原设计 daysFrom：目标日期 - 今天，四舍五入；过去为负）
 * @param {string} dateStr 'YYYY-MM-DD'
 * @param {string|Date} [today]
 * @returns {number}
 */
export function daysFrom(dateStr, today) {
  if (typeof dateStr !== 'string' || !dateStr) return 0
  const target = Date.parse(dateStr)
  const base = today ? Date.parse(today instanceof Date ? today.toISOString() : today) : Date.now()
  if (!Number.isFinite(target) || !Number.isFinite(base)) return 0
  return Math.round((target - base) / 86400000)
}

/**
 * 渠道调用示例实际应使用的 API 模型 ID。
 * 站内详情页 slug 只用于路由，绝不能作为供应商 API 的 model 值。
 * @param {{modelId?: string}} row
 * @param {{modelId?: string}} model
 * @returns {string}
 */
export function resolveCurlModelId(row, model) {
  const normalize = value => (typeof value === 'string' ? value.trim() : '')
  return normalize(row?.modelId) || normalize(model?.modelId)
}

/**
 * 详情页 curl 示例（原设计 model/[slug]/page.jsx 同款拼装，Key 占位为 ***）
 * @param {{id?: string}} model
 * @param {string} apiBase OpenAI 兼容 base_url
 * @returns {string}
 */
export function buildCurl(model, apiBase) {
  const base = (apiBase || '').replace(/\/+$/, '') || 'https://openrouter.ai/api/v1'
  const id = model && model.id ? model.id : ''
  return [
    'curl ' + base + '/chat/completions \\',
    '  -H "Authorization: Bearer ***" \\',
    '  -H "Content-Type: application/json" \\',
    "  -d '{",
    '    "model": "' + id + '",',
    '    "messages": [',
    '      {"role": "user", "content": "Hello!"}',
    '    ]',
    "  }'"
  ].join('\n')
}

/**
 * 卡片/详情页的过期提示文案（原设计 mcard title 同口径）
 * @param {object} model
 * @param {string} [today]
 * @returns {string} 未过期返回 ''
 */
export function staleTitle(model, today) {
  if (!model) return ''
  const hint = model.expiresHint
  if (hint && daysFrom(hint, today) < 0) {
    return `截止提示 ${hint} 已过，可能已过期。请以官网为准`
  }
  if (model.verifiedAt && daysFrom(model.verifiedAt, today) < -30) {
    return `核实于 ${model.verifiedAt}，距今超 30 天，可能已过期。请以官网为准`
  }
  return ''
}

/** 详情页「免费获取渠道」行：平台名 + 该条目的核实状态 + 额度说明 + 前往来源 */
export function offerRows(model) {
  if (!model || !Array.isArray(model.platforms)) return []
  const verified = model.verificationStatus === 'verified'
  return model.platforms.map(name => ({
    name,
    verified,
    limits: model.limitsNote || '',
    verifiedAt: model.verifiedAt || '',
    url: model.sourceUrl || ''
  }))
}
