'use client'

import { useEffect, useRef, useState } from 'react'

import SmartLink from '@/components/SmartLink'

/**
 * 锁定文章页（原设计返回模型库链接 + 密码校验入口）
 * validPassword 由 NotionNext 的 LayoutSlug 透传（官方校验链）
 */
export default function ArticleLock({ validPassword }) {
  const inputRef = useRef(null)
  const [err, setErr] = useState(false)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const submit = () => {
    const p = inputRef.current?.value || ''
    if (!validPassword(p)) {
      setErr(true)
    }
  }

  return (
    <div className='hero'>
      <SmartLink href='/' className='back' data-testid='ft-lock-back'>
        <span className='chev'>‹</span>
        返回模型库
      </SmartLink>
      <div className='missing'>该文章需输入密码后查看</div>
      <input
        ref={inputRef}
        type='password'
        className='lockinput'
        data-testid='ft-lock-input'
        onKeyDown={e => {
          if (e.key === 'Enter') submit()
        }}
      />
      <button
        type='button'
        className='lockbtn'
        data-testid='ft-lock-submit'
        onClick={submit}
      >
        提交
      </button>
      {err && (
        <div className='locktips' data-testid='ft-lock-error'>
          密码错误，请重试
        </div>
      )}
    </div>
  )
}
