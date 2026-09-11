// FreeToken 适配层测试（node 原生运行，无需构建/网络/凭据/jest 依赖）
// 用法: node lib/freetoken/__tests__/run-tests.mjs
// 口径对齐原项目 app/scripts/test-merge.mjs 的场景，并扩展 adapt/stats 覆盖。
// fixture 为脱敏虚构数据，见 fixtures/freetoken-pages.json。
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { parseExt, normalizeExt, standardPage } from '../adapt.js'
import { addDays, slugify, mergeModelPages } from '../merge.js'
import { statsFromModels } from '../stats.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const fixture = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'fixtures', 'freetoken-pages.json'), 'utf8')
)

let pass = 0
let fail = 0
function check(name, cond, actual) {
  if (cond) {
    pass++
    console.log('  ok   ' + name)
  } else {
    fail++
    console.log('  FAIL ' + name + ' — got: ' + JSON.stringify(actual))
  }
}
function eq(a, b) {
  return JSON.stringify(a) === JSON.stringify(b)
}

console.log('== adapt：ext 兜底解析 ==')
check('对象直通（官方已解析）', eq(parseExt({ a: 1 }), { a: 1 }), parseExt({ a: 1 }))
check(
  '字符串正常 parse 且保留值内空格（比官方去空白更优）',
  eq(parseExt('{"limitsNote":"约 20 次"}'), { limitsNote: '约 20 次' }),
  parseExt('{"limitsNote":"约 20 次"}')
)
check(
  '字符串按官方去空白路径兜底',
  eq(parseExt('{ "modelId" : "demo/alpha" }'), { modelId: 'demo/alpha' }),
  parseExt('{ "modelId" : "demo/alpha" }')
)
check('坏 JSON 降级 {}', eq(parseExt('not-json{{{'), {}), parseExt('not-json{{{'))
check('空值降级 {}', eq(parseExt(null), {}) && eq(parseExt(undefined), {}), parseExt(null))
check('数字输入降级 {}', eq(parseExt(42), {}), parseExt(42))

console.log('== adapt：字段校验与降级 ==')
const bad = normalizeExt({
  modelId: '  ',
  provider: 7,
  platforms: 'A，B、C , A',
  context: 'abc',
  capabilities: 'yes',
  limitsNote: 5,
  verifiedAt: 'not-a-date',
  verificationStatus: '已核实',
  sourceUrl: 'ftp://x'
})
check('modelId 空白 → null', bad.modelId === null, bad.modelId)
check('provider 非字符串 → 空串', bad.provider === '', bad.provider)
check('platforms 字符串按逗号顿号切分并去重', eq(bad.platforms, ['A', 'B', 'C']), bad.platforms)
check('context 非数字 → 0', bad.context === 0, bad.context)
check('capabilities 非对象 → 全 false', eq(bad.capabilities, { vision: false, tools: false, reasoning: false }), bad.capabilities)
check('limitsNote 非字符串 → 空串', bad.limitsNote === '', bad.limitsNote)
check('verifiedAt 非法 → 空串', bad.verifiedAt === '', bad.verifiedAt)
check('verificationStatus 中文旧值 → pending', bad.verificationStatus === 'pending', bad.verificationStatus)
check('sourceUrl 非 http(s) → 空串', bad.sourceUrl === '', bad.sourceUrl)
check('不存在的日期 2026-02-30 → 空串', normalizeExt({ verifiedAt: '2026-02-30' }).verifiedAt === '', normalizeExt({ verifiedAt: '2026-02-30' }).verifiedAt)
check('context 数字字符串可解析', normalizeExt({ context: '131072' }).context === 131072, normalizeExt({ context: '131072' }).context)

console.log('== adapt：standardPage ==')
check('null 入参 → null', standardPage(null) === null, standardPage(null))
const empty = standardPage({})
check('空对象 → 全默认且 modelId=null', empty.modelId === null && empty.platforms.length === 0 && empty.context === 0, empty)

