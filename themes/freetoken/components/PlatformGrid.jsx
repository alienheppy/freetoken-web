'use client'

import { useMemo } from 'react'

import { platformCards } from '../lib/modelView'

/**
 * 平台一览（原设计 .plats / .pcard 结构）
 * 收录数由已发布模型行的 ext.platforms 并集派生；
 * 方案A：平台名/简介/网址来自「平台档案」（type=Platform 行），一眼可核对并前往官网；
 * 徽标文案来自平台档案的「平台认证」标签：选中即展示该标签，未选则弱化为「待核实」，
 * 不输出任何未经后台确认的健康声明。
 */
export default function PlatformGrid({ models, platformProfiles }) {
  const platforms = useMemo(
    () => platformCards(models, platformProfiles),
    [models, platformProfiles]
  )

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
            <span className={'badge ' + (platform.certified ? 'ok' : 'todo')}>
              {platform.certified ? platform.certifications[0] : '待核实'}
            </span>
          </h3>
          {platform.limits && <p>{platform.limits}</p>}
          {platform.url && (
            <div className='plimk'>
              <a href={platform.url} target='_blank' rel='noopener noreferrer'>
                前往官网 ↗
              </a>
            </div>
          )}
          {platform.certified && platform.verifiedAt && (
            <div className='lim'>{`核实于 ${platform.verifiedAt}`}</div>
          )}
          <div className='pcount'>{platform.count} 个模型</div>
        </div>
      ))}
    </div>
  )
}
