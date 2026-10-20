/**
 * @jest-environment node
 */

jest.mock('@vercel/functions', () => ({
  getCache: jest.fn()
}))

describe('Vercel Runtime Cache generation', () => {
  let runtimeCache
  let mod

  beforeEach(() => {
    jest.resetModules()
    runtimeCache = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined)
    }
    const { getCache } = require('@vercel/functions')
    getCache.mockReturnValue(runtimeCache)
    process.env.CACHE_GENERATION_ENABLED = 'true'
    mod = require('@/lib/cache/cache_generation')
  })

  afterEach(() => {
    delete process.env.CACHE_GENERATION_ENABLED
    delete process.env.VERCEL
    delete process.env.VERCEL_ENV
  })

  it('defaults to generation 0 when the shared key is absent', async () => {
    await expect(mod.getCacheGeneration({ force: true })).resolves.toBe('0')
  })

  it('rotates the generation and updates the local fast path', async () => {
    const result = await mod.bumpCacheGeneration('test')

    expect(result.previous).toBe('0')
    expect(result.current).toBeTruthy()
    expect(runtimeCache.set).toHaveBeenCalledWith(
      'freetoken:cache-generation',
      result.current,
      expect.objectContaining({
        ttl: expect.any(Number),
        tags: ['freetoken-cache-generation']
      })
    )
    await expect(mod.getCacheGeneration()).resolves.toBe(result.current)
  })

  it('enables itself automatically on Vercel', () => {
    delete process.env.CACHE_GENERATION_ENABLED
    process.env.VERCEL = '1'
    expect(mod.isCacheGenerationEnabled()).toBe(true)
  })
})
