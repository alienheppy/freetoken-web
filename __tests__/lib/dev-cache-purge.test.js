/**
 * @jest-environment node
 */

import fs from 'fs'
import os from 'os'
import path from 'path'

/**
 * next.config.js 在 dev 生命周期启动时会清掉「不会自我失效」的 Notion 派生缓存，
 * 保证每次 `yarn dev` 都重新拉取最新数据（见 next.config.js prepareDevNotionCache）。
 *
 * 这里用临时缓存目录直接加载真实 next.config.js，锁定两条不变量：
 *   1. 无版本键（global_data_* / site_* / build_static_paths_* / 无版本 page_block_*）被删除；
 *   2. page_block_<id>_<lastEditedDate> 只有带 TTL（expireTime）时保留 ——
 *      版本号只覆盖「页面本身被编辑」，渠道子表增删行不会改动父页面 lastEditedDate，
 *      没有 TTL 的历史条目可能永久陈旧，必须一并丢弃。
 */

function writeEntry(dataDir, fileName, key, expireTime = null) {
  fs.writeFileSync(
    path.join(dataDir, fileName),
    JSON.stringify({ key, expireTime, updatedAt: Date.now(), value: { ok: true } })
  )
}

/** 在临时缓存根下准备 data 目录，返回目录路径 */
function makeCacheRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'notionnext-dev-cache-'))
  const dataDir = path.join(root, 'data')
  fs.mkdirSync(dataDir, { recursive: true })
  return { root, dataDir }
}

/** 以 dev 生命周期加载 next.config.js（会触发启动期清理） */
function loadNextConfigAsDev(root) {
  const prevLifecycle = process.env.npm_lifecycle_event
  const prevDir = process.env.NOTION_NEXT_NOTION_CACHE_DIR
  process.env.npm_lifecycle_event = 'dev'
  process.env.NOTION_NEXT_NOTION_CACHE_DIR = root
  jest.resetModules()
  try {
    return require('../../next.config.js')
  } finally {
    if (prevLifecycle === undefined) delete process.env.npm_lifecycle_event
    else process.env.npm_lifecycle_event = prevLifecycle
    if (prevDir === undefined) delete process.env.NOTION_NEXT_NOTION_CACHE_DIR
    else process.env.NOTION_NEXT_NOTION_CACHE_DIR = prevDir
  }
}

const listFiles = dir => fs.readdirSync(dir).filter(n => n.endsWith('.json')).sort()

describe('next.config dev 会话缓存清理', () => {
  const roots = []

  afterEach(() => {
    for (const root of roots.splice(0)) {
      fs.rmSync(root, { recursive: true, force: true })
    }
  })

  it('删除无版本派生缓存与无 TTL 的历史 page block，保留带 TTL 的 page block', () => {
    const { root, dataDir } = makeCacheRoot()
    roots.push(root)

    const future = Date.now() + 300 * 1000
    writeEntry(dataDir, 'kept-1.json', 'page_block_3fa25702-37f4-81c9-b95d-df991bfbb2d7_1792030627895', future)
    writeEntry(dataDir, 'kept-2.json', 'page_block_3fa25702-37f4-8171-8289-d3f9c60024d5_1792030625511', future)
    writeEntry(dataDir, 'global-default.json', 'global_data_default_6172570237f48209994f01fd7bd22158')
    writeEntry(dataDir, 'global-zh.json', 'global_data_zh-CN_6172570237f48209994f01fd7bd22158')
    writeEntry(dataDir, 'site.json', 'site_6172570237f48209994f01fd7bd22158')
    writeEntry(dataDir, 'paths.json', 'build_static_paths_all_pages_default_6172570237f48209994f01fd7bd22158')
    writeEntry(dataDir, 'bare-block.json', 'page_block_fd525702-37f4-82a1-8318-8167f0e34b17')
    // 历史遗留：带版本号但没有过期时间（实测会永久陈旧）
    writeEntry(dataDir, 'legacy-block.json', 'page_block_fd525702-37f4-82a1-8318-8167f0e34b17_1792030627895')

    loadNextConfigAsDev(root)

    expect(listFiles(dataDir)).toEqual(['kept-1.json', 'kept-2.json'])
  })

  it('损坏的缓存文件一并清理（解析失败视为无版本）', () => {
    const { root, dataDir } = makeCacheRoot()
    roots.push(root)

    writeEntry(
      dataDir,
      'good.json',
      'page_block_abc12345-0000-1111-2222-333344445555_1792030627895',
      Date.now() + 300 * 1000
    )
    fs.writeFileSync(path.join(dataDir, 'broken.json'), '{ not json')

    loadNextConfigAsDev(root)

    expect(listFiles(dataDir)).toEqual(['good.json'])
  })

  it('NOTION_DEV_KEEP_CACHE=true 时保留全部缓存（复用上次会话，起服务更快）', () => {
    const { root, dataDir } = makeCacheRoot()
    roots.push(root)

    writeEntry(dataDir, 'global.json', 'global_data_default_6172570237f48209994f01fd7bd22158')
    writeEntry(dataDir, 'block.json', 'page_block_fd525702-37f4-82a1-8318-8167f0e34b17')

    const prev = process.env.NOTION_DEV_KEEP_CACHE
    process.env.NOTION_DEV_KEEP_CACHE = 'true'
    try {
      loadNextConfigAsDev(root)
    } finally {
      if (prev === undefined) delete process.env.NOTION_DEV_KEEP_CACHE
      else process.env.NOTION_DEV_KEEP_CACHE = prev
    }

    expect(listFiles(dataDir)).toEqual(['block.json', 'global.json'])
  })

  // 注意：这里刻意用 start 而不是 build/export —— 后两者会触发 next.config 的
  // preBuild（删除仓库内 sitemap.xml 等），测试不应产生仓库副作用。
  it('非 dev 生命周期不触发该清理，交由既有构建流程处理', () => {
    const { root, dataDir } = makeCacheRoot()
    roots.push(root)

    writeEntry(dataDir, 'global.json', 'global_data_default_6172570237f48209994f01fd7bd22158')

    const prevLifecycle = process.env.npm_lifecycle_event
    const prevDir = process.env.NOTION_NEXT_NOTION_CACHE_DIR
    process.env.npm_lifecycle_event = 'start'
    process.env.NOTION_NEXT_NOTION_CACHE_DIR = root
    try {
      jest.resetModules()
      require('../../next.config.js')
    } finally {
      if (prevLifecycle === undefined) delete process.env.npm_lifecycle_event
      else process.env.npm_lifecycle_event = prevLifecycle
      if (prevDir === undefined) delete process.env.NOTION_NEXT_NOTION_CACHE_DIR
      else process.env.NOTION_NEXT_NOTION_CACHE_DIR = prevDir
    }

    expect(listFiles(dataDir)).toEqual(['global.json'])
  })
})
