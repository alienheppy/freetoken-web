'use client'

import SmartLink from '@/components/SmartLink'

/**
 * 顶部导航（原设计 layout.jsx 的 nav > .navin > .logo + .navlinks）
 * 菜单标题兼容：Notion Menu/SubMenu 用 title，Page 导航（customNav）用 name
 * SubMenu 以 hover 下拉渲染（视觉复用原设计的 .sortmenu 样式）
 */
const linkLabel = link => link?.title || link?.name || ''
const linkKey = link => link?.href || linkLabel(link)

/** 仅隐藏显式 show === false 的项；未标注 show 的一律显示（customNav 老数据兼容） */
const visibleItems = menu =>
  (Array.isArray(menu) ? menu : []).filter(
    link => link && link.show !== false && (link.href || linkLabel(link))
  )

const subItems = link =>
  (Array.isArray(link?.subMenus) ? link.subMenus : []).filter(
    sub => sub && sub.show !== false && (sub.href || linkLabel(sub))
  )

export default function NavMenu({ logoText, siteInfo, menu }) {
  const items = visibleItems(menu)

  return (
    <nav>
      <div className='navin'>
        <SmartLink href='/' className='logo'>
          {logoText || siteInfo?.title || 'FreeTokenHub'}
        </SmartLink>

        <div className='navlinks' data-testid='ft-navlinks'>
          {items.map(link => {
            const subs = subItems(link)
            if (subs.length === 0) {
              return (
                <SmartLink key={linkKey(link)} href={link.href || '/'}>
                  {linkLabel(link)}
                </SmartLink>
              )
            }
            return (
              <div className='navdd' key={linkKey(link)}>
                <SmartLink href={link.href || '/'} className='navbtn'>
                  {linkLabel(link)}
                  <span className='caret'>▾</span>
                </SmartLink>
                <div className='navmenu' data-testid='ft-navmenu'>
                  {subs.map(sub => (
                    <SmartLink key={linkKey(sub)} href={sub.href || '/'}>
                      {linkLabel(sub)}
                    </SmartLink>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
