/**
 * Freetoken 主题适配边界（阶段 2：严格解析，纯函数）
 *
 * 输入：NotionNext 官方已发布 post 摘要（SiteDataApi 注入的 posts/allNavPages 行），
 *       业务字段统一放在 Notion 单一 `ext` JSON 列。
 * 输出：主题内部消费的模型对象 —— 任何坏值都降级到安全默认，绝不抛异常。
 *
 * 严格规则（与 lib/freetoken/adapt.js 的后端契约保持同一口径）：
 *   - verificationStatus：仅 verified/pending/duplicate 三个枚举值，缺失或未知一律 pending
 *   - capabilities：严格布尔，仅 true/false 与 "true"/"false"（trim 后小写精确匹配），其余 false
 *   - platforms：数组或逗号/顿号分隔字符串 → 去空去重（保持出现顺序）
 *   - context：有限正数，否则 0
 *   - sourceUrl：仅 http(s) 链接，否则 ''
 *   - href：保留官方 post.href 原值，不自行 slugify
 *
 * 只适配一次：adaptPost 用 WeakMap 记忆化（同一 post 对象只解析一次），
 * 适配结果带不可枚举标记 __ftAdaptedModel，重复传入已适配对象直接返回自身。
 * 输入对象视为不可变（NotionNext props 语义）。
 */

/** 复核窗口（天），与 CONFIG.FREETOKEN_EXPIRY_DAYS 保持一致 */
const REVIEW_WINDOW_DAYS = 30

const VERIFICATION_STATUSES = ['verified', 'pending', 'duplicate']
const CAPABILITY_KEYS = ['vision', 'tools', 'reasoning']
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const ADAPTED_FLAG = '__ftAdaptedModel'

/** 已适配结果的 WeakMap 记忆化缓存（key = 原始 post 对象） */
const ADAPTED_CACHE = new WeakMap()

/** 状态展示文案 */
const VERIFICATION_LABELS = {
  verified: '已核实',
  pending: '待核实',
  duplicate: '重复'
}

/** 'YYYY-MM-DD' 是否为真实存在的日期（拒绝 2026-02-31 这类假日期） */
export function isValidDateStr(s) {
  if (typeof s !== 'string' || !DATE_RE.test(s)) return false
  const [y, m, d] = s.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  )
}

/**
 * Date / 'YYYY-MM-DD' 字符串 → 'YYYY-MM-DD'（本地日历日，避免时区偏移）；
 * 其余任何值 → ''（不抛异常）
 */
export function toDateStr(v) {
  if (v instanceof Date && !isNaN(v.getTime())) {
    const y = String(v.getFullYear()).padStart(4, '0')
    const m = String(v.getMonth() + 1).padStart(2, '0')
    const d = String(v.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }
  if (typeof v === 'string') {
    const m = /^\d{4}-\d{2}-\d{2}/.exec(v.trim())
    return m && isValidDateStr(m[0]) ? m[0] : ''
  }
  return ''
}

/** 日期字符串加天数（UTC 计算），非法输入返回 '' */
export function addDays(dateStr, days) {
  if (!isValidDateStr(dateStr) || !Number.isFinite(days)) return ''
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d + days))
  return dt.toISOString().slice(0, 10)
}

/** 严格布尔：仅 true/false 与 "true"/"false"（trim 小写），其余一律 false */
export function toStrictBoolean(v) {
  if (typeof v === 'boolean') return v
  if (typeof v === 'string') {
    const s = v.trim().toLowerCase()
    if (s === 'true') return true
    if (s === 'false') return false
  }
  return false
}

/** 非空字符串（trim），其余 → '' */
function toNonEmptyString(v) {
  return typeof v === 'string' ? v.trim() : ''
}

/** 有限正数 → number，其余（0/负数/NaN/Infinity/非数字字符串）→ 0 */
function toFinitePositiveNumber(v) {
  if (typeof v === 'number') return Number.isFinite(v) && v > 0 ? v : 0
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v)
    return Number.isFinite(n) && n > 0 ? n : 0
  }
  return 0
}

/** platforms：数组或逗号/顿号分隔字符串 → 去空去重数组（保持出现顺序） */
export function toPlatformArray(v) {
  const list = Array.isArray(v)
    ? v
    : typeof v === 'string'
      ? v.split(/[,，、]/)
      : []
  const out = []
  for (const item of list) {
    if (typeof item !== 'string') continue
    const t = item.trim()
    if (t && !out.includes(t)) out.push(t)
  }
  return out
}

