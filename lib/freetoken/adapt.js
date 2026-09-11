// FreeToken 站点适配层 — ext 兜底解析、字段校验与降级（纯函数，无副作用）
// 契约依据：docs/backend-plan-v1.md 第 3.4 节 ext 契约与第 7 节风险缓解。
//
// 官方 getPageProperties.convertToJSON 会先去除全部空白再 JSON.parse，
// 失败降级 {}（lib/db/notion/getPageProperties.js:135-146）。本模块在站点侧
// 做二次兜底，保证主题层消费到的 ext 永远满足业务 schema：
//   - parseExt    容忍官方已解析对象直通 / 原始 JSON 字符串（先原样 parse，
//                 失败后复刻官方去空白路径重试）/ 坏值 → {}，绝不抛异常
//   - normalizeExt 逐字段类型校验，坏值降级到安全默认（context 非数→0、
//                 能力非对象→全 false、verifiedAt 非法→''、状态未知值→pending）
//   - standardPage 官方 allPages 摘要行 → 合并层使用的标准行（null 入参返回 null）
//
// expiresHint 为派生字段不入库（见 merge.js addDays），本模块不产出。

'use strict'

const CAPABILITY_KEYS = ['vision', 'tools', 'reasoning']
const VERIFICATION_STATUSES = ['verified', 'pending', 'duplicate']
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

/** 校验 'YYYY-MM-DD' 是否为真实存在的日期 */
function isValidDateStr(s) {
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
 * ext 兜底解析：兼容官方已解析对象与原始 JSON 字符串。
 * 字符串先按原样 parse（保留字符串值内空格）；失败后复刻官方 convertToJSON
 * 的去空白路径重试；全部失败返回 {}（与官方降级行为一致，不抛异常）。
 * 关键门禁：JSON.parse 成功但结果为 null/数组/标量（如 'null'、'[]'、'"x"'、
 * 42、true）同样不是合法 ext 对象，必须降级 {}——否则 normalizeExt 里
 * raw.modelId 会在 null 上崩溃（QA 阻塞项 #1）。
 * @param {unknown} raw
 * @returns {object}
 */
function parseExt(raw) {
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

function toNonEmptyString(v) {
  return typeof v === 'string' ? v.trim() : ''
}

/** 数值字段降级：有限数字或数字字符串 → number，否则 0 */
function toFiniteNumber(v) {
  if (typeof v === 'number') return Number.isFinite(v) && v >= 0 ? v : 0
  if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) {
    const n = Number(v)
    return n >= 0 ? n : 0
  }
  return 0
}

/** 平台字段：数组 / 逗号顿号分隔字符串 → 去重去空字符串数组（保持出现顺序） */
function toPlatformArray(v) {
  const list = Array.isArray(v) ? v : toNonEmptyString(v).split(/[,，、]/)
  const out = []
  for (const item of list) {
    if (typeof item !== 'string') continue
    const t = item.trim()
    if (t && !out.includes(t)) out.push(t)
  }
  return out
}

/** 严格布尔归一化（QA 阻塞项 #2）：仅 true/false 布尔与 'true'/'false'
 * 字符串（trim 后精确小写匹配）映射为布尔；其余任何值（1/0/'yes'/'no'/对象）
 * 一律 false——Boolean("false") === true 的坑不允许出现。 */
function toStrictBoolean(v) {
  if (typeof v === 'boolean') return v
  if (typeof v === 'string') {
    const s = v.trim().toLowerCase()
    if (s === 'true') return true
    if (s === 'false') return false
  }
  return false
}

/** capabilities 对象逐键严格布尔化；非对象 → 全 false */
function normalizeCapabilities(v) {
  const src = v && typeof v === 'object' && !Array.isArray(v) ? v : {}
  const out = {}
  for (const key of CAPABILITY_KEYS) out[key] = toStrictBoolean(src[key])
  return out
}

/** verificationStatus 枚举校验，未知值（含中文旧值）降级 'pending' */
function normalizeVerificationStatus(v) {
  const s = toNonEmptyString(v)
  return VERIFICATION_STATUSES.includes(s) ? s : 'pending'
}

/** sourceUrl 仅保留 http(s) 链接 */
function normalizeSourceUrl(v) {
  const s = toNonEmptyString(v)
  return /^https?:\/\//i.test(s) ? s : ''
}

/**
 * 规范化 ext：字段校验与降级（坏值不炸站，全部落到安全默认）。
 * @param {unknown} ext 官方已解析对象 / 原始 JSON 字符串 / 空值
 * @returns {object}
 */
function normalizeExt(ext) {
  // 双保险：parseExt 已保证对象，此处再防御 null/数组/标量直入（QA 阻塞项 #1）
  const parsed = parseExt(ext)
  const raw =
    parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
  return {
    modelId: toNonEmptyString(raw.modelId) || null,
    provider: toNonEmptyString(raw.provider),
    platforms: toPlatformArray(raw.platforms),
    context: toFiniteNumber(raw.context),
    capabilities: normalizeCapabilities(raw.capabilities),
    limitsNote: toNonEmptyString(raw.limitsNote),
    verifiedAt: isValidDateStr(raw.verifiedAt) ? raw.verifiedAt : '',
    verificationStatus: normalizeVerificationStatus(raw.verificationStatus),
    sourceUrl: normalizeSourceUrl(raw.sourceUrl)
  }
}

/**
 * 标准页面解析：官方 allPages 摘要行 → 合并层使用的标准行。
 * @param {object|null|undefined} page 官方 getPageProperties/adjustPageProperties 输出
 * @returns {object|null} page 无效时返回 null（调用方过滤）
 */
function standardPage(page) {
  if (!page || typeof page !== 'object') return null
  const ext = normalizeExt(page.ext)
  return {
    pageId: toNonEmptyString(page.id),
    title: toNonEmptyString(page.title),
    summary: toNonEmptyString(page.summary),
    slug: toNonEmptyString(page.slug),
    href: toNonEmptyString(page.href),
    status: toNonEmptyString(page.status),
    type: toNonEmptyString(page.type),
    category: Array.isArray(page.category)
      ? page.category.filter(c => typeof c === 'string')
      : [],
    tags: Array.isArray(page.tags) ? page.tags.filter(t => typeof t === 'string') : [],
    date: page.date && typeof page.date === 'object' ? page.date : {},
    ext,
    // 合并规则直接消费的别名（与 ext 同源）
    modelId: ext.modelId,
    provider: ext.provider,
    platforms: ext.platforms,
    context: ext.context,
    capabilities: ext.capabilities,
    limitsNote: ext.limitsNote,
    verificationStatus: ext.verificationStatus,
    verifiedAt: ext.verifiedAt,
    sourceUrl: ext.sourceUrl
  }
}

module.exports = { parseExt, normalizeExt, standardPage, isValidDateStr, toPlatformArray }
