'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * 拷贝按钮：仅在 Clipboard API 写入成功后显示“已拷贝”，失败时显示“复制失败”
 */
export default function CopyButton({ code }) {
  const [status, setStatus] = useState('idle')
  const timerRef = useRef(null)

  useEffect(
    () => () => {
      clearTimeout(timerRef.current)
    },
    []
  )

  const showStatus = next => {
    clearTimeout(timerRef.current)
    setStatus(next)
    timerRef.current = setTimeout(() => setStatus('idle'), 1500)
  }

  const copy = async () => {
    try {
      if (!navigator?.clipboard?.writeText)
        throw new Error('Clipboard unavailable')
      await navigator.clipboard.writeText(code)
      showStatus('copied')
    } catch (e) {
      showStatus('failed')
    }
  }

  return (
    <button type='button' className='copy' onClick={copy}>
      {status === 'copied'
        ? '已拷贝'
        : status === 'failed'
          ? '复制失败'
          : '拷贝'}
    </button>
  )
}