/** verificationStatus：枚举校验，缺失/未知 → pending */
export function normalizeVerificationStatus(v) {
  const s = toNonEmptyString(v).toLowerCase()
  return VERIFICATION_STATUSES.includes(s) ? s : 'pending'
}

/** sourceUrl：仅 http(s)，其余 → '' */
export function normalizeSourceUrl(v) {
  const s = toNonEmptyString(v)
  return /^https?:\/\//i.test(s) ? s : ''
}

/**
 * ext 兜底解析：兼容官方已解析对象与原始 JSON 字符串（官方 convertToJSON 失败降级 {}）。
 * 字符串 parse 成功但结果为 null/数组/标量同样不是合法 ext 对象 → {}。
 */
export function parseExt(raw) {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) return raw
  if (typeof raw === 'string' && raw.trim()) {
    try {
      const v = JSON.parse(raw)
      if (v && typeof v === 'object' && !Array.isArray(v)) return v
    } catch (e) {
      /* 尝试官方去空白路径 */
    }
    try {
      const v = JSON.parse(raw.replace(/\s/g, ''))
      if (v && typeof v === 'object' && !Array.isArray(v)) return v
    } catch (e) {
      /* 降级 */
    }
  }
  return {}
}

/** 空模型（非对象输入时的安全默认） */
function emptyModel() {
  const model = {
    id: '',
    name: '',
    provider: '',
    platforms: [],
    context: 0,
    capabilities: { vision: false, tools: false, reasoning: false },
    vision: false,
    tools: false,
    reasoning: false,
    desc: '',
    limitsNote: '',
    verifiedAt: '',
    expiresHint: '',
    verificationStatus: 'pending',
    sourceUrl: '',
    href: '',
    pageIcon: ''
  }
  Object.defineProperty(model, ADAPTED_FLAG, { value: true })
  return model
}

/**
 * 单个 post → 模型对象。同一 post 对象只适配一次（WeakMap 记忆化）。
 * @param {object} post 官方 post 摘要（含 ext）
 * @returns {object} 模型对象（坏值降级，绝不抛异常）
 */
export function adaptPost(post) {
  if (!post || typeof post !== 'object' || Array.isArray(post)) return emptyModel()
  if (post[ADAPTED_FLAG]) return post
  const cached = ADAPTED_CACHE.get(post)
  if (cached) return cached

  const ext = parseExt(post.ext)
  const capsRaw =
    ext.capabilities && typeof ext.capabilities === 'object' && !Array.isArray(ext.capabilities)
      ? ext.capabilities
      : {}
  const capabilities = {}
  for (const key of CAPABILITY_KEYS) {
    capabilities[key] = toStrictBoolean(capsRaw[key])
  }

  const model = {
    id: toNonEmptyString(post.slug) || toNonEmptyString(post.short_id) || toNonEmptyString(post.id),
    name: toNonEmptyString(post.title) || toNonEmptyString(post.name),
    provider: toNonEmptyString(ext.provider),
    platforms: toPlatformArray(ext.platforms),
    context: toFinitePositiveNumber(ext.context),
    capabilities,
    // 派生别名：卡片/筛选直接消费，避免到处写 capabilities.xxx
    vision: capabilities.vision,
    tools: capabilities.tools,
    reasoning: capabilities.reasoning,
    desc: toNonEmptyString(post.summary),
    limitsNote: toNonEmptyString(ext.limitsNote),
    verifiedAt: isValidDateStr(ext.verifiedAt) ? ext.verifiedAt : '',
    expiresHint: isValidDateStr(ext.expiresHint) ? ext.expiresHint : '',
    verificationStatus: normalizeVerificationStatus(ext.verificationStatus),
    sourceUrl: normalizeSourceUrl(ext.sourceUrl),
    // 保留官方 href（不重新 slugify），无值时由组件回退 '/'
    href: toNonEmptyString(post.href),
    pageIcon: toNonEmptyString(post.pageIcon) || toNonEmptyString(post.icon)
  }
  Object.defineProperty(model, ADAPTED_FLAG, { value: true })
  ADAPTED_CACHE.set(post, model)
  return model
}

/**
 * 列表适配：过滤无效项后逐个适配（每个 post 只适配一次）
 * @param {Array} posts
 * @returns {Array} 模型数组（非数组输入 → []）
 */
