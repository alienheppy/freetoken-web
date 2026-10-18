'use client'

import { useEffect, useState } from 'react'

import SmartLink from '@/components/SmartLink'
import CONFIG from '../config'

/**
 * 顶部导航（原设计 layout.jsx 的 nav > .navin > .logo + .navlinks）
 * 菜单标题兼容：Notion Menu/SubMenu 用 title，Page 导航（customNav）用 name
 * SubMenu 以 hover 下拉渲染（视觉复用原设计的 .sortmenu 样式）
 */
const linkLabel = link => link?.title || link?.name || ''
const linkKey = link => link?.href || linkLabel(link)

const isEnglishMenuLink = link => {
  if (!CONFIG.FREETOKEN_HIDE_ENGLISH_MENU) return false
  if (linkLabel(link).trim().toLowerCase() === 'english') return true

  const href = typeof link?.href === 'string' ? link.href.trim() : ''
  if (!href) return false

  const pathname = href
    .replace(/^https?:\/\/[^/]+/i, '')
    .split(/[?#]/)[0]
  return /(?:^|\/)en\/?$/i.test(pathname)
}

/** 仅隐藏显式 show === false 的项；未标注 show 的一律显示（customNav 老数据兼容） */
const visibleItems = menu =>
  (Array.isArray(menu) ? menu : []).filter(
    link =>
      link &&
      link.show !== false &&
      !isEnglishMenuLink(link) &&
      (link.href || linkLabel(link))
  )

const subItems = link =>
  (Array.isArray(link?.subMenus) ? link.subMenus : []).filter(
    sub =>
      sub &&
      sub.show !== false &&
      !isEnglishMenuLink(sub) &&
      (sub.href || linkLabel(sub))
  )

export default function NavMenu({ logoText, siteInfo, menu, linkHref }) {
  const [open, setOpen] = useState(false)
  const [openSubmenu, setOpenSubmenu] = useState(null)
  const items = visibleItems(menu)
  const resolveHref = href => {
    if (!linkHref) return href || '/'
    if (typeof href === 'string' && href === '#') return linkHref
    if (typeof href === 'string' && href.startsWith('#')) return href
    return linkHref
  }
  const closeMenu = () => {
    setOpen(false)
    setOpenSubmenu(null)
  }

  useEffect(() => {
    if (!open) return
    const handleScroll = () => closeMenu()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [open])

  return (
    <nav>
      <div className='navin'>
        <SmartLink href={resolveHref('/')} className='logo'>
          {logoText || siteInfo?.title || 'FreeTokenHub'}
        </SmartLink>

        <button
          type='button'
          className={'navtoggle' + (open ? ' open' : '')}
          aria-label={open ? '关闭菜单' : '打开菜单'}
          aria-controls='ft-mobile-menu'
          aria-expanded={open}
          onClick={() => {
            if (open) closeMenu()
            else setOpen(true)
          }}
        >
          <span />
          <span />
          <span />
        </button>

        <div
          id='ft-mobile-menu'
          className={'navlinks' + (open ? ' open' : '')}
          data-testid='ft-navlinks'
        >
          {items.map(link => {
            const subs = subItems(link)
            if (subs.length === 0) {
              return (
                <SmartLink
                  key={linkKey(link)}
                  href={resolveHref(link.href || '/')}
                  onClick={closeMenu}
                >
                  {linkLabel(link)}
                </SmartLink>
              )
            }
            const submenuOpen = openSubmenu === linkKey(link)
            return (
              <div className='navdd' key={linkKey(link)}>
                <div className={'navbtn' + (submenuOpen ? ' open' : '')}>
                  <SmartLink
                    href={resolveHref(link.href || '/')}
                    onClick={closeMenu}
                  >
                    {linkLabel(link)}
                  </SmartLink>
                  <button
                    type='button'
                    className='navsubtoggle'
                    aria-label={`${submenuOpen ? '收起' : '展开'}${linkLabel(link)}子菜单`}
                    aria-expanded={submenuOpen}
                    onClick={() =>
                      setOpenSubmenu(current =>
                        current === linkKey(link) ? null : linkKey(link)
                      )
                    }
                  >
                    <span className='caret'>▾</span>
                  </button>
                </div>
                <div
                  className={'navmenu' + (submenuOpen ? ' open' : '')}
                  data-testid='ft-navmenu'
                >
                  {subs.map(sub => (
                    <SmartLink
                      key={linkKey(sub)}
                      href={resolveHref(sub.href || '/')}
                      onClick={closeMenu}
                    >
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
