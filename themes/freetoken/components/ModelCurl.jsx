'use client'

import { siteConfig } from '@/lib/config'

import CONFIG from '../config'
import { buildCurl } from '../lib/modelView'
import CopyButton from './CopyButton'

/**
 * 详情页「快速接入」curl 代码块（原设计 .code + CopyButton）
 * base_url 取 CONFIG.FREETOKEN_DEFAULT_API_BASE（原设计取渠道 api 字段，ext 未承载该字段）
 */
export default function ModelCurl({ model }) {
  if (!model) return null

  const apiBase = siteConfig('FREETOKEN_DEFAULT_API_BASE', null, CONFIG)
  const code = buildCurl(model, apiBase)

  return (
    <div className='code' data-testid='ft-curl'>
      <CopyButton code={code} />
      <code>{code}</code>
    </div>
  )
}
