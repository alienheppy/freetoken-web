'use client'

import { siteConfig } from '@/lib/config'
import CONFIG from '../config'

/**
 * 全站页脚（原设计 layout.jsx 的 footer > .footin）
 * 第二行「站点由 Notion Next 强力驱动 · 最近核实 YYYY-MM-DD」，
 * 「Notion Next」链接到官方仓库，方便访客了解站点所用框架；
 * 日期取已发布模型行最近一次核实日期
 */
export default function Footer({ siteInfo, latestVerifiedAt }) {
  const text = siteConfig('FREETOKEN_FOOTER_TEXT', null, CONFIG)

  return (
    <footer>
      <div className='footin'>
        <div>{text}</div>
        <div className='sep' />
        <div>
          站点由{' '}
          <a
            href='https://github.com/notionnext-org/NotionNext'
            target='_blank'
            rel='noopener noreferrer'>
            Notion Next
          </a>{' '}
          强力驱动
          {latestVerifiedAt ? ` · 最近核实 ${latestVerifiedAt}` : ''}
        </div>
      </div>
    </footer>
  )
}
