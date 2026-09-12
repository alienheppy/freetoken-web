'use client'

import NotionIcon from '@/components/NotionIcon'
import SmartLink from '@/components/SmartLink'
import { siteConfig } from '@/lib/config'
import { fmtCtx, isExpired, isStale } from '../lib/adaptModel'
import StatusBadge from './StatusBadge'

/**
 * 模型卡片（首页 / 列表 / 搜索结果共用）
 * 展示：模型名、厂商、平台、能力标签、审核状态；过期或待核实弱化显示
 */
export default function ModelCard({ model, today }) {
  if (!model) return null

  const expired = isExpired(model, today)
  const stale = isStale(model, today)
  const weak = expired || stale || model.verificationStatus !== 'verified'
  const title = expired
    ? `截止提示 ${model.expiresHint} 已过，可能已过期。请以平台官网为准`
    : stale && model.verifiedAt
      ? `核实于 ${model.verifiedAt}，距今超过 30 天，可能已变化。请以平台官网为准`
      : undefined

  return (
    <SmartLink
      href={model.href || '/'}
      title={title}
      data-testid='ft-model-card'
      className={`ft-card ft-mcard p-5 block text-left${weak ? ' is-weak' : ''}${
        expired ? ' is-stale' : ''
      }`}>
      <div className='ft-mcard-head'>
        <h3 className='font-semibold text-lg'>
          {siteConfig('POST_TITLE_ICON') && <NotionIcon icon={model.pageIcon} />}
          {model.name}
        </h3>
        <StatusBadge status={model.verificationStatus} />
      </div>

      {model.provider && <div className='ft-prov'>{model.provider}</div>}

      {model.desc && <p className='ft-mdesc'>{model.desc}</p>}

      <div className='ft-mtags'>
        {model.platforms.slice(0, 2).map(name => (
          <span key={name} className='ft-tag'>
            {name}
          </span>
        ))}
        {model.platforms.length > 2 && (
          <span className='ft-tag'>+{model.platforms.length - 2}</span>
        )}
        {model.capabilities.vision && (
          <span className='ft-tag ft-tag-dot ft-tag-vision'>视觉</span>
        )}
        {model.capabilities.tools && (
          <span className='ft-tag ft-tag-dot ft-tag-tools'>工具</span>
        )}
        {model.capabilities.reasoning && (
          <span className='ft-tag ft-tag-dot ft-tag-reasoning'>推理</span>
        )}
        {expired && <span className='ft-tag ft-tag-stale'>可能过期</span>}
      </div>

      <div className='ft-ctxrow'>
        <span>上下文窗口</span>
        <b>{fmtCtx(model.context)}</b>
      </div>
    </SmartLink>
  )
}
