import BLOG from '@/blog.config'
import FileCache from './local_file_cache'
import MemoryCache from './memory_cache'
import RedisCache, { isRedisUsable } from './redis_cache'
import { withFileLock } from './file_lock'

const cacheStats = {
  hit: 0,
  miss: 0,
  set: 0,
  error: 0,
  total: 0,
  perStore: {}
}

const isBuildPhase =
  process.env.npm_lifecycle_event === 'build' ||
  process.env.npm_lifecycle_event === 'export'

const enableLocalCache = isBuildPhase || !BLOG.isProd
const hasRedis = !!BLOG.REDIS_URL
const inflightMap = new Map()
const BUILD_LOCK_TIMEOUT_MS = 120000
const BUILD_LOCK_MAX_WAIT_MS = 600000

/** 与 dev.config 中 ENABLE_CACHE 的多种写法兼容（boolean / JSON 字符串 / 'true'|'false'） */
function cacheReadsEnabled(force) {
  if (force) return true
  const v = BLOG.ENABLE_CACHE
  if (v === true) return true
  if (v === false) return false
  if (typeof v === 'string') {
    const s = v.trim()
    if (s === '' || s === 'false' || s === '0') return false
    if (s === 'true' || s === '1') return true
    try {
      return Boolean(JSON.parse(s))
    } catch {
      return true
    }
  }
  return Boolean(v)
}

function cacheLog(action, key, extra = '') {
  const type = getCacheType()
  console.log(
    `[Cache][${type.toUpperCase()}][pid:${process.pid}] ${action} key:${key} ${extra}`
  )
}

function isUsableCacheValue(data) {
  if (data == null) return false
  if (Array.isArray(data)) return data.length > 0
  return true
}

/**
 * Notion 派生数据的缓存有效期（秒）→ 透传给各个存储层。
 *
 * 返回 null 表示不设过期：文件缓存永久有效、内存缓存退回自身默认值（旧行为）。
 * 为什么要给统一上限：缓存键里的版本取自页面 lastEditedDate，而模型页内嵌的
 * 渠道子表增删行不会改动父页面的 lastEditedDate，这类键其实不会自我失效。
 * @param {unknown} value 配置值
 * @returns {number|null} 正数秒数；否则 null
 */
export function normalizeNotionCacheTtl(value) {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? n : null
}

/**
 * 构建期的缓存有效期下限（秒）。
 *
 * 为什么需要：一次 `next build` 里整站数据只该装配一次，之后所有页面都命中缓存。
 * 但默认 TTL 是 300 秒，而全量预生成 100+ 个页面很容易超过 5 分钟 —— 一旦中途
 * 过期，整站装配（含约 100 次渠道子表 blockMap 拉取，实测 85~160 秒）会被重复
 * 触发，构建时间成倍增长。
 *
 * 只对「构建期专用」的键生效（见 resolveNotionCacheTtl）。运行时 TTL 语义不变。
 */
const BUILD_PHASE_MIN_CACHE_TTL_SECOND = 6 * 60 * 60

/**
 * 有版本的 page block 键（page_block_<id>_<lastEditedDate>）。
 *
 * 这类键是**唯一**会被跨构建复用的缓存（next.config.js 的
 * pruneTransientNotionDataCache 只保留它们），所以它们必须继续受
 * NOTION_DATA_CACHE_TTL_SECOND 约束 —— 否则「Notion 改了但站点长期显示旧数据」
 * 的窗口会被构建期的长 TTL 悄悄放大。
 * 其余键（global_data_* / site_* / build_static_paths_* / 无版本 page_block_*）
 * 每次构建开始时都会被清掉，给它们长 TTL 不可能造成跨构建的陈旧数据。
 */
const VERSIONED_PAGE_BLOCK_KEY = /^page_block_.+_\d{10,}$/

/**
 * 实际使用的缓存有效期：配置值 + 构建期下限。
 * @param {unknown} value 配置值（BLOG.NOTION_DATA_CACHE_TTL_SECOND）
 * @param {string} [key] 缓存键；有版本的 page block 不享受构建期下限
 * @returns {number|null}
 */
export function resolveNotionCacheTtl(value, key) {
  const ttl = normalizeNotionCacheTtl(value)
  if (!isBuildPhase) return ttl
  if (VERSIONED_PAGE_BLOCK_KEY.test(String(key || ''))) return ttl
  return Math.max(ttl ?? 0, BUILD_PHASE_MIN_CACHE_TTL_SECOND)
}

export async function getOrSetDataWithCache(key, getDataFunction, ...getDataArgs) {
  return getOrSetDataWithCustomCache(
    key,
    resolveNotionCacheTtl(BLOG.NOTION_DATA_CACHE_TTL_SECOND, key),
    getDataFunction,
    ...getDataArgs
  )
}

