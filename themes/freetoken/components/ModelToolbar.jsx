'use client'

import { useMemo, useState } from 'react'

import { siteConfig } from '@/lib/config'
import CONFIG from '../config'
import {
  ALL_PROVIDERS,
  FILTERS,
  SORTS,
  filterAndSortModels,
  paginate,
  providerOptions
} from '../lib/modelView'
import ModelCard from './ModelCard'
import Pagination from './Pagination'

/**
 * 首页模型库工具栏 + 卡片网格（原设计 page.jsx 的 toolbar / provbar / grid / empty）
 * 行为与原设计一致：
 *   - 搜索：模型名 + 厂商 + 模型 ID + 平台名，实时过滤（不区分大小写）
 *   - 能力 chips：全部 / 视觉 / 工具调用 / 深度推理 / 128K+
 *   - 排序下拉：默认 / 供应商最多 / A → Z
 *   - 供应商 chips：全部 + 出现过的厂商
 *
 * 关键词可由父组件受控传入（首页搜索框同时过滤下方平台卡片）：
 * 传 keyword 即为受控，否则保持自身状态（列表页/测试单独使用）。
 */
export default function ModelToolbar({ models, today, keyword, onKeywordChange }) {
  const [localKw, setLocalKw] = useState('')
  const kw = keyword === undefined ? localKw : keyword
  const [filter, setFilter] = useState('all')
  const [prov, setProv] = useState(ALL_PROVIDERS)
  const [sort, setSort] = useState('default')
  const [page, setPage] = useState(1)
  const [sortOpen, setSortOpen] = useState(false)

  const list = useMemo(
    () => filterAndSortModels(models, { kw, filter, provider: prov, sort }),
    [models, kw, filter, prov, sort]
  )
  const providers = useMemo(() => providerOptions(models), [models])
  const sortLabel = (SORTS.find(s => s.key === sort) || SORTS[0]).label

  const perPage = Number(
    siteConfig('FREETOKEN_MODELS_PER_PAGE', 9, CONFIG)
  )
  const paged = useMemo(
    () => paginate(list, page, perPage),
    [list, page, perPage]
  )

  // 任一筛选条件变化后回到第 1 页，避免停留在越界空页
  const resetTo = setter => value => {
    setter(value)
    setPage(1)
  }

  const changeKeyword = next => {
    if (keyword === undefined) setLocalKw(next)
    if (onKeywordChange) onKeywordChange(next)
    setPage(1)
  }

  return (
    <>
      <div className='toolbar'>
        <input
          className='search'
          type='text'
          aria-label={siteConfig('FREETOKEN_SEARCH_PLACEHOLDER', null, CONFIG)}
          placeholder={siteConfig('FREETOKEN_SEARCH_PLACEHOLDER', null, CONFIG)}
          value={kw}
          onChange={e => changeKeyword(e.target.value)}
        />
        {FILTERS.map(f => (
          <button
            key={f.key}
            type='button'
            className={'chip' + (filter === f.key ? ' on' : '')}
            aria-pressed={filter === f.key}
            onClick={() => resetTo(setFilter)(f.key)}>
            {f.label}
          </button>
        ))}
        <div
          className={'sortdd' + (sortOpen ? ' open' : '')}
          onMouseEnter={() => setSortOpen(true)}
          onMouseLeave={() => setSortOpen(false)}>
          <button
            type='button'
            className='sortbtn'
            aria-haspopup='true'
            aria-expanded={sortOpen}
            onClick={() => setSortOpen(v => !v)}>
            {sortLabel} <span className='caret'>▾</span>
          </button>
          <div className='sortmenu' data-testid='ft-sortmenu'>
            {SORTS.map(s => (
              <button
                key={s.key}
                type='button'
                className={sort === s.key ? 'on' : ''}
                onClick={e => {
                  resetTo(setSort)(s.key)
                  // 选中即收起：显式关闭并移走焦点，避免鼠标仍停在菜单上
                  // 时菜单继续挂着不收回。
                  setSortOpen(false)
                  e.currentTarget.blur()
                }}>
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 供应商筛选：仅当确有厂商可选时才显示；否则只剩一个「全部」，
          与上方能力筛选的「全部」重复，整行隐藏。 */}
      {providers.length > 1 && (
        <div className='toolbar provbar'>
          {providers.map(p => (
            <button
              key={p}
              type='button'
              className={'chip' + (prov === p ? ' on' : '')}
              aria-pressed={prov === p}
              onClick={() => resetTo(setProv)(p)}>
              {p}
            </button>
          ))}
        </div>
      )}

      <div className='grid' data-testid='ft-model-grid'>
        {paged.items.map(model => (
          <ModelCard key={model.id || model.href} model={model} today={today} />
        ))}
        {list.length === 0 && <div className='empty'>没有符合条件的模型。</div>}
      </div>

      {/* 翻页：仅当筛选结果超过一页时出现 */}
      <Pagination
        page={paged.page}
        totalPage={paged.totalPage}
        onPageChange={setPage}
      />
    </>
  )
}
