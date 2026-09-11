/**
 * 将官方 NotionNext 的 post 对象映射为 Freetoken 业务模型
 * 业务字段优先从 ext JSON 中读取，解析失败时降级为空对象
 */

export function adaptModel(post) {
  const ext = safeExt(post?.ext)
  return {
    id: post?.slug || post?.short_id || post?.id || '',
    name: post?.title || '',
    provider: ext.provider || post?.category || '',
    platforms: normalizePlatforms(ext.platforms, post?.category, post?.tags),
    context: Number(ext.context) || 0,
    vision: Boolean(ext.capabilities?.vision),
    tools: Boolean(ext.capabilities?.tools),
    reasoning: Boolean(ext.capabilities?.reasoning),
    desc: post?.summary || '',
    limitsNote: ext.limitsNote || '',
    verifiedAt: ext.verifiedAt || '',
    expiresHint: ext.expiresHint || '',
    // 默认 pending（未标注=未核实），只有显式 verified 才视为已核实
    verificationStatus: ext.verificationStatus || 'pending',
    sourceUrl: ext.sourceUrl || '',
    href: post?.href || '',
    pageIcon: post?.pageIcon || ''
  }
}

export function isStale(m, expiryDays = 30) {
  if (m.expiresHint && new Date(m.expiresHint) < new Date()) return true
  if (m.verifiedAt) {
    const days = (new Date() - new Date(m.verifiedAt)) / 86400000
    return days > expiryDays
  }
  return false
}

export function fmtCtx(n) {
  if (!n || n <= 0) return '0'
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M'
  if (n >= 1000) return (n / 1000).toFixed(0) + 'K'
  return String(n)
}

function safeExt(raw) {
  if (!raw || typeof raw !== 'object') return {}
  return raw
}

function normalizePlatforms(platforms, category, tags) {
  if (Array.isArray(platforms) && platforms.length > 0) {
    return platforms.map(String).map(s => s.trim()).filter(Boolean)
  }
  if (typeof platforms === 'string' && platforms.trim()) {
    return platforms.split(/[,\uff0c\u3001]/).map(s => s.trim()).filter(Boolean)
  }
  const fromTags = Array.isArray(tags) ? tags : []
  const fromCategory = category ? [category] : []
  return fromCategory.length > 0 ? fromCategory : fromTags
}