export async function getOrSetDataWithCustomCache(
  key,
  customCacheTime,
  getDataFunction,
  ...getDataArgs
) {
  const dataFromCache = await getDataFromCache(key)
  if (dataFromCache) {
    return dataFromCache
  }

  if (inflightMap.has(key)) {
    return inflightMap.get(key)
  }

  cacheLog('MISS', key, 'cache miss, fetch from source')

  if (isBuildPhase) {
    const promise = withFileLock(
      key,
      async () => {
        const doubleCheck = await getDataFromCache(key)
        if (doubleCheck) {
          cacheLog('DOUBLE-CHECK-HIT', key, 'lock holder found cached value')
          return doubleCheck
        }

        const data = await getDataFunction(...getDataArgs)
        if (data) {
          await setDataToCache(key, data, customCacheTime)
          cacheLog('SET', key, 'cache stored by lock holder')
        }

        return data || null
      },
      () => getDataFromCache(key),
      {
        timeout: BUILD_LOCK_TIMEOUT_MS,
        staleLockMs: BUILD_LOCK_TIMEOUT_MS,
        timeoutStrategy: 'wait',
        maxWaitMs: BUILD_LOCK_MAX_WAIT_MS
      }
    ).catch(err => {
      cacheLog('ERROR', key, err.message)
      throw err
    })

    inflightMap.set(key, promise)
    promise.finally(() => inflightMap.delete(key))
    return promise
  }

  const promise = getDataFunction(...getDataArgs)
    .then(async data => {
      if (data) {
        await setDataToCache(key, data, customCacheTime)
        cacheLog('SET', key, 'cache stored')
      }

      inflightMap.delete(key)
      return data || null
    })
    .catch(err => {
      inflightMap.delete(key)
      cacheLog('ERROR', key, err.message)
      throw err
    })

  inflightMap.set(key, promise)
  return promise
}

export async function setDataToCache(key, data, customCacheTime) {
  if (!data) return

  const chain = getCacheChain()

  for (const { name, api } of chain) {
    try {
      await api.setCache(key, data, customCacheTime)

      cacheStats.set++
      cacheStats.perStore[name] = cacheStats.perStore[name] || { hit: 0, set: 0 }
      cacheStats.perStore[name].set++

      return
    } catch (e) {
      console.warn(`[Cache] ${name} set failed key:${key}`, e.message)
      cacheStats.error++
    }
  }

  console.warn(`[Cache] ALL set failed key:${key}`)
}

export async function getDataFromCache(key, force) {
  if (!cacheReadsEnabled(force)) return null

  cacheStats.total++
  const chain = getCacheChain()

  for (const { name, api } of chain) {
    try {
      const data = await api.getCache(key)

      if (isUsableCacheValue(data)) {
        cacheStats.hit++
        cacheStats.perStore[name] = cacheStats.perStore[name] || { hit: 0, set: 0 }
        cacheStats.perStore[name].hit++
        return data
      }
    } catch (e) {
      cacheStats.error++
      console.warn(`[Cache] ${name} get failed key:${key}`, e.message)
    }
  }

  cacheStats.miss++
  return null
}

export async function delCacheData(key) {
  const chain = getCacheChain()

  for (const { name, api } of chain) {
    try {
      await api.delCache(key)
    } catch (e) {
      console.warn(`[Cache] ${name} del failed key:${key}`, e.message)
    }
  }
}

function getCacheType() {
  // Redis 进入熔断冷却期时不再自称 redis：日志里的存储层要与实际链路一致，
  // 否则排查「为什么还是慢」会被日志误导（写操作此刻会直接回落到文件/内存）。
  if (hasRedis && isRedisUsable()) return 'redis'
  if (hasRedis) return 'redis-unavailable'
  if (isBuildPhase) return 'file'
  return 'memory'
}

export function getApi() {
  // 注意：getCacheType() 会返回 'redis-unavailable'（Redis 熔断中），
  // 但那一层的写操作会抛错并被存储链跳过，这里仍返回真实实现以便排查。
  if (hasRedis) return RedisCache
  return isBuildPhase ? FileCache : MemoryCache
}

function getCacheChain() {
  const chain = []

  if (hasRedis) {
    chain.push({ name: 'redis', api: RedisCache })
  }

  if (enableLocalCache) {
    chain.push({ name: 'file', api: FileCache })
  }

  chain.push({ name: 'memory', api: MemoryCache })

  return chain
}

function printCacheSummary() {
  const hitRate = cacheStats.total
    ? ((cacheStats.hit / cacheStats.total) * 100).toFixed(1)
    : 0

  console.log('\n[Cache Summary]')
  console.log('Strategy:', getCacheChain().map(c => c.name).join(' -> '))
  console.log(
    `Stats: HIT ${hitRate}% | MISS ${cacheStats.miss} | ERROR ${cacheStats.error} | total ${cacheStats.total}`
  )
  console.log('[Per Store]')

  Object.entries(cacheStats.perStore).forEach(([name, stat]) => {
    console.log(`  ${name}: hit=${stat.hit || 0}, set=${stat.set || 0}`)
  })

  console.log('----------------------------------\n')
}

if (typeof process !== 'undefined') {
  process.on('exit', printCacheSummary)
}
