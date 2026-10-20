import {
  refreshNotionSiteDataInBackground,
  resolveRuntimeRefreshInterval
} from './notion-runtime-refresh'

const BOOTSTRAP_KEY = Symbol.for('freetoken.notion.runtimeRefreshBootstrap')

/**
 * Vercel Functions are short-lived and may run on many instances. A process
 * timer is not a reliable scheduler there, so production refreshes must come
 * from the revalidation API or a Vercel Deploy Hook instead.
 */
export function shouldBootstrapNotionRuntimeRefresh() {
  const lifecycle = String(process.env.npm_lifecycle_event || '')
  return (
    process.env.NEXT_RUNTIME === 'nodejs' &&
    lifecycle !== 'build' &&
    lifecycle !== 'export' &&
    process.env.VERCEL !== '1' &&
    process.env.VERCEL_ENV !== 'production'
  )
}

/**
 * 只在 Node runtime 调用；启动刷新一次，并按间隔定时刷新。
 * 页面读取路径不会等待该 Promise。
 */
export function bootstrapNotionRuntimeRefresh() {
  if (!shouldBootstrapNotionRuntimeRefresh()) {
    console.log(
      '[NotionRefresh] Serverless production or build phase detected; process timers are disabled'
    )
    return
  }
  if (process.env.NOTION_RUNTIME_REFRESH === 'false') {
    console.log('[NotionRefresh] 已通过 NOTION_RUNTIME_REFRESH=false 关闭')
    return
  }
  if (globalThis[BOOTSTRAP_KEY]) return
  globalThis[BOOTSTRAP_KEY] = true

  const intervalSecond = resolveRuntimeRefreshInterval()
  if (intervalSecond === null) {
    console.log('[NotionRefresh] 定时刷新已关闭')
    return
  }

  refreshNotionSiteDataInBackground('startup')

  const timer = setInterval(() => {
    refreshNotionSiteDataInBackground('interval')
  }, intervalSecond * 1000)
  if (typeof timer.unref === 'function') timer.unref()

  console.log(`[NotionRefresh] 启动刷新已排队；定时刷新每 ${intervalSecond}s 一次`)
}
