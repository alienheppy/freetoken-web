'use client'

import SmartLink from '@/components/SmartLink'

import { fmtCtx, isStale } from '../lib/adaptModel'
import { staleTitle } from '../lib/modelView'

/**
 * 模型卡片（原设计 .mcard 结构，首页/列表/搜索共用）
 * 结构：mname + prov + mdesc + mtags（平台标签 + 能力标签 + 过期徽标）+ ctxrow
 * 过期条目按原设计弱化（.mcard.stale / .stale-label），并给出同样口径的 title 提示
 */
export default function ModelCard({ model, today }) {
  if (!model) return null

  const expired = isStale(model, today)
  const title = staleTitle(model, today)
  const platforms = Array.isArray(model.platforms) ? model.platforms.slice(0, 2) : []

  return (
    <SmartLink
      href={model.href || '/'}
      title={title || undefined}
      data-testid='ft-model-card'
      className={'mcard' + (expired ? ' stale' : '')}>
      <div>
        <div className='mname'>{model.name}</div>
        <div className='prov'>{model.provider}</div>
      </div>
      <div className='mdesc'>{model.desc}</div>
      <div className='mtags'>
        {platforms.map(name => (
          <span className='tag' key={name}>
            {name}
          </span>
        ))}
        {expired && <span className='tag dot stale-badge'>过期</span>}
        {model.vision && <span className='tag dot vi'>视觉</span>}
        {model.tools && <span className='tag dot tools'>工具</span>}
        {model.reasoning && <span className='tag dot rsn'>推理</span>}
      </div>
      <div className='ctxrow'>
        <span>上下文窗口</span>
        <b>{fmtCtx(model.context)}</b>
      </div>
      {expired && <span className='stale-label'>可能过期</span>}
    </SmartLink>
  )
}
