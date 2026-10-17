import {
  refreshNotionSiteDataInBackground,
  resolveRuntimeRefreshInterval
} from './notion-runtime-refresh'

const BOOTSTRAP_KEY = Symbol.for('freetoken.notion.runtimeRefreshBootstrap')

/**
 * 只在 Node runtime 调用；启动刷新一次，并按间隔定时刷新。
 * 页面读取路径不会等待该 Promise。
 */
export function bootstrapNotionRuntimeRefresh() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return
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
