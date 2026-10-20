import {
  buildFeedbackHref,
  buildFeedbackProperties,
  validateFeedbackPayload
} from '@/lib/freetoken/feedback'

const valid = {
  type: '额度或信息过期',
  objectType: '模型',
  objectName: 'DeepSeek V4.1 Flash',
  description: '页面显示 1M 上下文，但平台现在只提供 128K。',
  pageUrl: 'https://www.freetok.org/article/deepseek-v4.1-flash',
  email: ''
}

describe('freetoken feedback', () => {
  test('accepts a valid payload and derives a title when omitted', () => {
    const result = validateFeedbackPayload(valid)
    expect(result.ok).toBe(true)
    expect(result.value).toMatchObject({
      ...valid,
      title: '额度或信息过期：DeepSeek V4.1 Flash'
    })
  })

  test('rejects invalid enums, object, description, URL and email', () => {
    expect(validateFeedbackPayload({ ...valid, type: '乱填' }).ok).toBe(false)
    expect(validateFeedbackPayload({ ...valid, objectType: '文章' }).ok).toBe(
      false
    )
    expect(validateFeedbackPayload({ ...valid, objectName: ' ' }).ok).toBe(
      false
    )
    expect(validateFeedbackPayload({ ...valid, description: ' ' }).ok).toBe(
      false
    )
    expect(
      validateFeedbackPayload({ ...valid, pageUrl: 'javascript:alert(1)' }).ok
    ).toBe(false)
    expect(
      validateFeedbackPayload({ ...valid, email: 'not-an-email' }).ok
    ).toBe(false)
  })

  test('honeypot submissions are acknowledged without a value', () => {
    expect(
      validateFeedbackPayload({ ...valid, website: 'https://spam.example' })
    ).toEqual({ ok: true, spam: true })
  })

  test('maps fields to the Notion feedback database schema', () => {
    const properties = buildFeedbackProperties({
      ...valid,
      title: '反馈标题',
      email: 'reader@example.com'
    })

    expect(properties.反馈标题.title[0].text.content).toBe('反馈标题')
    expect(properties.反馈类型.select.name).toBe('额度或信息过期')
    expect(properties.对象类型.select.name).toBe('模型')
    expect(properties.对象名称.rich_text[0].text.content).toBe(
      'DeepSeek V4.1 Flash'
    )
    expect(properties.问题说明.rich_text[0].text.content).toBe(
      valid.description
    )
    expect(properties.页面地址.url).toBe(valid.pageUrl)
    expect(properties.电子邮件.email).toBe('reader@example.com')
  })

  test('builds a prefilled internal feedback link', () => {
    expect(
      buildFeedbackHref({
        type: '信息错误',
        objectType: '平台',
        objectName: 'AMD',
        pageUrl: '/platform/AMD'
      })
    ).toBe(
      '/feedback?type=%E4%BF%A1%E6%81%AF%E9%94%99%E8%AF%AF&objectType=%E5%B9%B3%E5%8F%B0&objectName=AMD&pageUrl=%2Fplatform%2FAMD'
    )
  })
})
