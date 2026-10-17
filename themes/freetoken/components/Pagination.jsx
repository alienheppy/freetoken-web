'use client'

/**
 * 模型库 / 平台一览翻页控件（原设计无分页；新增以承载全量数据）。
 *
 * 交互与视觉对齐克制的苹果风：一行右对齐（与上方卡片网格右边缘齐平）。
 *
 * 为什么不是「固定 5 槽滑动窗口」：全量收录后模型库有 12 页、平台有 7 页，
 * 只给相邻页码时想去末页得连点十几次，越靠后越难用。改为：
 *   1) 首末页常驻（第 1 页与最后一页永远可见，一键直达两端）；
 *   2) 当前页左右各留 1 页，其余折叠为「…」；
 *   3) 「…」可点，一次跳 3 页 —— 比无意义的省略号更实用，步长也够克制；
 *   4) 末尾给出「X/N」，让总规模一眼可见，又不占版面。
 * 页数较少（<= 7）时不做折叠，直接全部列出。
 *
 * 受控组件：只派发 onPageChange，不自身持有状态。
 * 总页数 <= 1 时返回 null（不渲染空壳）。
 */

/** 「…」一次跳过的页数（步长取小值，避免跨页幅度过大失去方向感） */
const JUMP = 3
/** 不超过该页数时全部展开，不做折叠 */
const NO_FOLD = 7

/**
 * 计算页码序列：数字为真实页码，字符串 'gap-left' / 'gap-right' 为折叠位。
 * 首末页常驻，中间只保留当前页 ±1。
 *
 * @param {number} current 当前页（1 起）
 * @param {number} total 总页数
 * @returns {Array<number|string>} 页码与折叠位序列
 */
function pageItems(current, total) {
  if (total <= NO_FOLD) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }
  let start = Math.max(2, current - 1)
  let end = Math.min(total - 1, current + 1)
  // 靠近两端时把窗口贴边，避免出现「1 … 2 3」这类只有一格折叠的怪相
  if (current <= 3) {
    start = 2
    end = 4
  } else if (current >= total - 2) {
    start = total - 3
    end = total - 1
  }

  const items = [1]
  if (start > 2) items.push('gap-left')
  for (let p = start; p <= end; p++) items.push(p)
  if (end < total - 1) items.push('gap-right')
  items.push(total)
  return items
}

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
  if (total <= 1) return null

  const go = p => {
    const next = Math.min(Math.max(p, 1), total)
    if (next !== current && typeof onPageChange === 'function') onPageChange(next)
  }

  const items = pageItems(current, total)

  return (
    <nav className='pager' data-testid={testId} aria-label={ariaLabel}>
      <button
        type='button'
        className='pgbtn'
        disabled={current <= 1}
        aria-label='上一页'
        onClick={() => go(current - 1)}>
        ‹
      </button>
      {items.map(item => {
        if (typeof item === 'number') {
          return (
            <button
              key={item}
              type='button'
              className={'pgbtn' + (item === current ? ' on' : '')}
              aria-current={item === current ? 'page' : undefined}
              onClick={() => go(item)}>
              {item}
            </button>
          )
        }
        const forward = item === 'gap-right'
        return (
          <button
            key={item}
            type='button'
            className='pgbtn pggap'
            aria-label={forward ? `向后 ${JUMP} 页` : `向前 ${JUMP} 页`}
            onClick={() => go(forward ? current + JUMP : current - JUMP)}>
            …
          </button>
        )
      })}
      <button
        type='button'
        className='pgbtn'
        disabled={current >= total}
        aria-label='下一页'
        onClick={() => go(current + 1)}>
        ›
      </button>
      <span className='pgcount' data-testid='ft-pager-count'>
        {current}/{total}
      </span>
    </nav>
  )
}
