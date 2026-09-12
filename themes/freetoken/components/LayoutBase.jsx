'use client'

import { siteConfig } from '@/lib/config'
import CONFIG from '../config'
import { adaptPosts } from '../lib/adaptModel'
import { latestVerifiedAt } from '../lib/modelView'
import { Style } from '../style'
import BackToTop from './BackToTop'
import Footer from './Footer'
import NavMenu from './NavMenu'

/**
 * 基础布局：原设计 layout.jsx 的 DOM 顺序（nav → children → BackToTop → footer）
 * 无左侧边栏；菜单优先级：Notion customMenu → customNav → 内置回退（原设计三链接）
 */
export default function LayoutBase(props) {
  const { children, customMenu, customNav, siteInfo, allNavPages } = props

  const menu =
    customMenu?.length > 0
      ? customMenu
      : customNav?.length > 0
        ? customNav
        : CONFIG.FREETOKEN_FALLBACK_MENU

  const logoText = siteConfig('FREETOKEN_LOGO_TEXT', null, CONFIG)
  const latestVerified = latestVerifiedAt(adaptPosts(allNavPages))

  return (
    <div id='theme-freetoken'>
      <Style />
      <NavMenu logoText={logoText} siteInfo={siteInfo} menu={menu} />
      {children}
      <BackToTop />
      <Footer siteInfo={siteInfo} latestVerifiedAt={latestVerified} />
    </div>
  )
}
