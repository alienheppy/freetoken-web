'use client'

import { useMemo } from 'react'

import { fmtCtx } from '../lib/adaptModel'
import { maxContext, platformCards } from '../lib/modelView'

/**
 * 首页统计条（原设计 .strip / .stripin / .stat）
 * 四项与原设计一一对应：免费模型·已收录 / 平台收录 / 最大上下文窗口 / 使用成本 ¥0
 * 数值全部来自已发布模型行的 ext 数据，无硬编码占位。
 * 优先采用 props.stats（服务端全量口径，SiteDataApi collectFreetokenStats）：
 * 首页 posts 会被 POSTS_PER_PAGE 截断，只按 models 现算会少算（实测 18 条只数到 12）；
 * 未下发 stats 时回退为按 models 现算，行为与旧版完全一致。
 */
export default function StatsStrip({ models, platformProfiles, stats }) {
  const values = useMemo(() => {
    const list = Array.isArray(models)
      ? models.filter(m => m && typeof m === 'object')
      : []
    const full = stats && typeof stats === 'object' ? stats : null
    return {
      modelCount:
        full && Number.isFinite(full.modelCount) ? full.modelCount : list.length,
      platformCount: platformCards(
        list,
        platformProfiles,
        full?.platformCounts
      ).length,
      maxCtx: fmtCtx(
        full && Number.isFinite(full.maxContext)
          ? full.maxContext
          : maxContext(list)
      )
    }
  }, [models, platformProfiles, stats])

  return (
    <div className='strip' data-testid='ft-stats'>
      <div className='stripin'>
        <div className='stat'>
          <div className='n' data-testid='ft-stat-modelCount'>
            {values.modelCount}
          </div>
          <div className='l'>免费模型 · 已收录</div>
        </div>
        <div className='stat'>
          <div className='n' data-testid='ft-stat-platformCount'>
            {values.platformCount}
          </div>
          <div className='l'>平台收录</div>
        </div>
        <div className='stat'>
          <div className='n' data-testid='ft-stat-maxContext'>
            {values.maxCtx}
          </div>
          <div className='l'>最大上下文窗口</div>
        </div>
        <div className='stat'>
          <div className='n' data-testid='ft-stat-cost'>
            ¥0
          </div>
          <div className='l'>使用成本</div>
        </div>
      </div>
    </div>
  )
}
