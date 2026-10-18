'use client'

import { useEffect, useState } from 'react'

/**
 * 模型库 / 平台一览翻页控件（原设计无分页；新增以承载全量数据）。
 *
 * 交互与视觉对齐克制的苹果风：一行右对齐（与上方卡片网格右边缘齐平）。
 * 只保留三个控件：上一页圆形箭头、当前页输入框、下一页圆形箭头。
 * 可直接输入指定页并回车，不再用页码列表或省略号占用版面。
 *
 * 页码本身受控；只有跳页输入框持有临时输入状态。
 * 总页数 <= 1 时返回 null（不渲染空壳）。
 */

/**
 * @param {{page: number, totalPage: number, onPageChange: (p:number)=>void,
 *          testId?: string, ariaLabel?: string}} props
 */
export default function Pagination({
  page,
  totalPage,
  onPageChange,
  testId = 'ft-pager',
  ariaLabel = '分页'
}) {
  const total = Number(totalPage) || 0
  const current = Math.min(Math.max(Number(page) || 1, 1), total || 1)
  const [jumpValue, setJumpValue] = useState(String(current))

  useEffect(() => {
    setJumpValue(String(current))
  }, [current])

  const go = p => {
    const next = Math.min(Math.max(p, 1), total)
    if (next !== current && typeof onPageChange === 'function') onPageChange(next)
  }

  const submitJump = event => {
    event.preventDefault()
    const requested = Number(jumpValue)
    if (!Number.isInteger(requested) || requested < 1 || requested > total) {
      setJumpValue(String(current))
      return
    }
    go(requested)
  }

  if (total <= 1) return null

  return (
    <nav className='pager' data-testid={testId} aria-label={ariaLabel}>
      <button
        type='button'
        className='pgbtn pgstep'
        disabled={current <= 1}
        aria-label='上一页'
        onClick={() => go(current - 1)}>
        <span className='pgchev' aria-hidden='true' />
      </button>
      <form className='pgjump' onSubmit={submitJump}>
        <input
          className='pginput'
          data-testid='ft-pager-input'
          type='number'
          min='1'
          max={total}
          step='1'
          inputMode='numeric'
          aria-label='跳转到页码'
          value={jumpValue}
          onChange={event => setJumpValue(event.target.value)}
          onBlur={event => {
            if (!event.currentTarget.value) setJumpValue(String(current))
          }}
        />
        <span className='pgcount' data-testid='ft-pager-count'>
          共 {total} 页
        </span>
      </form>
      <button
        type='button'
        className='pgbtn pgstep'
        disabled={current >= total}
        aria-label='下一页'
        onClick={() => go(current + 1)}>
        <span className='pgchev' aria-hidden='true' />
      </button>
    </nav>
  )
}
