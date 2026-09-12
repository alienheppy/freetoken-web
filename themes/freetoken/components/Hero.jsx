'use client'

import { siteConfig } from '@/lib/config'
import CONFIG from '../config'

/**
 * 首页 Hero（原设计 page.jsx 的 .hero 区块）
 * 标题默认取 CONFIG.FREETOKEN_HERO_TITLE（'\n' 渲染为 <br/>）
 */
export default function Hero() {
  const eyebrow = siteConfig('FREETOKEN_HERO_EYEBROW', null, CONFIG)
  const title = String(siteConfig('FREETOKEN_HERO_TITLE', null, CONFIG) || '')
  const sub = siteConfig('FREETOKEN_HERO_SUB', null, CONFIG)
  const primary = siteConfig('FREETOKEN_HERO_CTA_PRIMARY', null, CONFIG)
  const secondary = siteConfig('FREETOKEN_HERO_CTA_SECONDARY', null, CONFIG)
  const lines = title.split('\n')

  return (
    <div className='hero' data-testid='ft-hero'>
      <div className='eyebrow'>{eyebrow}</div>
      <h1 data-testid='ft-hero-title'>
        {lines.map((line, index) => (
          <span key={`${index}-${line}`}>
            {line}
            {index < lines.length - 1 ? <br /> : null}
          </span>
        ))}
      </h1>
      <div className='sub'>{sub}</div>
      <div className='cta'>
        <a className='btn btn-primary' href='#models'>
          {primary}
        </a>
        <a className='btn btn-ghost' href='#platforms'>
          {secondary}
        </a>
      </div>
    </div>
  )
}
