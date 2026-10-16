import BLOG from '@/blog.config'
import { siteConfig } from '@/lib/config'
import Redis from 'ioredis'

/**
 * Redis 缓存层（可选）。
 *
 * 这一层是「整站共享」的 Notion 数据缓存：配置 REDIS_URL 后，冷启动的
 * serverless 实例可以直接命中别的实例写好的数据，而不必自己重新拉一遍
 * Notion（实测整站重建 85~300 秒）。因此这里的原则是**绝不能让 Redis
 * 成为新的故障点**：
 *
 *   1. 不排队：enableOfflineQueue=false，连接不可用时命令立刻失败，
 *      而不是把请求挂在离线队列里等重连（旧行为会让每次读缓存都干等）；
 *   2. 快速超时：commandTimeout + maxRetriesPerRequest 兜住「连上了但不响应」；
 *   3. 熔断：连续失败后在冷却窗口内直接跳过 Redis，不再付出超时代价，
 *      让 cache_manager 立刻回落到文件/内存缓存；
 *   4. 必带 error 监听：ioredis 没有 error 监听时只打印错误且会一直重连，
 *      显式接管后日志收敛为节流输出。
 *
 * 读失败一律返回 null（当作未命中）；写/删失败则向上抛出，因为
 * cache_manager 的存储链正是靠异常决定是否继续回落到文件/内存缓存。
 */

/** 单条命令的超时（毫秒）：超时即当作未命中，不再拖住页面渲染 */
const REDIS_COMMAND_TIMEOUT_MS = 1500
/** 建立连接的超时（毫秒） */
const REDIS_CONNECT_TIMEOUT_MS = 5000
/** 连续失败后的熔断冷却时长（毫秒） */
const REDIS_UNAVAILABLE_COOLDOWN_MS = 30000
/** 熔断前允许的连续失败次数 */
const REDIS_FAILURE_THRESHOLD = 3
/**
 * 推荐的最小缓存时长（秒）：低于此值时会在启动日志里告警。
 * 冷启动重建整站 Notion 数据实测 85~300 秒，TTL 比这还短等于让访客轮流承担重建。
 */
const RECOMMENDED_MIN_CACHE_TIME = 300

/**
 * 构造 ioredis 连接参数。
 *
 * 单独导出是为了能在不连真实 Redis 的情况下断言「快速失败」这一契约。
 * @returns {object} ioredis options
 */
export function buildRedisOptions() {
  return {
    // 连接不可用时命令立即失败，不进入离线队列
    enableOfflineQueue: false,
    // 每条命令最多重试 1 次，避免 20 次默认重试把请求拖成分钟级
    maxRetriesPerRequest: 1,
    connectTimeout: REDIS_CONNECT_TIMEOUT_MS,
    commandTimeout: REDIS_COMMAND_TIMEOUT_MS,
    // 后台重连退避：上限 5 秒，避免无意义的密集重连
    retryStrategy: times => Math.min(times * 500, 5000)
  }
}

/**
 * 默认缓存时长（秒）。
 *
 * 优先级：NOTION_DATA_CACHE_TTL_SECOND（Notion 派生数据的统一上限）
 * → NEXT_REVALIDATE_SECOND * 1.5 → 兜底 300 秒。
 * 为什么不能沿用「NEXT_REVALIDATE_SECOND * 1.5」= 90 秒：Redis 是共享缓存，
 * TTL 短于 Notion 数据上限意味着每隔 90 秒就有一个访客替全站承担整站重建，
 * 正是这次要修的问题。
 * 显式配置的较小值仍然生效（配置优先），但会输出告警，避免再次踩到 90 秒。
 * @returns {number} 正数秒数
 */
export function resolveDefaultCacheTime() {
  const notionTtl = Number(BLOG.NOTION_DATA_CACHE_TTL_SECOND)
  if (Number.isFinite(notionTtl) && notionTtl > 0) {
    return Math.trunc(notionTtl)
  }

  const revalidate = Number(
    siteConfig('NEXT_REVALIDATE_SECOND', BLOG.NEXT_REVALIDATE_SECOND)
  )
  const base = Number.isFinite(revalidate) && revalidate > 0 ? revalidate * 1.5 : 0
  return base > 0 ? Math.trunc(base) : RECOMMENDED_MIN_CACHE_TIME
}