export function adaptPosts(posts) {
  if (!Array.isArray(posts)) return []
  return posts.filter(p => p && typeof p === 'object').map(adaptPost)
}

/** 状态文案 */
export function verificationLabel(status) {
  return VERIFICATION_LABELS[status] || VERIFICATION_LABELS.pending
}

/**
 * 是否已过期：expiresHint 早于 today（严格比较，等于今天不算过期）
 */
export function isExpired(model, today) {
  const t = toDateStr(today) || toDateStr(new Date())
  const hint = toDateStr(model?.expiresHint)
  return Boolean(t && hint && hint < t)
}

/**
 * 是否陈旧：已过期，或 verifiedAt 距今超过 expiryDays（默认 30 天）
 */
export function isStale(model, today, expiryDays = REVIEW_WINDOW_DAYS) {
  const t = toDateStr(today) || toDateStr(new Date())
  if (!t) return false
  if (isExpired(model, t)) return true
  const verified = toDateStr(model?.verifiedAt)
  if (!verified) return false
  return verified <= addDays(t, -Math.abs(expiryDays))
}

/**
 * 是否临近复核：
 *   - 有 expiresHint（有效日期）→ 已过期或 30 天内到期
 *   - 无 expiresHint 但有 verifiedAt → 距今超过 30 天未复核
 *   - 两者都无有效日期 → false（无从判定，由“待核实”状态表达）
 */
export function isReviewSoon(model, today, windowDays = REVIEW_WINDOW_DAYS) {
  const t = toDateStr(today) || toDateStr(new Date())
  if (!t) return false
  const window = Math.abs(windowDays)
  const hint = toDateStr(model?.expiresHint)
  if (hint) return hint <= addDays(t, window)
  const verified = toDateStr(model?.verifiedAt)
  if (verified) return verified <= addDays(t, -window)
  return false
}

/**
 * 统计聚合（纯函数，today 可注入便于测试）
 * @param {Array} models adaptPosts 输出
 * @param {string|Date} [today]
 * @returns {{modelCount: number, platformCount: number,
 *            capabilityCounts: {vision: number, tools: number, reasoning: number},
 *            reviewSoonCount: number}}
 */
export function statsFromModels(models, today) {
  const list = Array.isArray(models)
    ? models.filter(m => m && typeof m === 'object')
    : []
  const todayStr = toDateStr(today) || toDateStr(new Date())
  const platformSet = new Set()
  const capabilityCounts = { vision: 0, tools: 0, reasoning: 0 }
  let reviewSoonCount = 0

  for (const model of list) {
    for (const p of Array.isArray(model.platforms) ? model.platforms : []) {
      if (typeof p === 'string' && p.trim()) platformSet.add(p.trim())
    }
    const caps =
      model.capabilities && typeof model.capabilities === 'object'
        ? model.capabilities
        : {}
    for (const key of CAPABILITY_KEYS) {
      if (caps[key]) capabilityCounts[key]++
    }
    if (isReviewSoon(model, todayStr)) reviewSoonCount++
  }

  return {
    modelCount: list.length,
    platformCount: platformSet.size,
    capabilityCounts,
    reviewSoonCount
  }
}

/**
 * 平台并集汇总（模型行 ext.platforms → 去重平台 + 每个平台的模型数），按模型数降序
 * @returns {Array<{name: string, count: number}>}
 */
export function platformSummary(models) {
  const list = Array.isArray(models)
    ? models.filter(m => m && typeof m === 'object')
    : []
  const map = new Map()
  for (const model of list) {
    for (const p of Array.isArray(model.platforms) ? model.platforms : []) {
      if (typeof p !== 'string' || !p.trim()) continue
      const name = p.trim()
      map.set(name, (map.get(name) || 0) + 1)
    }
  }
  return Array.from(map, ([name, count]) => ({ name, count })).sort(
    (a, b) => b.count - a.count || a.name.localeCompare(b.name, 'en')
  )
}

/**
 * 上下文窗口展示：与原设计 `app/lib/shared.js` 同口径（1024 进制 → 256K / 500K / 1M / 1.5M）
 * 仅展示格式，不参与任何解析或校验
 */
export function fmtCtx(n) {
  if (!n || n <= 0) return '0'
  if (n >= 1000000) return (n / 1000000).toFixed(n % 1000000 ? 1 : 0) + 'M'
  return Math.round(n / 1024) + 'K'
}
