'use client'

/**
 * 模型库翻页控件（原设计无分页；新增以承载全量模型）。
 *
 * 交互与视觉对齐克制的苹果风：一行右对齐（与上方卡片网格右边缘齐平），
 * 上一页 / 页码 / 下一页；页码固定 5 槽滑动窗口，页数超过 5 时窗口随当前页滑动。
 * 受控组件：只派发 onPageChange，不自身持有状态。
 * 总页数 <= 1 时返回 null（不渲染空壳）。
 *
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

  // 页码固定 5 槽（滑动窗口）：总页数 <= 5 全部展示，超过时始终只显示 5 个连续页码，
  // 窗口随当前页平滑滑动。槽位数恒定，翻页时整行宽度不变，左右箭头不会左右跳动。
  const WINDOW = 5
  let start = 1
  if (total > WINDOW) {
    start = current - Math.floor(WINDOW / 2)
    start = Math.max(1, Math.min(start, total - WINDOW + 1))
  }
  const seq = []
  for (let i = 0; i < Math.min(WINDOW, total); i++) seq.push(start + i)

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
      {seq.map(p =>
        <button
          key={p}
          type='button'
          className={'pgbtn' + (p === current ? ' on' : '')}
          aria-current={p === current ? 'page' : undefined}
          onClick={() => go(p)}>
          {p}
        </button>
      )}
      <button
        type='button'
        className='pgbtn'
        disabled={current >= total}
        aria-label='下一页'
        onClick={() => go(current + 1)}>
        ›
      </button>
    </nav>
  )
}
