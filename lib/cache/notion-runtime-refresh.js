import BLOG from '@/blog.config'
import { fetchGlobalAllData } from '@/lib/db/SiteDataApi'

const DEFAULT_INTERVAL_SECOND = 30 * 60
const MIN_INTERVAL_SECOND = 60

/**
 * 读取后台刷新间隔；0/false 表示关闭。
 * @returns {number|null} 秒数
 */
export function resolveRuntimeRefreshInterval() {
  const raw = process.env.NOTION_RUNTIME_REFRESH_INTERVAL_SECOND
  if (String(raw || '').trim().toLowerCase() === 'false') return null

  const parsed = raw === undefined || raw === null || raw === '' ? NaN : Number(raw)
  if (Number.isFinite(parsed) && parsed === 0) return null
  if (Number.isFinite(parsed) && parsed > 0) {
    return Math.max(MIN_INTERVAL_SECOND, Math.trunc(parsed))
  }
  return DEFAULT_INTERVAL_SECOND
}

/**
 * 后台强制刷新整站 Notion 数据。
 *
 * 单飞：同一进程里多个入口（启动、定时器、手动接口）同时触发时只执行一次。
 * 刷新使用 bypass-cache loader，成功后由缓存层原子覆盖；失败不会删除旧缓存，
 * 因此页面始终可以继续读取上一版数据。
 *
 * @returns {Promise<{started: boolean, refreshPromise?: Promise<unknown>}>}
 */
export function refreshNotionSiteDataInBackground(from = 'runtime-refresh') {
  const key = Symbol.for('freetoken.notion.runtimeRefresh')
  const state = globalThis[key] || { promise: null }
  globalThis[key] = state

  if (state.promise) {
    console.log(`[NotionRefresh] 已有刷新任务，复用本次请求 (from:${from})`)
    return { started: false, refreshPromise: state.promise }
  }

  const startedAt = Date.now()
  console.log(
    `[NotionRefresh] 后台刷新开始 (from:${from}) @ ${new Date(startedAt).toISOString()}`
  )

  const refreshPromise = Promise.resolve(
    fetchGlobalAllData({
      pageId: BLOG.NOTION_PAGE_ID,
      from,
      refresh: true
    })
  )
    .then(data => {
      console.log(
        `[NotionRefresh] 后台刷新完成，耗时:${Date.now() - startedAt}ms，模型:${data?.allPages?.length || 0}`
      )
      return data
    })
    .catch(error => {
      console.error(
        `[NotionRefresh] 后台刷新失败，保留旧缓存，耗时:${Date.now() - startedAt}ms`,
        error?.stack || error
      )
      throw error
    })
    .finally(() => {
      state.promise = null
    })

  state.promise = refreshPromise

  // 定时/启动触发时不希望一个未处理的 rejection 影响进程。
  refreshPromise.catch(() => {})

  return { started: true, refreshPromise }
}
