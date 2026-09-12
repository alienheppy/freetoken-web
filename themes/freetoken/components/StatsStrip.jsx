'use client'

import { useMemo } from 'react'

import { fmtCtx } from '../lib/adaptModel'
import { maxContext, platformCards } from '../lib/modelView'

/**
 * 首页统计条（原设计 .strip / .stripin / .stat）
 * 四项与原设计一一对应：免费模型·已收录 / 平台收录 / 最大上下文窗口 / 使用成本 ¥0
 * 数值全部来自已发布模型行的 ext 数据，无硬编码占位
 */
export default function StatsStrip({ models }) {
  const stats = useMemo(() => {
    const list = Array.isArray(models)
      ? models.filter(m => m && typeof m === 'object')
      : []
    return {
      modelCount: list.length,
      platformCount: platformCards(list).length,
      maxCtx: fmtCtx(maxContext(list))
    }
  }, [models])

  return (
    <div className='strip' data-testid='ft-stats'>
      <div className='stripin'>
        <div className='stat'>
          <div className='n' data-testid='ft-stat-modelCount'>
            {stats.modelCount}
          </div>
          <div className='l'>免费模型 · 已收录</div>
        </div>
        <div className='stat'>
          <div className='n' data-testid='ft-stat-platformCount'>
            {stats.platformCount}
          </div>
          <div className='l'>平台收录</div>
        </div>
        <div className='stat'>
          <div className='n' data-testid='ft-stat-maxContext'>
            {stats.maxCtx}
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
