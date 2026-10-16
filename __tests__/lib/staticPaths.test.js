jest.mock('@/lib/cache/cache_manager', () => ({
  getOrSetDataWithCache: jest.fn()
}))

jest.mock('@/lib/db/SiteDataApi', () => ({
  fetchGlobalAllData: jest.fn()
}))

jest.mock('@/lib/build/prefetch', () => ({
  getPriorityPages: jest.fn(),
  prefetchAllBlockMaps: jest.fn()
}))

jest.mock('@/lib/utils/buildMode', () => ({
  isExport: jest.fn()
}))

jest.mock('@/lib/build/buildEnv', () => ({
  isStaticPathsPriorityOnly: jest.fn(),
  getStaticPathsMax: jest.fn()
}))

const { getOrSetDataWithCache } = require('@/lib/cache/cache_manager')
const { fetchGlobalAllData } = require('@/lib/db/SiteDataApi')
const { getPriorityPages, prefetchAllBlockMaps } = require('@/lib/build/prefetch')
const { isExport } = require('@/lib/utils/buildMode')
const {
  isStaticPathsPriorityOnly,
  getStaticPathsMax
} = require('@/lib/build/buildEnv')

describe('staticPaths build helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    getOrSetDataWithCache.mockImplementation((_key, loader) => loader())
    // 默认：全量预生成、不设上限（与线上配置一致）
    isStaticPathsPriorityOnly.mockReturnValue(false)
    getStaticPathsMax.mockReturnValue(0)
  })

  it('shares allPages lookups within a process', async () => {
    isExport.mockReturnValue(false)
    fetchGlobalAllData.mockResolvedValue({
      allPages: [{ id: '1', slug: 'hello', type: 'Post', status: 'Published' }]
    })
    getPriorityPages.mockReturnValue([])

    await jest.isolateModulesAsync(async () => {
      const { getSharedAllPages } = require('@/lib/build/staticPaths')

      const first = await getSharedAllPages({ from: 'slug-paths' })
      const second = await getSharedAllPages({ from: 'slug-paths' })

      expect(first).toEqual(second)
      expect(fetchGlobalAllData).toHaveBeenCalledTimes(1)
      expect(getOrSetDataWithCache).toHaveBeenCalledTimes(1)
    })
  })

  it('does not keep a rejected allPages lookup pinned in process memory', async () => {
    isExport.mockReturnValue(false)
    fetchGlobalAllData
      .mockRejectedValueOnce(new Error('notion unavailable'))
      .mockResolvedValueOnce({
        allPages: [
          { id: '1', slug: 'hello', type: 'Post', status: 'Published' }
        ]
      })
    getPriorityPages.mockReturnValue([])

    await jest.isolateModulesAsync(async () => {
      const { getSharedAllPages } = require('@/lib/build/staticPaths')

      await expect(getSharedAllPages({ from: 'slug-paths' })).rejects.toThrow(
        'notion unavailable'
      )
      await expect(getSharedAllPages({ from: 'slug-paths' })).resolves.toEqual([
        { id: '1', slug: 'hello', type: 'Post', status: 'Published' }
      ])

      expect(fetchGlobalAllData).toHaveBeenCalledTimes(2)
      expect(getOrSetDataWithCache).toHaveBeenCalledTimes(2)
    })
  })

  it('prefetches once per route call in export mode and returns all matching paths', async () => {
    isExport.mockReturnValue(true)
    fetchGlobalAllData.mockResolvedValue({
      allPages: [
        { id: '1', slug: 'about', type: 'Page', status: 'Published' },
        { id: '2', slug: 'post/hello', type: 'Post', status: 'Published' }
      ]
    })

    await jest.isolateModulesAsync(async () => {
      const { getStaticPathsBase } = require('@/lib/build/staticPaths')

      const result = await getStaticPathsBase({
        filterFn: page => !page.slug.includes('/'),
        mapPageToParams: page => ({ params: { prefix: page.slug } })
      })

      expect(prefetchAllBlockMaps).toHaveBeenCalledWith([
        { id: '1', slug: 'about', type: 'Page', status: 'Published' },
        { id: '2', slug: 'post/hello', type: 'Post', status: 'Published' }
      ])
      expect(result).toEqual({
        paths: [{ params: { prefix: 'about' } }],
        fallback: false
      })
    })
  })

  it('ISR 模式默认全量预生成本路由可匹配的页面（避免冷实例 fallback 重建整站）', async () => {
    isExport.mockReturnValue(false)
    fetchGlobalAllData.mockResolvedValue({
      allPages: [
        { id: '1', slug: 'about', type: 'Page', status: 'Published' },
        { id: '2', slug: 'post/hello', type: 'Post', status: 'Published' },
        { id: '3', slug: 'post/world', type: 'Post', status: 'Published' }
      ]
    })

    await jest.isolateModulesAsync(async () => {
      const { getStaticPathsBase } = require('@/lib/build/staticPaths')

      const result = await getStaticPathsBase({
        filterFn: page => page.slug.includes('/'),
        mapPageToParams: page => ({
          params: {
            prefix: page.slug.split('/')[0],
            slug: page.slug.split('/')[1]
          }
        })
      })

      expect(prefetchAllBlockMaps).not.toHaveBeenCalled()
      expect(getPriorityPages).not.toHaveBeenCalled()
      expect(result).toEqual({
        paths: [
          { params: { prefix: 'post', slug: 'hello' } },
          { params: { prefix: 'post', slug: 'world' } }
        ],
        fallback: 'blocking'
      })
    })
  })

  it('全量预生成时跳过 Invisible 行（它们只用于菜单，不该进构建产物）', async () => {
    isExport.mockReturnValue(false)
    fetchGlobalAllData.mockResolvedValue({
      allPages: [
        { id: '1', slug: 'post/live', type: 'Post', status: 'Published' },
        { id: '2', slug: 'post/draft', type: 'Post', status: 'Invisible' }
      ]
    })

    await jest.isolateModulesAsync(async () => {
      const { getStaticPathsBase } = require('@/lib/build/staticPaths')

      const result = await getStaticPathsBase({
        filterFn: () => true,
        mapPageToParams: page => ({ params: { prefix: page.slug } })
      })

      expect(result.paths).toEqual([{ params: { prefix: 'post/live' } }])
    })
  })

  it('全量预生成时挡住缺 type / 缺 slug 的脏行（filterFn 会直接读 row.type）', async () => {
    isExport.mockReturnValue(false)
    fetchGlobalAllData.mockResolvedValue({
      allPages: [
        { id: '1', slug: 'post/live', type: 'Post', status: 'Published' },
        { id: '2', slug: 'post/notype', status: 'Published' },
        { id: '3', type: 'Post', status: 'Published' }
      ]
    })

    await jest.isolateModulesAsync(async () => {
      const { getStaticPathsBase } = require('@/lib/build/staticPaths')

      // 与真实路由一致的 filterFn：会直接读 row.type
      const result = await getStaticPathsBase({
        filterFn: row => row.type.indexOf('Menu') < 0,
        mapPageToParams: page => ({ params: { prefix: page.slug } })
      })

      expect(result.paths).toEqual([{ params: { prefix: 'post/live' } }])
    })
  })

  it('STATIC_PATHS_PRIORITY_ONLY=true 时退回旧的「只预生成前 10 篇」行为', async () => {
    isExport.mockReturnValue(false)
    isStaticPathsPriorityOnly.mockReturnValue(true)
    fetchGlobalAllData.mockResolvedValue({
      allPages: [
        { id: '1', slug: 'about', type: 'Page', status: 'Published' },
        { id: '2', slug: 'post/hello', type: 'Post', status: 'Published' },
        { id: '3', slug: 'post/world', type: 'Post', status: 'Published' }
      ]
    })
    getPriorityPages.mockReturnValue([
      { id: '2', slug: 'post/hello', type: 'Post', status: 'Published' }
    ])

    await jest.isolateModulesAsync(async () => {
      const { getStaticPathsBase } = require('@/lib/build/staticPaths')

      const result = await getStaticPathsBase({
        filterFn: page => page.slug.includes('/'),
        mapPageToParams: page => ({
          params: {
            prefix: page.slug.split('/')[0],
            slug: page.slug.split('/')[1]
          }
        })
      })

      expect(getPriorityPages).toHaveBeenCalled()
      expect(result).toEqual({
        paths: [{ params: { prefix: 'post', slug: 'hello' } }],
        fallback: 'blocking'
      })
    })
  })

  it('STATIC_PATHS_MAX 截断预生成数量（构建时间兜底）', async () => {
    isExport.mockReturnValue(false)
    getStaticPathsMax.mockReturnValue(2)
    fetchGlobalAllData.mockResolvedValue({
      allPages: [
        { id: '1', slug: 'post/a', type: 'Post', status: 'Published' },
        { id: '2', slug: 'post/b', type: 'Post', status: 'Published' },
        { id: '3', slug: 'post/c', type: 'Post', status: 'Published' }
      ]
    })

    await jest.isolateModulesAsync(async () => {
      const { getStaticPathsBase } = require('@/lib/build/staticPaths')

      const result = await getStaticPathsBase({
        filterFn: () => true,
        mapPageToParams: page => ({ params: { prefix: page.slug } })
      })

      expect(result.paths).toHaveLength(2)
      expect(result.fallback).toBe('blocking')
    })
  })
})
