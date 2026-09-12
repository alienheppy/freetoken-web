'use client'

import SmartLink from '@/components/SmartLink'
import { siteConfig } from '@/lib/config'

import CONFIG from '../config'
import { offerRows } from '../lib/modelView'
import StatusBadge from './StatusBadge'

/**
 * 详情页「免费获取渠道」区块（原设计 .offers / .orow）
 * 每行：平台名 + 核实徽标 + 额度说明 + 核实状态 + 前往（外链）
 * 「前往」只在模型行 ext.sourceUrl 存在时出链——不臆造平台注册网址
 */
export default function ModelOffers({ model }) {
  const rows = offerRows(model)

  if (rows.length === 0) {
    return (
      <div className='offers' data-testid='ft-offers'>
        <div className='empty'>
          {siteConfig('FREETOKEN_DETAIL_EMPTY_OFFERS', null, CONFIG)}
        </div>
      </div>
    )
  }

  return (
    <div className='offers' data-testid='ft-offers'>
      {rows.map(row => (
        <div className='orow' key={row.name}>
          <div className='oname'>
            {row.name} <StatusBadge status={model.verificationStatus} />
          </div>
          {row.limits && <div className='olim'>{row.limits}</div>}
          <span className={'st ' + (row.verified ? 'ok' : 'todo')}>
            <i />
            {row.verified && row.verifiedAt
              ? `核实于 ${row.verifiedAt}`
              : '待核实'}
          </span>
          {row.url ? (
            <SmartLink
              href={row.url}
              className='obtn'
              aria-label={`前往 ${row.name}`}>
              前往
            </SmartLink>
          ) : null}
        </div>
      ))}
    </div>
  )
}
