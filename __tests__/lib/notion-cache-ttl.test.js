/**
 * @jest-environment node
 */

import fs from 'fs'
import os from 'os'
import path from 'path'

/**
 * Notion 派生缓存必须带有效期。
 *
 * 背景（线上实测）：模型页正文里那张渠道子表的行增删不会改动父页面的
 * lastEditedDate，而缓存键的版本取自 lastEditedDate，于是
 * page_block_<id>_<lastEditedDate> 永远不失效 —— Notion 里 6 个渠道，
 * 站点长期只显示 1 个。NOTION_DATA_CACHE_TTL_SECOND 给所有 Notion 派生缓存
 * （global_data_* / site_* / page_block_* / build_static_paths_*）加统一上限。
 */

const ENV_KEYS = [
  'NOTION_NEXT_NOTION_CACHE_DIR',
  'ENABLE_CACHE',
  'NOTION_DATA_CACHE_TTL_SECOND'
]

function snapshotEnv() {
  const saved = {}
  for (const key of ENV_KEYS) saved[key] = process.env[key]
  return saved
}

function restoreEnv(saved) {
  for (const key of ENV_KEYS) {
    if (saved[key] === undefined) delete process.env[key]
    else process.env[key] = saved[key]
  }
}

/** 在临时缓存目录下加载真实的 cache_manager（重置模块以读取新的环境变量） */
function loadCacheManager({ ttl } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'notionnext-cache-ttl-'))
  process.env.NOTION_NEXT_NOTION_CACHE_DIR = root
  process.env.ENABLE_CACHE = 'true'
  if (ttl === undefined) delete process.env.NOTION_DATA_CACHE_TTL_SECOND
  else process.env.NOTION_DATA_CACHE_TTL_SECOND = String(ttl)
  jest.resetModules()
  const mod = require('@/lib/cache/cache_manager')
  const dataDir = path.join(root, 'data')
  return { root, dataDir, mod }
}

function readSingleEntry(dataDir) {
  const files = fs.readdirSync(dataDir).filter(name => name.endsWith('.json'))
  expect(files).toHaveLength(1)
  const file = path.join(dataDir, files[0])
  return { file, entry: JSON.parse(fs.readFileSync(file, 'utf8')) }
}

describe('Notion 派生缓存有效期', () => {
  let savedEnv
  let roots

  beforeEach(() => {
    savedEnv = snapshotEnv()
    roots = []
  })

  afterEach(() => {
    restoreEnv(savedEnv)
    for (const root of roots.splice(0)) {
      fs.rmSync(root, { recursive: true, force: true })
    }
  })

  it('normalizeNotionCacheTtl：只接受正数，0/空/非法值 = 不设过期', () => {
    const { root, mod } = loadCacheManager()
    roots.push(root)
    const { normalizeNotionCacheTtl } = mod

    expect(normalizeNotionCacheTtl(300)).toBe(300)
    expect(normalizeNotionCacheTtl('60')).toBe(60)
    expect(normalizeNotionCacheTtl(1)).toBe(1)
    expect(normalizeNotionCacheTtl(0)).toBeNull()
    expect(normalizeNotionCacheTtl('0')).toBeNull()
    expect(normalizeNotionCacheTtl('')).toBeNull()
    expect(normalizeNotionCacheTtl(undefined)).toBeNull()
    expect(normalizeNotionCacheTtl(null)).toBeNull()
    expect(normalizeNotionCacheTtl(-5)).toBeNull()
    expect(normalizeNotionCacheTtl('abc')).toBeNull()
  })

  it('默认写入 300 秒有效期，命中缓存不重拉，过期后自动重拉', async () => {
    const { root, dataDir, mod } = loadCacheManager()
    roots.push(root)
    const { getOrSetDataWithCache } = mod

    let calls = 0
    const fetcher = async () => {
      calls++
      return { n: calls }
    }
    const key = 'page_block_demo-0000-1111-2222-333344445555_1792030627895'

    const before = Date.now()
    expect(await getOrSetDataWithCache(key, fetcher)).toEqual({ n: 1 })
    expect(calls).toBe(1)

    const { file, entry } = readSingleEntry(dataDir)
    expect(entry.key).toBe(key)
    expect(entry.expireTime).toBeGreaterThan(before)
    expect(entry.expireTime).toBeLessThanOrEqual(before + 300 * 1000 + 1000)

    // 未过期：直接命中缓存
    expect(await getOrSetDataWithCache(key, fetcher)).toEqual({ n: 1 })
    expect(calls).toBe(1)

    // 过期：重新拉取并重写有效期
    fs.writeFileSync(
      file,
      JSON.stringify({ ...entry, expireTime: Date.now() - 1000 })
    )
    expect(await getOrSetDataWithCache(key, fetcher)).toEqual({ n: 2 })
    expect(calls).toBe(2)

    const rewritten = readSingleEntry(dataDir).entry
    expect(rewritten.expireTime).toBeGreaterThan(Date.now())
  })

  it('NOTION_DATA_CACHE_TTL_SECOND=0 时保留旧的永不过期行为', async () => {
    const { root, dataDir, mod } = loadCacheManager({ ttl: 0 })
    roots.push(root)
    const { getOrSetDataWithCache } = mod

    await getOrSetDataWithCache('global_data_default_demo', async () => ({ ok: true }))

    const { entry } = readSingleEntry(dataDir)
    expect(entry.expireTime).toBeNull()
  })
})
