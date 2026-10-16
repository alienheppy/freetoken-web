/**
 * 构建 / 导出阶段环境变量（Cloudflare Pages、慢速 Notion API 等）
 *
 * BUILD_PREFETCH_ENABLED          是否全量预热 block（export 默认 true；false 可跳过）
 * BUILD_PREFETCH_CONCURRENCY      预热并发（默认 8；慢环境建议 2–4）
 * NOTION_BUILD_RATE_MAX_PER_MINUTE  构建时限流：每分钟最大请求数（默认 50）
 * NOTION_BUILD_RATE_MIN_INTERVAL_MS 构建时限流：相邻请求最小间隔 ms（默认 300）
 * STATIC_PAGE_GENERATION_TIMEOUT  Next.js 单页 SSG 超时秒数（默认 300）
 * STATIC_PATHS_PRIORITY_ONLY      true = 只预生成前 10 篇（旧的省时行为）
 * STATIC_PATHS_MAX                预生成路径数上限（默认 0 = 不限制）
 */

let buildEnvLogged = false

function parsePositiveInt(value, fallback, { min = 1, max = Infinity } = {}) {
  const n = Number.parseInt(String(value ?? '').trim(), 10)
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, n))
}

function isTruthyEnv(value) {
  if (value === undefined || value === '') return true
  const v = String(value).trim().toLowerCase()
  if (['0', 'false', 'no', 'off', 'skip', 'disabled'].includes(v)) return false
  return true
}

function isBuildOrExport() {
  return process.env.BUILD_MODE === 'true' || process.env.EXPORT === 'true'
}

function isBuildPrefetchEnabled() {
  if (process.env.BUILD_PREFETCH_ENABLED === undefined) return false
  return isTruthyEnv(process.env.BUILD_PREFETCH_ENABLED)
}

function getBuildPrefetchConcurrency() {
  return parsePositiveInt(process.env.BUILD_PREFETCH_CONCURRENCY, 8, {
    min: 1,
    max: 32
  })
}

function getNotionBuildRateMaxPerMinute() {
  return parsePositiveInt(process.env.NOTION_BUILD_RATE_MAX_PER_MINUTE, 50, {
    min: 1,
    max: 600
  })
}

function getNotionBuildRateMinIntervalMs() {
  return parsePositiveInt(process.env.NOTION_BUILD_RATE_MIN_INTERVAL_MS, 300, {
    min: 0,
    max: 60_000
  })
}

function getStaticPageGenerationTimeoutSec() {
  return parsePositiveInt(process.env.STATIC_PAGE_GENERATION_TIMEOUT, 300, {
    min: 60,
    max: 3600
  })
}

/**
 * 是否只预生成「优先页面」（前 5 篇默认 + 最新 5 篇）。
 *
 * 默认 false：ISR 模式下把全部可路由页面都预生成。
 * 为什么改默认值：未预生成的页面走 `fallback: 'blocking'`，在冷 serverless 实例上
 * 要现场重建整站 Notion 数据（实测线上 296 秒），表现为「新访客第一次点模型卡片
 * 长时间无响应」；而预生成过的页面（如平台页）都是 CDN 命中、秒开。
 * 构建慢到不可接受时，可置 true 退回旧的省时行为。
 */
function isStaticPathsPriorityOnly() {
  if (process.env.STATIC_PATHS_PRIORITY_ONLY === undefined) return false
  const v = String(process.env.STATIC_PATHS_PRIORITY_ONLY).trim().toLowerCase()
  return ['1', 'true', 'yes', 'on'].includes(v)
}

/** 预生成路径数上限；0 / 空 = 不限制 */
function getStaticPathsMax() {
  return parsePositiveInt(process.env.STATIC_PATHS_MAX, 0, {
    min: 0,
    max: 100000
  })
}

function logBuildEnvSummary() {
  if (buildEnvLogged || !isBuildOrExport()) return
  buildEnvLogged = true
  console.log(
    '[BuildEnv]',
    JSON.stringify(
      {
        prefetchEnabled: isBuildPrefetchEnabled(),
        prefetchConcurrency: getBuildPrefetchConcurrency(),
        notionRateMaxPerMinute: getNotionBuildRateMaxPerMinute(),
        notionRateMinIntervalMs: getNotionBuildRateMinIntervalMs(),
        staticPageGenerationTimeoutSec: getStaticPageGenerationTimeoutSec(),
        staticPathsPriorityOnly: isStaticPathsPriorityOnly(),
        staticPathsMax: getStaticPathsMax()
      },
      null,
      0
    )
  )
}

module.exports = {
  isBuildPrefetchEnabled,
  getBuildPrefetchConcurrency,
  getNotionBuildRateMaxPerMinute,
  getNotionBuildRateMinIntervalMs,
  getStaticPageGenerationTimeoutSec,
  isStaticPathsPriorityOnly,
  getStaticPathsMax,
  logBuildEnvSummary
}
