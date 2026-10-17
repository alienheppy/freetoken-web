'use client'

import SmartLink from '@/components/SmartLink'

import { isStale } from '../lib/adaptModel'
import { staleTitle } from '../lib/modelView'

/**
 * 模型卡片（原设计 .mcard 结构，首页/列表/搜索共用）
 * 结构：mname + prov + mdesc + mtags（能力标签 + 过期徽标）+ ctxrow
 * 底栏展示「模型提供商 N」：N = 该模型已收录的免费提供商（渠道）数，
 * 数据来源为 model.platforms。
 * 过期条目按原设计弱化（.mcard.stale / .stale-label），并给出同样口径的 title 提示
 *
 * 标签行只放「模型自身属性」（能力 / 过期）：具体由哪些平台免费提供属于渠道信息，
 * 底栏「模型提供商 N」已给出数量，卡片上再逐个列出平台名既占位又与详情页重复，
 * 且平台名长短不一会把卡片高度撑得参差（浏览器实测反馈）。
 */
export default function ModelCard({ model, today }) {
  if (!model) return null

  const expired = isStale(model, today)
  const title = staleTitle(model, today)
  const allPlatforms = Array.isArray(model.platforms) ? model.platforms : []
  const hasTags = expired || model.vision || model.tools || model.reasoning

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
      {hasTags && (
        <div className='mtags'>
          {expired && <span className='tag dot stale-badge'>过期</span>}
          {model.vision && <span className='tag dot vi'>视觉</span>}
          {model.tools && <span className='tag dot tools'>工具</span>}
          {model.reasoning && <span className='tag dot rsn'>推理</span>}
        </div>
      )}
      <div className='ctxrow'>
        <span>模型提供商</span>
        <b>{allPlatforms.length}</b>
      </div>
      {expired && <span className='stale-label'>可能过期</span>}
    </SmartLink>
  )
}
