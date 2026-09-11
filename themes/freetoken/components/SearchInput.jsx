'use client'

import { useGlobal } from '@/lib/global'
import { useRouter } from 'next/router'
import { useImperativeHandle, useRef, useState } from 'react'

const FALLBACK_PLACEHOLDER = '搜索模型或厂商'

/**
 * Freetoken 搜索输入框（主题本地实现）
 *
 * 官方约定：主题不得跨目录引用其它主题的 UI 组件（见
 * docs/developer/THEME_MIGRATION_GUIDE.zh-CN.md 第 2、10 节），
 * 因此本组件在 themes/freetoken 内独立实现，保持与官方 example 主题
 * SearchInput 相同的对外契约：props = { currentTag, keyword, cRef }。
 *
 * 交互：回车 / 点击放大镜跳转 `/search/<关键词>`，ESC 清空，中文输入法组合态不误触发。
 */
const SearchInput = ({ currentTag, keyword, cRef }) => {
  const { locale } = useGlobal()
  const router = useRouter()
  const searchInputRef = useRef(null)
  const composingRef = useRef(false)
  const [showClean, setShowClean] = useState(Boolean(keyword))

  useImperativeHandle(cRef, () => ({
    focus: () => {
      searchInputRef?.current?.focus()
    }
  }))

  const placeholder = currentTag
    ? `${locale?.SEARCH?.TAGS || '搜索标签'} #${currentTag}`
    : locale?.SEARCH?.ARTICLES || FALLBACK_PLACEHOLDER

  const handleSearch = () => {
    const key = (searchInputRef.current?.value || '').trim()
    if (key) {
      router.push({ pathname: '/search/' + key })
    } else {
      router.push({ pathname: '/' })
    }
  }

  const cleanSearch = () => {
    if (searchInputRef.current) {
      searchInputRef.current.value = ''
    }
    setShowClean(false)
  }

  const handleKeyUp = e => {
    if (e.key === 'Enter') {
      handleSearch()
    } else if (e.key === 'Escape') {
      cleanSearch()
    }
  }

  const handleChange = e => {
    if (composingRef.current) return
    setShowClean(Boolean(e.target.value))
  }

  return (
    <section className='ft-search w-full'>
      <input
        ref={searchInputRef}
        type='text'
        placeholder={placeholder}
        defaultValue={keyword || ''}
        onKeyUp={handleKeyUp}
        onChange={handleChange}
        onCompositionStart={() => {
          composingRef.current = true
        }}
        onCompositionUpdate={() => {
          composingRef.current = true
        }}
        onCompositionEnd={e => {
          composingRef.current = false
          handleChange(e)
        }}
      />
      <button
        type='button'
        aria-label='搜索'
        className='ft-search-btn'
        onClick={handleSearch}>
        <i className='fas fa-search' />
      </button>
      {showClean && (
        <button
          type='button'
          aria-label='清空搜索'
          className='ft-search-btn'
          onClick={cleanSearch}>
          <i className='fas fa-times' />
        </button>
      )}
    </section>
  )
}

export default SearchInput
