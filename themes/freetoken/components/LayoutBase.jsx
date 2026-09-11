'use client'

import { siteConfig } from '@/lib/config'
import { useGlobal } from '@/lib/global'
import CONFIG from '../config'
import { Style } from '../style'
import NavMenu from './NavMenu'
import SideMenu from './SideMenu'
import Footer from './Footer'

/**
 * 基础布局
 * 保留 Freetoken 顶部导航、左侧菜单、深色模式、页脚
 * 菜单优先级：Notion Menu/SubMenu（customMenu）→ Page 导航（customNav）→ 内置回退菜单
 */
export default function LayoutBase(props) {
  const { children, customMenu, customNav, categoryOptions, siteInfo } = props
  const { onLoading } = useGlobal()

  const menu =
    customMenu?.length > 0
      ? customMenu
      : customNav?.length > 0
        ? customNav
        : CONFIG.FREETOKEN_FALLBACK_MENU

  const logoText = siteConfig('FREETOKEN_LOGO_TEXT', null, CONFIG)

  return (
    <div id='theme-freetoken' className='scroll-smooth'>
      <Style />
      <NavMenu logoText={logoText} siteInfo={siteInfo} menu={menu} />

      <div className='flex justify-center w-full'>
        <aside className='hidden lg:block w-64 shrink-0 sticky top-0 h-screen overflow-y-auto px-4 pt-24 pb-8'>
          <SideMenu
            menu={menu}
            categoryOptions={categoryOptions}
            siteInfo={siteInfo}
          />
        </aside>

        <main className='flex-1 min-w-0 max-w-[980px] w-full'>
          <div className='min-h-[calc(100vh-200px)] pt-16 lg:pt-6 pb-20'>
            {children}
          </div>
          <Footer siteInfo={siteInfo} />
        </main>
      </div>
    </div>
  )
}
