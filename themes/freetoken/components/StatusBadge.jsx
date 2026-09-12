'use client'

import { verificationLabel } from '../lib/adaptModel'

/**
 * 审核状态徽标（原设计 .badge ok/todo）
 * 业务口径：只有确认过的三态（verified/pending/duplicate）参与展示，
 * 未知状态一律按待核实弱化渲染（绝不默认成“已核实”）
 */
export default function StatusBadge({ status }) {
  const safe =
    status === 'verified' || status === 'duplicate' ? status : 'pending'
  return (
    <span
      className={'badge ' + (safe === 'verified' ? 'ok' : 'todo')}
      data-testid='ft-status'>
      {verificationLabel(safe)}
    </span>
  )
}
