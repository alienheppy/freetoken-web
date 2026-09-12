'use client'

import { useMemo } from 'react'

import { platformCards } from '../lib/modelView'

/**
 * 平台一览（原设计 .plats / .pcard 结构）
 * 平台名与收录数由已发布模型行的 ext.platforms 并集派生；
 * 「已核实」= 该平台下所有模型行均为 verified（不含 pending/duplicate），
 * 不输出任何未经核实的健康声明；平台描述/注册网址需在 Notion 侧维护（ext 尚未承载）。
 */
export default function PlatformGrid({ models }) {
  const platforms = useMemo(() => platformCards(models), [models])

  if (platforms.length === 0) {
    return (
      <div className='plats' data-testid='ft-platforms'>
        <div className='empty'>暂无可汇总的平台数据，等待 Notion 后台同步。</div>
      </div>
    )
  }

  return (
    <div className='plats' data-testid='ft-platforms'>
      {platforms.map(platform => (
        <div className='pcard' key={platform.name} data-testid='ft-platform'>
          <h3>
            {platform.name}{' '}
            <span className={'badge ' + (platform.verified ? 'ok' : 'todo')}>
              {platform.verified ? '已核实' : '待核实'}
            </span>
          </h3>
          {platform.limits && <p>{platform.limits}</p>}
          <div className='lim'>
            {platform.verified && platform.verifiedAt
              ? `核实于 ${platform.verifiedAt}`
              : '待核实'}
          </div>
          <div className='pcount'>{platform.count} 个模型</div>
        </div>
      ))}
    </div>
  )
}
