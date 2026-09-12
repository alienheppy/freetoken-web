'use client'

import { siteConfig } from '@/lib/config'
import CONFIG from '../config'

/**
 * 全站页脚（原设计 layout.jsx 的 footer > .footin）
 * 第二行「数据由 Notion 后台同步 · 最近核实 YYYY-MM-DD」，日期取已发布模型行最近一次核实日期
 */
export default function Footer({ siteInfo, latestVerifiedAt }) {
  const text = siteConfig('FREETOKEN_FOOTER_TEXT', null, CONFIG)

  return (
    <footer>
      <div className='footin'>
        <div>{text}</div>
        <div className='sep' />
        <div>
          数据由 Notion 后台同步
          {latestVerifiedAt ? ` · 最近核实 ${latestVerifiedAt}` : ''}
        </div>
      </div>
    </footer>
  )
}
