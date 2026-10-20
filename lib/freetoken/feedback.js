/**
 * FreeTokenHub 用户反馈的核心校验与 Notion 属性映射。
 *
 * 与「反馈库」的列约定一一对应：
 *   反馈标题 title / 反馈类型 select / 对象类型 select / 对象名称 rich_text
 *   问题说明 rich_text / 页面地址 url / 电子邮件 email（选填）
 * 服务端 API 与反馈页共用这一份定义，避免前后端枚举漂移。
 */

export const FEEDBACK_TYPES = ['额度或信息过期', '信息错误', '链接失效', '其他']

export const FEEDBACK_OBJECT_TYPES = ['模型', '平台', '站点']

const MAX_TITLE = 120
const MAX_OBJECT_NAME = 120
const MAX_DESCRIPTION = 2000
const MAX_EMAIL = 200

const asText = (value, maxLength) =>
  typeof value === 'string' ? value.trim().slice(0, maxLength) : ''

const isOneOf = (value, list) =>
  typeof value === 'string' && list.includes(value.trim())

const isUrl = value => {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch (e) {
    return false
  }
}

const isEmail = value =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= MAX_EMAIL

/**
 * 规范化并校验前端提交。
 * 返回 { ok: true, value } 或 { ok: false, error }。
 */
export function validateFeedbackPayload(input) {
  const body = input && typeof input === 'object' ? input : {}

  if (body.website) {
    // honeypot：机器人填了隐藏网站字段，假装成功但不写入
    return { ok: true, spam: true }
  }

  const type = asText(body.type, 32)
  const objectType = asText(body.objectType, 16)
  const title = asText(body.title, MAX_TITLE)
  const objectName = asText(body.objectName, MAX_OBJECT_NAME)
  const description = asText(body.description, MAX_DESCRIPTION)
  const pageUrl = asText(body.pageUrl, 500)
  const email = asText(body.email, MAX_EMAIL)

  if (!isOneOf(type, FEEDBACK_TYPES)) {
    return { ok: false, error: '请选择有效的反馈类型' }
  }
  if (!isOneOf(objectType, FEEDBACK_OBJECT_TYPES)) {
    return { ok: false, error: '请选择有效的对象类型' }
  }
  if (!objectName) {
    return { ok: false, error: '请填写对象名称' }
  }
  if (!description || description.length < 2) {
    return { ok: false, error: '请填写问题说明' }
  }
  if (!isUrl(pageUrl)) {
    return { ok: false, error: '请填写正确的页面地址' }
  }
  if (email && !isEmail(email)) {
    return { ok: false, error: '请填写正确的电子邮件' }
  }

  return {
    ok: true,
    value: {
      title: title || `${type}：${objectName}`,
      type,
      objectType,
      objectName,
      description,
      pageUrl,
      email: email || ''
    }
  }
}

/** 把经校验的反馈记录映射为 Notion pages.create 的属性对象 */
export function buildFeedbackProperties(value) {
  const title =
    typeof value?.title === 'string' && value.title.trim()
      ? value.title.trim().slice(0, MAX_TITLE)
      : `${value.objectType}反馈：${value.objectName}`

  const properties = {
    反馈标题: { title: [{ text: { content: title } }] },
    反馈类型: { select: { name: value.type } },
    对象类型: { select: { name: value.objectType } },
    对象名称: { rich_text: [{ text: { content: value.objectName } }] },
    问题说明: { rich_text: [{ text: { content: value.description } }] },
    页面地址: { url: value.pageUrl }
  }

  if (value.email) {
    properties.电子邮件 = { email: value.email }
  }

  return properties
}

/**
 * 生成反馈页预填链接。pageUrl 可为相对路径（例如 /article/deepseek-v4），
 * 页面在浏览器端会补成完整地址。
 */
export function buildFeedbackHref({
  type,
  objectType,
  objectName,
  pageUrl,
  title
}) {
  const search = new URLSearchParams()
  if (type) search.set('type', type)
  if (objectType) search.set('objectType', objectType)
  if (objectName) search.set('objectName', objectName)
  if (title) search.set('title', title)
  if (pageUrl) search.set('pageUrl', pageUrl)

  const query = search.toString()
  return query ? `/feedback?${query}` : '/feedback'
}
