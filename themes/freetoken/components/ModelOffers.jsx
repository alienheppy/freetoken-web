'use client'

import { useMemo, useState } from 'react'

import SmartLink from '@/components/SmartLink'

import { fmtCtx } from '../lib/adaptModel'
import { buildCurl } from '../lib/modelView'
import CopyButton from './CopyButton'

/**
 * 详情页「免费获取渠道」区块 —— 可检索的紧凑清单
 *
 * 为什么不是「每家一张大卡片」：一个模型可能被 10～100 家平台免费提供，
 * 大卡片=信息密度极低、无法横向比较、页面无限拉长。因此改为：
 *   1) 紧凑表格：一行一家，列对齐（平台 / 上下文 / Base URL / 操作），可快速扫读比较；
 *   2) 渐进展开：接入步骤与 curl 只在点开某一行时才渲染，默认不占版面；
 *   3) 顶部工具条：搜索 + 排序 + 计数，家数一多也能快速定位。
 *
 * 一个渠道 = 内嵌明细表的一行；各提供商差异（免费额度 / 上下文 / base_url / 接入说明）
 * 由该行自己的 Notion 字段承载，无需在正文为每家写一段。
 *
 * 列 → 展示映射：
 *   名称        → 主列标题
 *   供应商简介  → 主列副标题
 *   免费额度    → 标题旁徽标
 *   上下文      → 「上下文」列
 *   baseUrl     → 「Base URL」列 + 展开后的 curl
 *   接入说明    → 展开后的接入步骤
 *   网址        → 「前往官网」外链
 */
const SORTS = [
  { key: 'default', label: '默认' },
  { key: 'context', label: '上下文最大' },
  { key: 'name', label: 'A → Z' }
]

export default function ModelOffers({ model, rows }) {
  const list = useMemo(
    () => (Array.isArray(rows) ? rows.filter(r => r && typeof r === 'object') : []),
    [rows]
  )
  const [kw, setKw] = useState('')
  const [sort, setSort] = useState('default')
  const [openKey, setOpenKey] = useState(null)

  const view = useMemo(() => {
    let out = list
    const q = kw.trim().toLowerCase()
    if (q) {
      out = out.filter(r =>
        `${r.name || ''} ${r.desc || ''} ${r.baseUrl || ''} ${r.quota || ''}`
          .toLowerCase()
          .includes(q)
      )
    }
    if (sort === 'context') {
      out = [...out].sort((a, b) => (b.context || 0) - (a.context || 0))
    } else if (sort === 'name') {
      out = [...out].sort((a, b) =>
        String(a.name || '').localeCompare(String(b.name || ''), 'en')
      )
    }
    return out
  }, [list, kw, sort])

  if (list.length === 0) {
    return (
      <div className='offers' data-testid='ft-offers'>
        <div className='empty'>暂无已收录的免费获取渠道。</div>
      </div>
    )
  }

  // 仅一家时无需工具条，避免多余噪音
  const showBar = list.length > 1

  return (
    <div className='offers' data-testid='ft-offers'>
      {showBar && (
        <div className='offersbar'>
          <input
            type='search'
            className='osearch'
            placeholder='搜索平台 / Base URL / 简介'
            value={kw}
            onChange={e => setKw(e.target.value)}
            aria-label='搜索免费获取渠道'
          />
          <div className='osorts' role='group' aria-label='排序'>
            {SORTS.map(s => (
              <button
                key={s.key}
                type='button'
                className={'osort' + (sort === s.key ? ' on' : '')}
                aria-pressed={sort === s.key}
                onClick={() => setSort(s.key)}>
                {s.label}
              </button>
            ))}
          </div>
          <div className='ocount'>{view.length} 家</div>
        </div>
      )}

      <div className='olist'>
        {view.map((row, i) => {
          const key = (row.name || 'offer') + '#' + i
          const guide = String(row.guide || '').trim()
          const baseUrl = String(row.baseUrl || '').trim()
          const modelId = String(row.modelId || model?.id || '').trim()
          const curl = baseUrl ? buildCurl({ id: modelId }, baseUrl) : ''
          const hasDetail = Boolean(guide || curl)
          const open = openKey === key
          return (
            <div
              className={'oitem' + (open ? ' open' : '')}
              key={key}
              data-testid='ft-offer-card'>
              <div className='orow'>
                <div className='ocell omain'>
                  <div className='otop'>
                    <span className='oname'>{row.name}</span>
                    {row.quota ? (
                      <span className='oquota'>{row.quota}</span>
                    ) : null}
                  </div>
                  {row.desc ? <div className='odesc'>{row.desc}</div> : null}
                </div>

                <div className='ocell octx'>
                  <span className='olabel'>上下文</span>
                  <span className='oval'>
                    {row.context > 0 ? fmtCtx(row.context) : '—'}
                  </span>
                </div>

                <div className='ocell obase'>
                  <span className='olabel'>Base URL</span>
                  <span className='oval mono'>{baseUrl || '—'}</span>
                </div>

                <div className='ocell oact'>
                  {hasDetail && (
                    <button
                      type='button'
                      className='otoggle'
                      aria-expanded={open}
                      onClick={() => setOpenKey(open ? null : key)}>
                      {open ? '收起' : '接入方式'}
                    </button>
                  )}
                  {row.url ? (
                    <SmartLink
                      href={row.url}
                      className='obtn'
                      target='_blank'
                      rel='noopener noreferrer'
                      aria-label={`前往 ${row.name} 官网`}>
                      前往官网
                    </SmartLink>
                  ) : null}
                </div>
              </div>

              {open && hasDetail && (
                <div className='opanel'>
                  {guide ? (
                    <div className='oguide'>
                      <span className='k'>接入说明</span>
                      <div className='t'>{guide}</div>
                    </div>
                  ) : null}
                  {curl ? (
                    <div className='code opanel-code'>
                      <CopyButton code={curl} />
                      <code>{curl}</code>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          )
        })}
        {view.length === 0 && <div className='empty'>没有匹配的平台。</div>}
      </div>
    </div>
  )
}
