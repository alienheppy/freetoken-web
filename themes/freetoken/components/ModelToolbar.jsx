'use client'

import { useMemo, useState } from 'react'

import { siteConfig } from '@/lib/config'
import CONFIG from '../config'
import {
  ALL_PROVIDERS,
  FILTERS,
  SORTS,
  filterAndSortModels,
  providerOptions
} from '../lib/modelView'
import ModelCard from './ModelCard'

/**
 * 首页模型库工具栏 + 卡片网格（原设计 page.jsx 的 toolbar / provbar / grid / empty）
 * 行为与原设计一致：
 *   - 搜索：模型名 + 厂商 + 模型 ID，实时过滤（不区分大小写）
 *   - 能力 chips：全部 / 视觉 / 工具调用 / 深度推理 / 128K+
 *   - 排序下拉：默认 / 供应商最多 / A → Z
 *   - 供应商 chips：全部 + 出现过的厂商
 */
export default function ModelToolbar({ models, today }) {
  const [kw, setKw] = useState('')
  const [filter, setFilter] = useState('all')
  const [prov, setProv] = useState(ALL_PROVIDERS)
  const [sort, setSort] = useState('default')

  const list = useMemo(
    () => filterAndSortModels(models, { kw, filter, provider: prov, sort }),
    [models, kw, filter, prov, sort]
  )
  const providers = useMemo(() => providerOptions(models), [models])
  const sortLabel = (SORTS.find(s => s.key === sort) || SORTS[0]).label

  return (
    <>
      <div className='toolbar'>
        <input
          className='search'
          type='text'
          aria-label={siteConfig('FREETOKEN_SEARCH_PLACEHOLDER', null, CONFIG)}
          placeholder={siteConfig('FREETOKEN_SEARCH_PLACEHOLDER', null, CONFIG)}
          value={kw}
          onChange={e => setKw(e.target.value)}
        />
        {FILTERS.map(f => (
          <button
            key={f.key}
            type='button'
            className={'chip' + (filter === f.key ? ' on' : '')}
            aria-pressed={filter === f.key}
            onClick={() => setFilter(f.key)}>
            {f.label}
          </button>
        ))}
        <div className='sortdd'>
          <button
            type='button'
            className='sortbtn'
            aria-haspopup='true'
            aria-expanded='false'>
            {sortLabel} <span className='caret'>▾</span>
          </button>
          <div className='sortmenu' data-testid='ft-sortmenu'>
            {SORTS.map(s => (
              <button
                key={s.key}
                type='button'
                className={sort === s.key ? 'on' : ''}
                onClick={() => setSort(s.key)}>
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className='toolbar provbar'>
        {providers.map(p => (
          <button
            key={p}
            type='button'
            className={'chip' + (prov === p ? ' on' : '')}
            aria-pressed={prov === p}
            onClick={() => setProv(p)}>
            {p}
          </button>
        ))}
      </div>

      <div className='grid' data-testid='ft-model-grid'>
        {list.map(model => (
          <ModelCard key={model.id || model.href} model={model} today={today} />
        ))}
        {list.length === 0 && <div className='empty'>没有符合条件的模型。</div>}
      </div>
    </>
  )
}
