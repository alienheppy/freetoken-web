'use client'

import SmartLink from '@/components/SmartLink'
import { fmtCtx, isExpired, isStale } from '../lib/adaptModel'
import StatusBadge from './StatusBadge'

const EMPTY = '未标注'

/**
 * 详情页业务信息区
 * 展示：平台、上下文、审核状态、核实日期、截止提示、免费额度说明、官方来源链接
 * 口径：没有实测依据的状态一律不展示（不出现“接口正常”这类健康声明）；
 *       核实日期与来源分开表达，缺失即“未标注”
 */
export default function ModelFacts({ model, today }) {
  if (!model) return null

  const expired = isExpired(model, today)
  const stale = isStale(model, today)

  return (
    <section
      className={`ft-facts mt-8 rounded-2xl p-6${stale ? ' is-stale' : ''}`}
      data-testid='ft-facts'>
      <div className='grid gap-5 md:grid-cols-3'>
        <div className='ft-fact'>
          <div className='ft-fact-l'>平台</div>
          <div className='ft-fact-v'>
            {model.platforms.length > 0 ? (
              <span className='inline-flex flex-wrap gap-2'>
                {model.platforms.map(name => (
                  <span key={name} className='ft-tag'>
                    {name}
                  </span>
                ))}
              </span>
            ) : (
              EMPTY
            )}
          </div>
        </div>

        <div className='ft-fact'>
          <div className='ft-fact-l'>上下文窗口</div>
          <div className='ft-fact-v'>{fmtCtx(model.context)}</div>
        </div>

        <div className='ft-fact'>
          <div className='ft-fact-l'>审核状态</div>
          <div className='ft-fact-v'>
            <StatusBadge status={model.verificationStatus} />
          </div>
        </div>

        <div className='ft-fact'>
          <div className='ft-fact-l'>核实日期</div>
          <div className='ft-fact-v'>{model.verifiedAt || EMPTY}</div>
        </div>

        <div className='ft-fact'>
          <div className='ft-fact-l'>截止提示</div>
          <div className='ft-fact-v'>{model.expiresHint || EMPTY}</div>
        </div>

        <div className='ft-fact'>
          <div className='ft-fact-l'>来源</div>
          <div className='ft-fact-v'>
            {model.sourceUrl ? (
              <SmartLink href={model.sourceUrl} className='ft-link'>
                {model.sourceUrl}
              </SmartLink>
            ) : (
              EMPTY
            )}
          </div>
        </div>
      </div>

      {model.limitsNote && (
        <div className='ft-limits'>
          <span className='ft-fact-l'>免费额度说明</span>
          <div className='text-sm text-[var(--ft-sub)] mt-1'>
            {model.limitsNote}
          </div>
        </div>
      )}

      {expired && (
        <div className='ft-notice mt-5'>
          该条目的截止提示（{model.expiresHint}）已过，免费额度可能已变化，请以平台官网为准。
        </div>
      )}
      {!expired && stale && (
        <div className='ft-notice mt-5'>
          该条目核实于 {model.verifiedAt}，距今超过 30 天，数据可能已变化，请以平台官网为准。
        </div>
      )}
      {model.verificationStatus === 'pending' && (
        <div className='ft-notice mt-5'>该条目尚未核实，信息仅供参考。</div>
      )}
    </section>
  )
}
