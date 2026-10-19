'use client'

import { useMemo, useState } from 'react'

import SmartLink from '@/components/SmartLink'

import { siteConfig } from '@/lib/config'

import CONFIG from '../config'
import { paginate, platformCards, platformHref } from '../lib/modelView'
import Pagination from './Pagination'

/**
 * 平台一览（原设计 .plats / .pcard 结构）
 * 收录数由已发布模型行的 ext.platforms 并集派生；
 * 方案A：平台名/简介/网址来自「平台档案」（type=Platform 行），一眼可核对并前往官网；
 * 徽标文案来自平台档案的「平台认证」标签：选中即展示该标签，未选则弱化为「待核实」，
 * 不输出任何未经后台确认的健康声明。
 *
 * 整卡可点 + 悬停动效（与模型卡 .mcard 一致）：卡片标题用「拉伸链接」铺满整卡，
 * 点击进入平台详情页（该平台的免费模型列表）；「前往官网」是独立外链，
 * 通过样式提到覆盖层之上，保持可点（避免 <a> 嵌套 <a>）。
 *
 * 平台数量随收录增长，与模型库一致在前端分页（每页 9 张 = 3 列 × 3 行）。
 */
export default function PlatformGrid({ models, platformProfiles, stats }) {
  const platforms = useMemo(
    // stats.platformCounts 为服务端全量口径的「平台 → 模型数」：
    // 首页 models 会被 POSTS_PER_PAGE 截断，只靠它数会偏小（实测 Apinex 7 → 5）。
    () => platformCards(models, platformProfiles, stats?.platformCounts),
    [models, platformProfiles, stats]
  )
  const [page, setPage] = useState(1)
  const perPage = Number(
    siteConfig('FREETOKEN_PLATFORMS_PER_PAGE', 9, CONFIG)
  )
  const paged = useMemo(
    () => paginate(platforms, page, perPage),
    [platforms, page, perPage]
  )

  if (platforms.length === 0) {
    return (
      <div className='plats' data-testid='ft-platforms'>
        <div className='empty'>暂无可汇总的平台数据，等待 Notion 后台同步。</div>
      </div>
    )
  }

  return (
    <>
      <div className='plats' data-testid='ft-platforms'>
        {paged.items.map(platform => (
          <div className='pcard' key={platform.name} data-testid='ft-platform'>
            <h3>
              <SmartLink href={platformHref(platform.name)} className='pname'>
                {platform.name}
              </SmartLink>{' '}
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
            {/* 底栏与模型卡 .ctxrow 同构：左边说明文字，右边数字。
                原文案「N 个模型」把标签和数字写在一起，视觉上不成对齐的一行。 */}
            <div className='ctxrow'>
              <span>免费模型提供</span>
              <b>{platform.count}</b>
            </div>
          </div>
        ))}
      </div>
      <Pagination
        page={paged.page}
        totalPage={paged.totalPage}
        onPageChange={setPage}
        testId='ft-platform-pager'
        ariaLabel='平台分页'
      />
    </>
  )
}
