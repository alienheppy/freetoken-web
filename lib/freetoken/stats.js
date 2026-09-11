// FreeToken 站点适配层 — 统计聚合（纯函数，today 可注入便于测试）
// 口径（docs/backend-plan-v1.md 第 5 节首期最小集）：
//   模型总数 / 平台总数（全模型 platforms 并集）/ 能力分布（视觉/工具/推理计数）
//   / 免费额度即将过期数（expiresHint 落在 [today, today+30天] 内）
// 不新增 API 路由、不落库、不加定时任务：数据量小（≤数千行），纯客户端聚合，
// 在主题首页组件内 useMemo 调用；如需 SSG 可把同一纯函数移到 getStaticProps 预计算。

'use strict'

const { addDays } = require('./merge')

const CAPABILITY_KEYS = ['vision', 'tools', 'reasoning']

/** Date / 'YYYY-MM-DD' 字符串 → 'YYYY-MM-DD'（无效返回 ''） */
function toDateStr(v) {
  if (v instanceof Date && !isNaN(v.getTime())) return v.toISOString().slice(0, 10)
  if (typeof v === 'string') {
    const m = /^\d{4}-\d{2}-\d{2}/.exec(v.trim())
    return m ? m[0] : ''
  }
  return ''
}

/**
 * 统计聚合（纯函数）。
 * @param {Array} models mergeModelPages 输出
 * @param {object} [options] { today: 'YYYY-MM-DD' | Date }，默认当前日期
 * @returns {{modelCount: number, platformCount: number,
 *            capabilityCounts: {vision: number, tools: number, reasoning: number},
 *            expiringSoon: number}}
 */
function statsFromModels(models, options) {
  const list = Array.isArray(models) ? models : []
  const today = toDateStr((options && (options.today || options.now)) || new Date())
  const horizon = today ? addDays(today, 30) : ''
  const platformSet = new Set()
  const capabilityCounts = { vision: 0, tools: 0, reasoning: 0 }
  let expiringSoon = 0
  for (const m of list) {
    if (!m || typeof m !== 'object') continue
    if (Array.isArray(m.platforms)) {
      for (const p of m.platforms) {
        if (typeof p === 'string' && p) platformSet.add(p)
      }
    }
    const caps = m.capabilities && typeof m.capabilities === 'object' ? m.capabilities : {}
    for (const key of CAPABILITY_KEYS) {
      if (caps[key]) capabilityCounts[key]++
    }
    const hint = typeof m.expiresHint === 'string' ? m.expiresHint : ''
    // 即将过期 = 未来 30 天内（含今天与第 30 天边界）；已过期与无派生值不计
    if (hint && today && horizon && hint >= today && hint <= horizon) expiringSoon++
  }
  return {
    modelCount: list.length,
    platformCount: platformSet.size,
    capabilityCounts,
    expiringSoon
  }
}

module.exports = { statsFromModels, toDateStr }
