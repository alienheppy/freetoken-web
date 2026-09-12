'use client'

import { useEffect, useState } from 'react'

/**
 * 回到顶部（原设计 BackToTop.jsx：滚动超过 600px 显示，点击平滑滚动到顶部）
 */
export default function BackToTop() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 600)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <button
      type='button'
      className={'totop' + (show ? ' show' : '')}
      aria-label='回到顶部'
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
      ↑
    </button>
  )
}
