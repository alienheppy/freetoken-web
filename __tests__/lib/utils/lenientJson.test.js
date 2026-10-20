/**
 * @jest-environment node
 */

import { parseJsonLenient } from '@/lib/utils/lenientJson'

describe('parseJsonLenient', () => {
  it('保留字符串内的空格（审计第 3 条回归）', () => {
    const raw = '{"platforms":["GitHub Models","WorkBuddy 国际版"]}'
    expect(parseJsonLenient(raw)).toEqual({
      platforms: ['GitHub Models', 'WorkBuddy 国际版']
    })
  })

  it('保留字符串内的中文标点与多行文案', () => {
    const raw = '{"note":"支持文本、图像，\\n以及工具调用。"}'
    expect(parseJsonLenient(raw)).toEqual({
      note: '支持文本、图像，\n以及工具调用。'
    })
  })

  it('保留转义引号与制表符', () => {
    const raw = '{"title":"他说：\\"GitHub Models\\"\\t可用"}'
    expect(parseJsonLenient(raw)).toEqual({
      title: '他说："GitHub Models"\t可用'
    })
  })

  it('解析带缩进和换行的格式化 JSON', () => {
    const raw = '{\n  "modelId": "demo/alpha",\n  "context": 128000\n}'
    expect(parseJsonLenient(raw)).toEqual({
      modelId: 'demo/alpha',
      context: 128000
    })
  })

  it('仅修复字符串内未转义的控制字符，不删空格', () => {
    const raw = '{"name":"GitHub Models","note":"第一行\n第二行"}'
    expect(parseJsonLenient(raw)).toEqual({
      name: 'GitHub Models',
      note: '第一行\n第二行'
    })
  })

  it('非法 JSON 返回 undefined', () => {
    expect(parseJsonLenient('not-json{{{')).toBeUndefined()
    expect(parseJsonLenient('')).toBeUndefined()
    expect(parseJsonLenient(null)).toBeUndefined()
    expect(parseJsonLenient(42)).toBeUndefined()
  })
})
