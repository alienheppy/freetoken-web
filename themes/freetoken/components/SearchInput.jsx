'use client'

import { useGlobal } from '@/lib/global'
import { useRouter } from 'next/router'
import { useImperativeHandle, useRef, useState } from 'react'

const FALLBACK_PLACEHOLDER = '搜索模型或厂商'

/**
 * 站内搜索输入框（主题本地实现，契约同官方 example 主题：props = { currentTag, keyword, cRef }）
 *
 * 交互：回车 / 点击搜索跳转 `/search/<关键词>`，ESC 清空，中文输入法组合态不误触发。
 * 样式使用移植后的原设计 class（.toolbar / .search / .chip）。
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
    <div className='toolbar' data-testid='ft-site-search'>
      <input
        ref={searchInputRef}
        className='search'
        type='text'
        aria-label='站内搜索'
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
      <button type='button' className='chip' aria-label='搜索' onClick={handleSearch}>
        搜索
      </button>
      {showClean && (
        <button
          type='button'
          className='chip'
          aria-label='清空搜索'
          onClick={cleanSearch}>
          清空
        </button>
      )}
    </div>
  )
}

export default SearchInput
