// FreeToken 站点适配层 — 模型聚合（移植自原项目 app/lib/merge.mjs 规则）
// 纯函数、幂等、不落库、不回写 Notion。官方链路一行一页不变（getPageProperties
// → allPages → 主题），本模块在主题层把同一 ext.modelId 的多行（多平台/多来源
// 供给记录）合并为一条模型记录。依据：docs/backend-plan-v1.md 第 3.2 / 4 节。
//
// 规则平移（与原 merge.mjs 口径一致）：
//   - ext.verificationStatus === 'duplicate' → 整行跳过（人工去重双保险）
//   - 无 modelId → 跳过（脏数据）
//   - status=Invisible 的平台合并行参与合并（数据源），仅不单独出现在结果中；
//     每个 modelId 最终输出一条，代表行信息取自 Published 行
//   - 平台并集（数组去重，保持出现顺序）；title 取代表行（Published 优先），
//     否则第一个非空；provider/sourceUrl 取第一个非空
//   - context 取最大；capabilities 逐键 OR；summary 取最长
//   - limitsNote 去重拼接 ' / '
//   - verificationStatus：任一 verified → verified（duplicate 行已被过滤）
//   - verifiedAt 取最新（ISO 日期字符串排序）；expiresHint = verifiedAt + 30 天
//     （派生，不入库）
//   - slug 兜底 slugify(modelId)（/ → --，与原项目 app/lib/models.js:12 一致）

'use strict'

const { standardPage } = require('./adapt')

/**
 * 日期 + N 天，UTC 安全派生（避免本地时区 toISOString 偏移导致跨日差一天）；
 * 无效输入返回 ''。
 */
function addDays(dateStr, days) {
  if (typeof dateStr !== 'string') return ''
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr)
  if (!m) return ''
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])))
  if (isNaN(d.getTime())) return ''
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/** 详情 URL slug 规则：/ → --（与原项目 app/lib/models.js:12 一致） */
function slugify(id) {
  return String(id).replaceAll('/', '--')
}

/** 限额说明去重拼接（' / ' 分隔为站点侧内存操作，不落库，无官方去空白坑） */
function mergeLimitsNote(acc, next) {
  const a = acc || ''
  const n = next || ''
  if (!n) return a
  if (!a) return n
  return a.split(' / ').includes(n) ? a : a + ' / ' + n
}

/** 同 modelId 的多行标准行 → 一条模型记录 */
function reduceModel(rows) {
  const first = rows[0]
  const acc = {
    modelId: first.modelId,
    title: first.title,
    provider: first.provider,
    platforms: [...first.platforms],
    context: first.context,
    capabilities: { ...first.capabilities },
    summary: first.summary,
    limitsNote: first.limitsNote,
    verificationStatus: first.verificationStatus,
    verifiedAt: first.verifiedAt,
    sourceUrl: first.sourceUrl,
    // 代表行页面信息（导航/详情链接用）
    pageId: first.pageId,
    slug: first.slug,
    href: first.href,
    status: first.status,
    category: [...first.category],
    tags: [...first.tags],
    date: first.date
  }
  for (const r of rows.slice(1)) {
    // 平台并集（去重）
    for (const p of r.platforms) {
      if (!acc.platforms.includes(p)) acc.platforms.push(p)
    }
    // title 取代表行（Published 行覆盖），否则第一个非空
    if (r.status === 'Published' && r.title) {
      acc.title = r.title
    } else {
      acc.title = acc.title || r.title
    }
    acc.provider = acc.provider || r.provider
    acc.context = Math.max(acc.context, r.context)
    for (const key of Object.keys(acc.capabilities)) {
      acc.capabilities[key] = acc.capabilities[key] || r.capabilities[key]
    }
    if (r.summary.length > acc.summary.length) acc.summary = r.summary
    acc.limitsNote = mergeLimitsNote(acc.limitsNote, r.limitsNote)
    if (r.verificationStatus === 'verified') acc.verificationStatus = 'verified'
    acc.verifiedAt =
      [acc.verifiedAt, r.verifiedAt].filter(Boolean).sort().pop() || acc.verifiedAt
    acc.sourceUrl = acc.sourceUrl || r.sourceUrl
    // 代表行页面信息：Published 行优先（Invisible 合并行不覆盖）
    if (r.status === 'Published') {
      acc.pageId = r.pageId
      acc.slug = r.slug
      acc.href = r.href
      acc.status = r.status
      acc.category = [...r.category]
      acc.tags = [...r.tags]
      acc.date = r.date
    }
  }
  return acc
}

/**
 * 聚合 allPages → 模型数组（每个 modelId 一条，保持首见顺序）。
 * @param {Array} allPages 官方 allPages 摘要行（含 ext）
 * @returns {Array} 合并后的模型数组
 */
function mergeModelPages(allPages) {
  if (!Array.isArray(allPages)) return []
  const byModelId = new Map()
  const order = []
  for (const page of allPages) {
    const row = standardPage(page)
    if (!row || !row.modelId || row.verificationStatus === 'duplicate') continue
    if (!byModelId.has(row.modelId)) {
      byModelId.set(row.modelId, [row])
      order.push(row.modelId)
    } else {
      byModelId.get(row.modelId).push(row)
    }
  }
  return order.map(id => {
    const acc = reduceModel(byModelId.get(id))
    const slug = acc.slug || slugify(acc.modelId)
    return {
      modelId: acc.modelId,
      title: acc.title || acc.modelId,
      provider: acc.provider,
      platforms: acc.platforms,
      context: acc.context,
      capabilities: acc.capabilities,
      summary: acc.summary,
      limitsNote: acc.limitsNote,
      verificationStatus: acc.verificationStatus,
      verifiedAt: acc.verifiedAt,
      expiresHint: addDays(acc.verifiedAt, 30), // 派生，不入库
      sourceUrl: acc.sourceUrl,
      pageId: acc.pageId,
      slug,
      href: acc.href || slug,
      status: acc.status,
      category: acc.category,
      tags: acc.tags,
      date: acc.date
    }
  })
}

module.exports = { addDays, slugify, mergeModelPages }
