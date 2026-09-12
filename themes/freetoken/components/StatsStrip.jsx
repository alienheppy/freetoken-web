'use client'

import { useMemo } from 'react'
import { statsFromModels } from '../lib/adaptModel'

/**
 * 首页统计条：模型数 / 平台并集数 / 能力标签数 / 临近复核数
 * 全部来自 statsFromModels 纯函数（真实 ext 数据，无硬编码占位）
 */
export default function StatsStrip({ models, today }) {
  const stats = useMemo(() => statsFromModels(models, today), [models, today])
  const caps = stats.capabilityCounts
  const capabilityTotal = caps.vision + caps.tools + caps.reasoning

  return (
    <section className='ft-strip mt-16 rounded-2xl' data-testid='ft-stats'>
      <div className='ft-strip-in'>
        <div className='ft-stat'>
          <div className='n' data-testid='ft-stat-modelCount'>
            {stats.modelCount}
          </div>
          <div className='l'>已收录模型</div>
        </div>
        <div className='ft-stat'>
          <div className='n' data-testid='ft-stat-platformCount'>
            {stats.platformCount}
          </div>
          <div className='l'>覆盖平台</div>
        </div>
        <div className='ft-stat'>
          <div className='n' data-testid='ft-stat-capabilityTotal'>
            {capabilityTotal}
          </div>
          <div className='l'>能力标签</div>
        </div>
        <div className='ft-stat'>
          <div className='n' data-testid='ft-stat-reviewSoonCount'>
            {stats.reviewSoonCount}
          </div>
          <div className='l'>临近复核</div>
        </div>
        <div className='ft-strip-caps'>
          能力明细：视觉 {caps.vision} · 工具 {caps.tools} · 推理 {caps.reasoning}
        </div>
      </div>
    </section>
  )
}
