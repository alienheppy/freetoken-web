'use client'

import { useMemo } from 'react'
import { platformSummary } from '../lib/adaptModel'

/**
 * 平台一览：从已发布模型行的 ext.platforms 做并集汇总
 * 只展示平台名与收录模型数 —— 不拼凑任何未经实测的平台状态（如“接口正常”）
 */
export default function PlatformGrid({ models }) {
  const platforms = useMemo(() => platformSummary(models), [models])

  if (platforms.length === 0) {
    return (
      <div className='mt-8 p-8 ft-card text-center text-[var(--ft-sub)]'>
        暂无可汇总的平台数据，等待 Notion 后台同步。
      </div>
    )
  }

  return (
    <div className='mt-8 grid gap-4 md:grid-cols-3'>
      {platforms.map(platform => (
        <div key={platform.name} className='ft-card p-5' data-testid='ft-platform'>
          <h3 className='font-semibold'>{platform.name}</h3>
          <div className='ft-platcount'>{platform.count} 个模型</div>
        </div>
      ))}
    </div>
  )
}