console.log('== merge：模型聚合（fixture 口径） ==')
const models = mergeModelPages(fixture.pages)
const byId = Object.fromEntries(models.map(m => [m.modelId, m]))
check('输出模型数 = 4（去重 + 跳过 duplicate/脏数据）', models.length === 4, models.length)
const alpha = byId['demo/alpha:free']
check('alpha 平台并集（FreeLLMAPI/OpenRouter/RawHub，重复去重）', eq(alpha.platforms, ['FreeLLMAPI', 'OpenRouter', 'RawHub']), alpha.platforms)
check('alpha 采用更长简介', alpha.summary.includes('更长'), alpha.summary)
check('alpha verificationStatus 升级为 verified', alpha.verificationStatus === 'verified', alpha.verificationStatus)
check('alpha verifiedAt 取最新', alpha.verifiedAt === '2026-09-09', alpha.verifiedAt)
check('alpha context 取最大', alpha.context === 262144, alpha.context)
check('alpha capabilities 逐键 OR', eq(alpha.capabilities, { vision: false, tools: true, reasoning: true }), alpha.capabilities)
check('alpha title 取代表行（Published 覆盖 Invisible 旧名称）', alpha.title === 'Demo Alpha', alpha.title)
check('alpha provider 取第一个非空', alpha.provider === 'Demo Provider', alpha.provider)
check('alpha limitsNote 去重拼接', alpha.limitsNote === '注册送额度 / 约20次/分·50次/天', alpha.limitsNote)
check('alpha slug 用代表行 slug', alpha.slug === 'demo--alpha--free', alpha.slug)
check('alpha ext 字符串行（RawHub）被兜底解析并合并', alpha.platforms.includes('RawHub'), null)
check('duplicate 行被跳过', !byId['demo/legacy'], null)
check('空 ext 脏数据行被跳过', !byId[''], null)
const beta = byId['demo/beta']
check('beta 精确合并为一条', models.filter(m => m.modelId === 'demo/beta').length === 1, null)
check('beta expiresHint 派生 = verifiedAt+30 天', beta.expiresHint === '2026-08-31', beta.expiresHint)
check('beta slug 兜底 slugify(modelId)', beta.slug === 'demo--beta', beta.slug)
const gamma = byId['demo/gamma']
check('gamma 坏值降级：context=0', gamma.context === 0, gamma.context)
check('gamma 坏值降级：capabilities 全 false', eq(gamma.capabilities, { vision: false, tools: false, reasoning: false }), gamma.capabilities)
check('gamma 坏值降级：verifiedAt 空 → expiresHint 空', gamma.verifiedAt === '' && gamma.expiresHint === '', gamma.expiresHint)
check('gamma 坏值降级：platforms 字符串切分', eq(gamma.platforms, ['OpenRouter', 'SiliconFlow']), gamma.platforms)
check('gamma 坏值降级：状态 pending', gamma.verificationStatus === 'pending', gamma.verificationStatus)
check('delta expiresHint 边界 2026-10-09', byId['demo/delta'].expiresHint === '2026-10-09', byId['demo/delta'].expiresHint)
check('delta title 保留', byId['demo/delta'].title === 'Demo Delta', byId['demo/delta'].title)

console.log('== merge：addDays / slugify ==')
check('addDays 2026-08-01 +30 = 2026-08-31', addDays('2026-08-01', 30) === '2026-08-31', addDays('2026-08-01', 30))
check('addDays 跨年 2026-12-15 +30 = 2027-01-14', addDays('2026-12-15', 30) === '2027-01-14', addDays('2026-12-15', 30))
check('addDays 空/非法输入 → 空串', addDays('', 30) === '' && addDays(null, 30) === '' && addDays('bad', 30) === '', null)
check('slugify / → --', slugify('demo/beta') === 'demo--beta', slugify('demo/beta'))
check('mergeModelPages 非数组 → []', mergeModelPages(null).length === 0, null)

console.log('== stats：统计聚合（today=2026-09-09 注入） ==')
const stats = statsFromModels(models, { today: '2026-09-09' })
check('modelCount = 4', stats.modelCount === 4, stats.modelCount)
check(
  'platformCount = 5（FreeLLMAPI/OpenRouter/RawHub/SiliconFlow/DemoHub 并集）',
  stats.platformCount === 5,
  stats.platformCount
)
check(
  'capabilityCounts = vision:1 tools:1 reasoning:2',
  eq(stats.capabilityCounts, { vision: 1, tools: 1, reasoning: 2 }),
  stats.capabilityCounts
)
check(
  'expiringSoon = 2（alpha/delta 在 30 天内；beta 已过期、gamma 无派生值）',
  stats.expiringSoon === 2,
  stats.expiringSoon
)
const statsNull = statsFromModels(null, { today: '2026-09-09' })
check('空输入 → 全 0', statsNull.modelCount === 0 && statsNull.platformCount === 0 && statsNull.expiringSoon === 0, statsNull)
const statsDate = statsFromModels(models, { today: new Date('2026-09-09T12:00:00+08:00') })
check('today 支持 Date 注入（同一口径）', statsDate.expiringSoon === 2, statsDate.expiringSoon)

console.log('')
console.log(fail === 0 ? 'ALL PASS (' + pass + ')' : 'FAILED (' + fail + ')')
process.exit(fail === 0 ? 0 : 1)
