'use client'

import SmartLink from '@/components/SmartLink'

/**
 * 详情页「免费获取渠道」区块（原设计 .offers / .orow）
 * 数据源（一期）：模型 Post 页内嵌明细表（child_database），架构师层
 * lib/offerBlocks.collectOfferRows() 服务端解析后经 props.rows 下发。
 * 每行：名称 + 简介 + 前往（外链）。「快速接入」curl 块一期隐藏（见 freetoken-roadmap）。
 */
export default function ModelOffers({ model, rows }) {
  const list = Array.isArray(rows)
    ? rows.filter(r => r && typeof r === 'object')
    : []

  if (list.length === 0) {
    return (
      <div className='offers' data-testid='ft-offers'>
        <div className='empty'>暂无已收录的免费获取渠道。</div>
      </div>
    )
  }

  return (
    <div className='offers' data-testid='ft-offers'>
      {list.map((row, i) => (
        <div className='orow' key={row.name + i}>
          <div className='oname'>{row.name}</div>
          {row.desc && <div className='olim'>{row.desc}</div>}
          {row.url ? (
            <SmartLink
              href={row.url}
              className='obtn'
              target='_blank'
              rel='noopener noreferrer'
              aria-label={`前往 ${row.name}`}>
              前往
            </SmartLink>
          ) : null}
        </div>
      ))}
    </div>
  )
}
