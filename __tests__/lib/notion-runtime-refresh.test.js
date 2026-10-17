/**
 * @jest-environment node
 */

const mockFetchGlobalAllData = jest.fn()

jest.mock('@/lib/db/SiteDataApi', () => ({
  fetchGlobalAllData: (...args) => mockFetchGlobalAllData(...args)
}))

jest.mock('@/blog.config', () => ({
  __esModule: true,
  default: {
    NOTION_PAGE_ID: 'page-id'
  }
}))

function loadRefreshModule() {
  jest.resetModules()
  return require('@/lib/cache/notion-runtime-refresh')
}

describe('Notion 运行时后台刷新', () => {
  beforeEach(() => {
    mockFetchGlobalAllData.mockReset()
    delete globalThis[Symbol.for('freetoken.notion.runtimeRefresh')]
  })

  it('默认 30 分钟；0/false 关闭，过小的正数抬到 60 秒', () => {
    const prev = process.env.NOTION_RUNTIME_REFRESH_INTERVAL_SECOND
    try {
      delete process.env.NOTION_RUNTIME_REFRESH_INTERVAL_SECOND
      let mod = loadRefreshModule()
      expect(mod.resolveRuntimeRefreshInterval()).toBe(1800)

      process.env.NOTION_RUNTIME_REFRESH_INTERVAL_SECOND = '0'
      mod = loadRefreshModule()
      expect(mod.resolveRuntimeRefreshInterval()).toBeNull()

      process.env.NOTION_RUNTIME_REFRESH_INTERVAL_SECOND = 'false'
      mod = loadRefreshModule()
      expect(mod.resolveRuntimeRefreshInterval()).toBeNull()

      process.env.NOTION_RUNTIME_REFRESH_INTERVAL_SECOND = '5'
      mod = loadRefreshModule()
      expect(mod.resolveRuntimeRefreshInterval()).toBe(60)
    } finally {
      if (prev === undefined) delete process.env.NOTION_RUNTIME_REFRESH_INTERVAL_SECOND
      else process.env.NOTION_RUNTIME_REFRESH_INTERVAL_SECOND = prev
    }
  })

  it('并发触发只调用一次 Notion 刷新，并强制 bypass cache', async () => {
    const resolvers = []
    mockFetchGlobalAllData.mockImplementation(
      () =>
        new Promise(resolve => {
          resolvers.push(resolve)
        })
    )
    const { refreshNotionSiteDataInBackground } = loadRefreshModule()

    const first = refreshNotionSiteDataInBackground('startup')
    const second = refreshNotionSiteDataInBackground('api-cache')

    expect(first.started).toBe(true)
    expect(second.started).toBe(false)
    expect(mockFetchGlobalAllData).toHaveBeenCalledTimes(1)
    expect(mockFetchGlobalAllData).toHaveBeenCalledWith({
      pageId: 'page-id',
      from: 'startup',
      refresh: true
    })

    resolvers.shift()({ allPages: [{ id: 1 }, { id: 2 }] })
    await first.refreshPromise

    const third = refreshNotionSiteDataInBackground('interval')
    expect(third.started).toBe(true)
    resolvers.shift()({ allPages: [] })
    await third.refreshPromise
  })

  it('刷新失败会向调用方报告，同时清空单飞状态允许下次重试', async () => {
    mockFetchGlobalAllData.mockRejectedValueOnce(new Error('Notion timeout'))
    const { refreshNotionSiteDataInBackground } = loadRefreshModule()

    const task = refreshNotionSiteDataInBackground('interval')
    await expect(task.refreshPromise).rejects.toThrow('Notion timeout')

    mockFetchGlobalAllData.mockResolvedValueOnce({ allPages: [] })
    const retry = refreshNotionSiteDataInBackground('interval')
    expect(retry.started).toBe(true)
    await retry.refreshPromise
  })
})
