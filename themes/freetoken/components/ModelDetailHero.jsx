'use client'

import SmartLink from '@/components/SmartLink'
import { siteConfig } from '@/lib/config'

import CONFIG from '../config'
import {
  fmtCtx,
  isStale,
  normalizePricingLabel,
  pricingStatus
} from '../lib/adaptModel'
import { daysFrom } from '../lib/modelView'

/**
 * 详情页头部（原设计 model/[slug]/page.jsx 的 .hero 区块）
 * 结构：返回模型库 / [eyebrow(provider) / h1 / herosub / heropills] + 可选推广图
 * heropills：定价 · 上下文 · 视觉输入 · 工具调用 · 深度推理 · OpenAI 兼容 · 核实日期 · 过期警示
 */
export default function ModelDetailHero({ model, today }) {
  if (!model) return null

  const stale = isStale(model, today)
  const priceTone = pricingStatus(model.pricing)
  const priceLabel =
    priceTone === 'paid' ? '付费' : normalizePricingLabel(model.pricing)
  const hasPromo = Boolean(model.promoImageUrl && model.promoUrl)

  return (
    <div
      className={'hero' + (hasPromo ? ' has-promo' : '')}
      data-testid='ft-detail-hero'
    >
      <SmartLink href='/#models' className='back'>
        <span className='chev'>‹</span>
        {siteConfig('FREETOKEN_DETAIL_BACK', null, CONFIG)}
      </SmartLink>
      <div className='hero-main'>
        <div className='hero-copy'>
          {model.provider && <div className='eyebrow'>{model.provider}</div>}
          <h1>{model.name}</h1>
          {model.desc && <div className='herosub'>{model.desc}</div>}
          <div className='heropills'>
            <span
              className={'hpill' + (priceTone === 'unknown' ? '' : ' dark')}
            >
              {priceLabel}
            </span>
            <span className='hpill'>上下文 {fmtCtx(model.context)}</span>
            <span className='hpill'>{model.inputModality}</span>
            {model.tools && <span className='hpill'>工具调用</span>}
            {model.reasoning && <span className='hpill'>深度推理</span>}
            <span className='hpill'>OpenAI 兼容</span>
            {model.verifiedAt && (
              <span className='hpill'>
                核实 {model.verifiedAt} · 距今{' '}
                {daysFrom(model.verifiedAt, today)} 天
              </span>
            )}
            {stale && <span className='hpill warn'>信息可能过期</span>}
          </div>
        </div>

        {hasPromo && (
          <a
            className='hero-promo'
            href={model.promoUrl}
            target='_blank'
            rel='noopener noreferrer sponsored'
            title={model.promoText || undefined}
            aria-label={`打开 ${
              model.promoAlt || model.name
            } 推广链接（新窗口）`}
            data-testid='ft-hero-promo'
          >
            <img
              src={model.promoImageUrl}
              alt={model.promoAlt || `${model.name} 推广图`}
              width='334'
              height='152'
              loading='eager'
              decoding='async'
            />
          </a>
        )}
      </div>
    </div>
  )
}
