'use client'

import { useEffect, useState } from 'react'

import { toDateStr } from './adaptModel'

/**
 * 客户端本地日期（'YYYY-MM-DD'）
 * 挂载前返回 ''，避免 SSR 与 CSR 首屏不一致；
 * 空字符串由 isStale/isExpired 内部回退到“当前时间”，行为与原设计一致。
 */
export function useClientToday() {
  const [today, setToday] = useState('')
  useEffect(() => {
    setToday(toDateStr(new Date()))
  }, [])
  return today
}

export default useClientToday