const cacheTime = resolveDefaultCacheTime()

if (BLOG.REDIS_URL && cacheTime < RECOMMENDED_MIN_CACHE_TIME) {
  console.warn(
    `[Cache][REDIS] 缓存时长仅 ${cacheTime}s，短于整站冷重建耗时（实测 85~300s），` +
      '会让访客轮流承担重建。建议把 NOTION_DATA_CACHE_TTL_SECOND 调到 3600。'
  )
}

let redisDownUntil = 0
let consecutiveFailures = 0
let errorLogged = false

/** 创建客户端（未配置 REDIS_URL 时为 null，调用方一律走回落） */
function createRedisClient() {
  if (!BLOG.REDIS_URL) return null

  try {
    const client = new Redis(BLOG.REDIS_URL, buildRedisOptions())
    client.on('error', err => {
      markFailure()
      // 连接级错误可能非常密集，只在首次失败时输出一条
      if (!errorLogged) {
        errorLogged = true
        console.warn(
          `[Cache][REDIS] 连接异常，已回落到本地缓存：${String(err?.message || err)}`
        )
      }
    })
    client.on('ready', () => {
      consecutiveFailures = 0
      redisDownUntil = 0
      errorLogged = false
    })
    return client
  } catch (e) {
    console.warn(`[Cache][REDIS] 初始化失败，已禁用 Redis：${String(e)}`)
    markFailure(true)
    return null
  }
}

export const redisClient = createRedisClient()

function markFailure(force = false) {
  consecutiveFailures++
  if (force || consecutiveFailures >= REDIS_FAILURE_THRESHOLD) {
    redisDownUntil = Date.now() + REDIS_UNAVAILABLE_COOLDOWN_MS
  }
}

/** 是否处于熔断冷却期（冷却期内直接跳过 Redis） */
function isRedisCoolingDown() {
  return Date.now() < redisDownUntil
}

/** 是否可用（有客户端且不在冷却期） */
export function isRedisUsable() {
  return Boolean(redisClient) && !isRedisCoolingDown()
}

/** 测试辅助：重置熔断状态与错误节流标记 */
export function resetRedisHealth() {
  redisDownUntil = 0
  consecutiveFailures = 0
  errorLogged = false
}

export async function getCache(key) {
  if (!isRedisUsable()) return null

  try {
    const data = await redisClient.get(key)
    consecutiveFailures = 0
    return data ? JSON.parse(data) : null
  } catch (e) {
    markFailure()
    console.warn(`[Cache][REDIS] 读取失败 key:${key} ${String(e?.message || e)}`)
    return null
  }
}

export async function setCache(key, data, customCacheTime) {
  // 写失败必须抛出：cache_manager 的存储链靠异常决定是否回落到文件/内存缓存，
  // 若在这里吞掉异常，链上的其它存储层将永远拿不到数据（配置了坏 Redis 时
  // 会退化成「哪里都没缓存」，比不配 Redis 更慢）。
  if (!isRedisUsable()) {
    throw new Error('redis unavailable')
  }

  const ttl = Number(customCacheTime)
  const expire = Number.isFinite(ttl) && ttl > 0 ? Math.trunc(ttl) : cacheTime

  try {
    await redisClient.set(key, JSON.stringify(data), 'EX', expire)
    consecutiveFailures = 0
  } catch (e) {
    markFailure()
    console.warn(`[Cache][REDIS] 写入失败 key:${key} ${String(e?.message || e)}`)
    throw e
  }
}

export async function delCache(key) {
  if (!isRedisUsable()) {
    throw new Error('redis unavailable')
  }

  try {
    await redisClient.del(key)
    consecutiveFailures = 0
  } catch (e) {
    markFailure()
    console.warn(`[Cache][REDIS] 删除失败 key:${key} ${String(e?.message || e)}`)
    throw e
  }
}

export default { getCache, setCache, delCache }
