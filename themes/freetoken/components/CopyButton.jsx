'use client'

import { useState } from 'react'

/**
 * 拷贝按钮（原设计 CopyButton.jsx：点击后 1.5 秒内显示“已拷贝”）
 */
export default function CopyButton({ code }) {
  const [done, setDone] = useState(false)

  const copy = () => {
    try {
      navigator?.clipboard?.writeText(code)
    } catch (e) {
      /* 剪贴板不可用时静默降级，不阻塞交互 */
    }
    setDone(true)
    setTimeout(() => setDone(false), 1500)
  }

  return (
    <button type='button' className='copy' onClick={copy}>
      {done ? '已拷贝' : '拷贝'}
    </button>
  )
}
