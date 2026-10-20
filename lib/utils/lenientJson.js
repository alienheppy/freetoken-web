/**
 * 宽松 JSON 解析：先按标准 JSON.parse，失败后再做一次「只修复字符串内控制字符」的重试。
 *
 * 为什么需要：Notion 的 ext 字段偶尔会带未转义的换行（多行粘贴）。历史实现用
 * `str.replace(/\s/g, '')` 兜底，会连字符串内部的空格一起删掉，
 * 「GitHub Models」会被解析成「GitHubModels」，平台名因此匹配不上。
 *
 * 本实现只在字符串字面量内部转义换行/制表符等控制字符，字符串外的空白原样保留
 * （标准 JSON 本来就允许），因此不会改动任何业务文案。
 */

/** 是否为字符串字面量内部的控制字符（需要转义） */
function escapeChar(code) {
  switch (code) {
    case 0x0a:
      return '\\n'
    case 0x0d:
      return '\\r'
    case 0x09:
      return '\\t'
    case 0x08:
      return '\\b'
    case 0x0c:
      return '\\f'
    default:
      return `\\u${code.toString(16).padStart(4, '0')}`
  }
}

/**
 * 转义字符串字面量内部的裸控制字符；字符串外的字符完全不改。
 * @param {string} text
 * @returns {string}
 */
function escapeControlCharsInStrings(text) {
  let out = ''
  let inString = false
  let escaped = false

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]

    if (!inString) {
      if (ch === '"') inString = true
      out += ch
      continue
    }

    if (escaped) {
      out += ch
      escaped = false
      continue
    }

    if (ch === '\\') {
      out += ch
      escaped = true
      continue
    }

    if (ch === '"') {
      out += ch
      inString = false
      continue
    }

    const code = ch.charCodeAt(0)
    out += code < 0x20 ? escapeChar(code) : ch
  }

  return out
}

/**
 * @param {unknown} raw 原始 JSON 文本
 * @returns {unknown} 解析成功返回结果（可能是对象/数组/标量），失败返回 undefined
 */
function parseJsonLenient(raw) {
  if (typeof raw !== 'string') return undefined

  const text = raw.trim()
  if (!text) return undefined

  try {
    return JSON.parse(text)
  } catch (error) {
    // 落到下面的修复路径
  }

  const repaired = escapeControlCharsInStrings(text)
  if (repaired === text) return undefined

  try {
    return JSON.parse(repaired)
  } catch (error) {
    return undefined
  }
}

module.exports = { parseJsonLenient }
