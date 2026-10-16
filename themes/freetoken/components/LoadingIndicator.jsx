'use client'

import { useEffect, useState } from 'react'

import { siteConfig } from '@/lib/config'
import { useGlobal } from '@/lib/global'

import CONFIG from '../config'

/**
 * 路由切换反馈（顶部进度条 + 「正在打开…」胶囊）。
 *
 * 为什么主题需要自己做一个：官方 `components/LoadingProgress` 依赖 CDN 上的
 * NProgress，且只在 `ENABLE_NPROGRSS`（官方键名拼写如此）开启时挂载；
 * freetoken 既不开启它，也从未消费过全局的 `onLoading`，于是「点击模型卡片
 * 后页面没反应」成了常态 —— 而未预生成的模型详情页在冷实例上首次打开要现场
 * 重建 Notion 数据（线上实测最慢 296 秒），用户会以为点击失效并反复点击。
 *
 * 交互取舍：
 *   - 进度条立刻出现（`routeChangeStart` 即触发），给点击一个确定的响应；
 *   - 文字胶囊延迟 PILL_DELAY_MS 毫秒才出现，避免本地/命中缓存的快速跳转
 *     闪一下又消失（这类闪烁比没有提示更让人困惑）；
 *   - 页面真正变慢时才把「正在打开…」显示出来，并附带已等待秒数；
 *   - 尊重 prefers-reduced-motion：降级为静态条与静态文案。
 */

/** 文字胶囊的延迟出现时间（毫秒）：低于此值认为跳转足够快，不打扰用户 */
const PILL_DELAY_MS = 400

export default function LoadingIndicator() {
  const global = useGlobal()
  const onLoading = Boolean(global?.onLoading)
  const [showPill, setShowPill] = useState(false)
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (!onLoading) {
      setShowPill(false)
      setElapsed(0)
      return
    }

    const startedAt = Date.now()
    const pillTimer = setTimeout(() => setShowPill(true), PILL_DELAY_MS)
    // 秒数每秒刷新一次：等待变长时用户能看出「还在动」，而不是卡死
    const tickTimer = setInterval(
      () => setElapsed(Math.floor((Date.now() - startedAt) / 1000)),
      1000
    )

    return () => {
      clearTimeout(pillTimer)
      clearInterval(tickTimer)
    }
  }, [onLoading])

  if (!onLoading) return null

  const text = siteConfig('FREETOKEN_LOADING_TEXT', null, CONFIG)

  return (
    <>
      <div
        className='loadingbar'
        data-testid='ft-loading-bar'
        role='progressbar'
        aria-label={text}
      >
        <span className='loadingbar-fill' />
      </div>
      {showPill && (
        <div
          className='loadingpill'
          data-testid='ft-loading-pill'
          role='status'
          aria-live='polite'
        >
          <span className='loadingdot' />
          {text}
          {elapsed >= 3 ? `（已等待 ${elapsed}s）` : ''}
        </div>
      )}
    </>
  )
}
