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

/** 供应商筛选的「全部」项（原设计字面量） */
export const ALL_PROVIDERS = '全部'

/** 128K+ 筛选阈值（原设计 131072） */
export const BIG_CONTEXT = 131072

const asList = models => (Array.isArray(models) ? models.filter(m => m && typeof m === 'object') : [])

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
      const text = `${modelName(m)} ${m.provider || ''} ${m.id || ''}`.toLowerCase()
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
    result = [...result].sort((a, b) => platformScore(b, cnt) - platformScore(a, cnt))
  } else if (sort === 'az') {
    result = [...result].sort((a, b) => modelName(a).localeCompare(modelName(b), 'en'))
  }

  return result
}

/**
 * 平台卡片数据（由模型行 ext.platforms 派生）
 * 只输出可核实的字段：收录数、已核实模型数、最近核实日期、免费限制说明（取自模型行 limitsNote）
 * @returns {Array<{name: string, count: number, verifiedCount: number, verified: boolean,
 *                  verifiedAt: string, limits: string}>}
 */
export function platformCards(models) {
  const map = new Map()
  for (const m of asList(models)) {
    const platforms = Array.isArray(m.platforms) ? m.platforms : []
    for (const raw of platforms) {
      const name = typeof raw === 'string' ? raw.trim() : ''
      if (!name) continue
      const card =
        map.get(name) ||
        { name, count: 0, verifiedCount: 0, verifiedAt: '', limits: '' }
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
  return Array.from(map.values())
    .map(card => ({ ...card, verified: card.count > 0 && card.verifiedCount === card.count }))
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
