// FreeToken 站点适配层 — 首页聚合（服务端全量口径，纯函数，零依赖）
//
// 为什么存在：首页 posts 会被 pages/index.js 按 POSTS_PER_PAGE 截断（默认 12）。
// 若前端拿截断后的列表做统计，平台卡片「N 个模型」与统计条「免费模型·已收录」
// 会少算（实测 Apinex 实际 7 条、首页只数到 5）。这里在数据层用「全量已发布模型」
// 先算好一次随 pageProps 下发，前端只读结果，天然不受分页影响。
//
// 口径与主题侧保持一致（themes/freetoken/lib/modelView.js、adaptModel.js）：
//   - 只统计 type=Post && status=Published 的行（Invisible 与其它 type 不计）
//   - 平台名取 ext.platforms（数组或逗号/顿号分隔字符串），去空去重、按原样分组
//   - 上下文按「上下文」属性读取（K 语义：<4096 视为 K 数 ×1024，>=4096 视为 tokens 原值）
// 坏值一律忽略，不抛异常。

'use strict'

const { toPlatformArray } = require('./adapt')

/** >= 该值视为 tokens 原值，否则视为 K 数（与 adaptModel.resolveContext 同口径） */
const CONTEXT_AS_TOKEN_THRESHOLD = 4096

/** 属性值（number / 数字字符串 / 数组）→ 有限正数，其余 → 0 */
function toPositiveNumber(v) {
  if (Array.isArray(v)) {
    for (const item of v) {
      const n = toPositiveNumber(item)
      if (n > 0) return n
    }
    return 0
  }
  if (typeof v === 'number') return Number.isFinite(v) && v > 0 ? v : 0
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v)
    return Number.isFinite(n) && n > 0 ? n : 0
  }
  return 0
}

/**
 * 上下文窗口归一化（统一输出 tokens 数）。
 * 与 themes/freetoken/lib/adaptModel.js resolveContext 同一口径，勿单独改一边。
 */
function resolveContext(page, ext) {
  const raw = toPositiveNumber(page['上下文']) || toPositiveNumber(page.context)
  if (raw > 0) return raw < CONTEXT_AS_TOKEN_THRESHOLD ? raw * 1024 : raw
  return toPositiveNumber(ext.context)
}

/** ext → 对象；数组/标量/坏值 → {} */
function toExtObject(ext) {
  return ext && typeof ext === 'object' && !Array.isArray(ext) ? ext : {}
}

/**
 * 首页聚合（全量口径）。
 * @param {Array} pages allPages（未截断；函数内部自行筛出已发布模型行）
 * @returns {{modelCount: number, maxContext: number, platformCounts: Record<string, number>}}
 *          platformCounts 键为 ext.platforms 里的平台名（trim 后原样，大小写敏感）
 */
function collectFreetokenStats(pages) {
  const platformCounts = {}
  let modelCount = 0
  let maxContext = 0
  for (const page of Array.isArray(pages) ? pages : []) {
    if (!page || typeof page !== 'object') continue
    if (page.type !== 'Post' || page.status !== 'Published') continue
    modelCount += 1
    const ext = toExtObject(page.ext)
    const ctx = resolveContext(page, ext)
    if (ctx > maxContext) maxContext = ctx
    for (const name of toPlatformArray(ext.platforms)) {
      platformCounts[name] = (platformCounts[name] || 0) + 1
    }
  }
  return { modelCount, maxContext, platformCounts }
}

module.exports = { collectFreetokenStats }
