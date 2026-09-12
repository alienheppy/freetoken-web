'use client'

import SmartLink from '@/components/SmartLink'
import Collapse from '@/components/Collapse'
import { useState } from 'react'

/**
 * 菜单标题兼容：Notion Menu/SubMenu 用 title，Page 导航（customNav）用 name
 */
const linkLabel = link => link?.title || link?.name || ''
const linkKey = link => link?.href || linkLabel(link)

/** 仅隐藏显式 show === false 的项（customNav 老数据兼容） */
const visibleItems = menu =>
  (Array.isArray(menu) ? menu : []).filter(
    link => link && link.show !== false && (link.href || linkLabel(link))
  )

/**
 * 左侧自定义菜单
 * 兼容 Notion Menu/SubMenu 结构（含 customNav 的 name 字段），可回退到 categoryOptions
 * SubMenu 折叠开关用 button 实现，支持键盘（Tab/Enter）操作与 aria-expanded 语义
 */
export default function SideMenu({ menu, categoryOptions }) {
  const [openKey, setOpenKey] = useState(null)
  const items = visibleItems(menu)

  return (
    <div className='space-y-1' data-testid='ft-side-menu'>
      <div className='text-xs font-semibold text-[var(--ft-faint)] uppercase tracking-wider mb-3 px-2'>
        导航
      </div>
      {items.map((link, index) => {
        const hasSub = Array.isArray(link?.subMenus) && link.subMenus.length > 0
        const key = linkKey(link) || String(index)
        const isOpen = openKey === key
        const inner = (
          <>
            {link.icon && <i className={`${link.icon} mr-2`} />}
            <span>{linkLabel(link)}</span>
          </>
        )
        return (
          <div key={key}>
            {!hasSub ? (
              <SmartLink
                href={link.href || '/'}
                className='flex items-center px-2 py-2 rounded-lg text-sm font-semibold text-[var(--ft-sub)] hover:text-[var(--ft-txt)] hover:bg-[var(--ft-bg-alt)] transition-colors'>
                {inner}
              </SmartLink>
            ) : (
              <button
                type='button'
                aria-expanded={isOpen}
                onClick={() => setOpenKey(isOpen ? null : key)}
                className='w-full flex items-center justify-between px-2 py-2 rounded-lg text-sm font-semibold text-[var(--ft-sub)] hover:text-[var(--ft-txt)] hover:bg-[var(--ft-bg-alt)] transition-colors'>
                <span className='flex items-center'>{inner}</span>
                <i
                  className={`fas fa-chevron-left text-xs transition-transform ${
                    isOpen ? '-rotate-90' : ''
                  }`}
                />
              </button>
            )}
            {hasSub && (
              <Collapse isOpen={isOpen}>
                {link.subMenus.map((sub, subIndex) => (
                  <div key={linkKey(sub) || subIndex} className='pl-6 py-1'>
                    <SmartLink
                      href={sub.href || '/'}
                      className='text-xs font-semibold text-[var(--ft-faint)] hover:text-[var(--ft-txt)]'>
                      {sub.icon && <i className={`${sub.icon} mr-2`} />}
                      {linkLabel(sub)}
                    </SmartLink>
                  </div>
                ))}
              </Collapse>
            )}
          </div>
        )
      })}

      {categoryOptions?.length > 0 && (
        <>
          <div className='text-xs font-semibold text-[var(--ft-faint)] uppercase tracking-wider mt-6 mb-3 px-2'>
            分类
          </div>
          {categoryOptions.map(cat => (
            <SmartLink
              key={cat.name}
              href={`/category/${cat.name}`}
              className='block px-2 py-1.5 text-sm text-[var(--ft-sub)] hover:text-[var(--ft-txt)]'>
              {cat.name} ({cat.count})
            </SmartLink>
          ))}
        </>
      )}
    </div>
  )
}
