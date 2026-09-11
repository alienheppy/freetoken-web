'use client'

import SmartLink from '@/components/SmartLink'
import DarkModeButton from '@/components/DarkModeButton'
import { useState } from 'react'

/**
 * 菜单标题兼容：Notion Menu/SubMenu 用 title，Page 导航（customNav）用 name
 */
const linkLabel = link => link?.title || link?.name || ''
const linkKey = link => link?.href || linkLabel(link)

/**
 * 顶部导航
 * 复用 Freetoken 苹果风：毛玻璃背景、精简链接、48px 高
 * 兼容 link.title / link.name 与 SubMenu；移动端点击链接后自动关闭
 */
export default function NavMenu({ logoText, siteInfo, menu }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const closeMobile = () => setMobileOpen(false)

  return (
    <nav
      className='fixed top-0 left-0 right-0 z-50 h-12'
      style={{
        background: 'rgba(255,255,255,0.72)',
        backdropFilter: 'saturate(180%) blur(20px)',
        WebkitBackdropFilter: 'saturate(180%) blur(20px)',
        borderBottom: '1px solid var(--ft-hairline)'
      }}>
      <div className='ft-container h-full flex items-center justify-between'>
        <SmartLink
          href='/'
          onClick={closeMobile}
          className='font-semibold text-[17px] tracking-tight text-[var(--ft-txt)]'>
          {logoText || siteInfo?.title || 'FreeTokenHub'}
        </SmartLink>

        <div className='hidden md:flex items-center gap-7 text-xs text-[var(--ft-sub)]'>
          {menu?.map(
            link =>
              link?.show && (
                <SmartLink
                  key={linkKey(link)}
                  href={link.href || '/'}
                  className='hover:text-[var(--ft-txt)] transition-colors'>
                  {linkLabel(link)}
                </SmartLink>
              )
          )}
          <DarkModeButton className='ml-2' />
        </div>

        <div className='flex md:hidden items-center gap-3'>
          <DarkModeButton />
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className='text-[var(--ft-txt)] text-lg'
            aria-label='切换菜单'>
            <i className={mobileOpen ? 'fas fa-times' : 'fas fa-bars'} />
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className='md:hidden absolute top-12 left-0 right-0 bg-[var(--ft-bg)] border-b border-[var(--ft-hairline)] px-6 py-4 shadow-lg'>
          {menu?.map(
            link =>
              link?.show && (
                <div key={linkKey(link)}>
                  <SmartLink
                    href={link.href || '/'}
                    onClick={closeMobile}
                    className='block py-2 text-sm text-[var(--ft-sub)] hover:text-[var(--ft-txt)]'>
                    {linkLabel(link)}
                  </SmartLink>
                  {link.subMenus?.map(
                    sub =>
                      sub?.show !== false && (
                        <SmartLink
                          key={`${linkKey(link)}-${linkKey(sub)}`}
                          href={sub.href || '/'}
                          onClick={closeMobile}
                          className='block py-1.5 pl-4 text-xs text-[var(--ft-faint)] hover:text-[var(--ft-txt)]'>
                          {linkLabel(sub)}
                        </SmartLink>
                      )
                  )}
                </div>
              )
          )}
        </div>
      )}
    </nav>
  )
}
