/**
 * @jest-environment node
 */

/**
 * Redis 缓存层必须「坏掉时也不能拖慢站点」。
 *
 * 背景：模型详情页在新浏览器/冷实例上首次点击会卡住（实测线上 296 秒），
 * 因为该页未预生成，要在 serverless 实例上现场重建整站 Notion 数据。
 * Redis 是把这份数据共享给所有实例的正解，但旧实现有三个致命点：
 *   1. `new Redis(url)` 没有任何 error 监听，连接不上时命令进离线队列
 *      一直等到重连（默认 maxRetriesPerRequest=20），页面被吊死；
 *   2. 默认 TTL 取 NEXT_REVALIDATE_SECOND * 1.5 = 90 秒，比整站重建耗时还短，
 *      等于每个实例每隔 90 秒都要再重建一次；
 *   3. 写入失败被吞掉，cache_manager 的存储链以为写成功，不再回落到文件/内存。
 * 本文件锁定修复后的契约。
 */

const ENV_KEYS = ['REDIS_URL', 'NOTION_DATA_CACHE_TTL_SECOND']

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

/** 每个用例都重新加载模块：熔断状态是模块级单例 */
function loadRedisCache({ url, ttl } = {}) {
  if (url === undefined) delete process.env.REDIS_URL
  else process.env.REDIS_URL = url

  if (ttl === undefined) delete process.env.NOTION_DATA_CACHE_TTL_SECOND
  else process.env.NOTION_DATA_CACHE_TTL_SECOND = String(ttl)

  jest.resetModules()
  return require('@/lib/cache/redis_cache')
}

describe('Redis 缓存层', () => {
  let savedEnv

  beforeEach(() => {
    savedEnv = snapshotEnv()
  })

  afterEach(() => {
    restoreEnv(savedEnv)
  })

  describe('连接参数（快速失败）', () => {
    it('关闭离线队列、限制重试次数、设置命令超时', () => {
      const { buildRedisOptions } = loadRedisCache()
      const options = buildRedisOptions()

      // 关键：不排队 —— 连接不可用时命令立刻 reject，而不是干等重连
      expect(options.enableOfflineQueue).toBe(false)
      // 默认是 20 次；必须收到 1 次，否则单个请求可能被拖到分钟级
      expect(options.maxRetriesPerRequest).toBe(1)
      expect(options.commandTimeout).toBeGreaterThan(0)
      expect(options.commandTimeout).toBeLessThanOrEqual(3000)
      expect(options.connectTimeout).toBeGreaterThan(0)
      expect(typeof options.retryStrategy).toBe('function')
      // 重连退避要有上限，避免无限密集重连
      expect(options.retryStrategy(1)).toBeGreaterThan(0)
      expect(options.retryStrategy(999)).toBeLessThanOrEqual(5000)
    })
  })

  describe('默认 TTL', () => {
    it('优先采用 NOTION_DATA_CACHE_TTL_SECOND', () => {
      const { resolveDefaultCacheTime } = loadRedisCache({ ttl: 3600 })
      expect(resolveDefaultCacheTime()).toBe(3600)
    })

    it('未显式配置时取 conf 默认值（300 秒），而非 NEXT_REVALIDATE_SECOND * 1.5 = 90 秒', () => {
      const { resolveDefaultCacheTime } = loadRedisCache({})
      expect(resolveDefaultCacheTime()).toBe(300)
    })

    it('显式配成过小值时尊重配置，但输出告警（避免再踩 90 秒）', () => {
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
      const { resolveDefaultCacheTime } = loadRedisCache({
        url: 'redis://127.0.0.1:6379',
        ttl: 30
      })

      expect(resolveDefaultCacheTime()).toBe(30)
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('缓存时长仅 30s'))

      warn.mockRestore()
      require('@/lib/cache/redis_cache').redisClient?.disconnect?.()
    })
  })

  describe('未配置 REDIS_URL', () => {
    it('不创建客户端，读返回 null，写抛出（让上层回落）', async () => {
      const mod = loadRedisCache({})

      // 未配置时不创建客户端（旧实现会留一个空对象 {}，让调用方以为可用）
      expect(mod.redisClient).toBeNull()
      expect(mod.isRedisUsable()).toBe(false)
      expect(await mod.getCache('k')).toBeNull()
      await expect(mod.setCache('k', { a: 1 })).rejects.toThrow()
      await expect(mod.delCache('k')).rejects.toThrow()
    })
  })

  describe('Redis 不可用时的熔断', () => {
    it('连接失败后进入冷却期，getCache 直接返回 null 不再等待', async () => {
      // 指向一个不会有人监听的端口：连接必然失败
      const mod = loadRedisCache({ url: 'redis://127.0.0.1:6399' })
      mod.resetRedisHealth()

      expect(mod.redisClient).not.toBeNull()
      expect(typeof mod.redisClient.on).toBe('function')

      // 前几次失败允许真正尝试
      for (let i = 0; i < 3; i++) {
        await mod.getCache(`miss-${i}`)
      }

      // 达到阈值后进入冷却：可用性判定为 false
      expect(mod.isRedisUsable()).toBe(false)

      // 冷却期内读操作必须立即返回，不能走网络
      const started = Date.now()
      expect(await mod.getCache('k')).toBeNull()
      expect(Date.now() - started).toBeLessThan(50)

      // 写操作在冷却期内抛错，cache_manager 会据此回落到文件/内存缓存
      await expect(mod.setCache('k', { a: 1 })).rejects.toThrow()

      mod.redisClient.disconnect?.()
    }, 20000)

    it('resetRedisHealth 能清掉冷却状态', async () => {
      const mod = loadRedisCache({ url: 'redis://127.0.0.1:6399' })
      mod.resetRedisHealth()

      for (let i = 0; i < 3; i++) await mod.getCache(`miss-${i}`)
      expect(mod.isRedisUsable()).toBe(false)

      mod.resetRedisHealth()
      expect(mod.isRedisUsable()).toBe(true)

      mod.redisClient.disconnect?.()
    }, 20000)
  })
})
