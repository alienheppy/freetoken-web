'use client'

import { fmtCtx } from '../lib/adaptModel'
import { BIG_CONTEXT } from '../lib/modelView'

/**
 * 详情页「模型特性」区块（原设计 .facts + .featlist）
 * facts 六格：上下文窗口 / 输入模态 / 输出模态 / 工具调用 / 深度推理 / 定价
 */
function Fact({ k, v }) {
  return (
    <div className='fact'>
      <div className='k'>{k}</div>
      <div className='v'>{v}</div>
    </div>
  )
}

function Feat({ t, d }) {
  return (
    <div className='feat'>
      <span className='ck'>✓</span>
      <span>{t}</span>
      <span className='fd'>{d}</span>
    </div>
  )
}

export default function ModelDetailFacts({ model }) {
  if (!model) return null

  return (
    <>
      <div className='facts' data-testid='ft-facts'>
        <Fact k='上下文窗口' v={fmtCtx(model.context) + ' tokens'} />
        <Fact k='输入模态' v={model.vision ? '文本 + 图像' : '文本'} />
        <Fact k='输出模态' v='文本' />
        <Fact k='工具调用' v={model.tools ? '支持' : '不支持'} />
        <Fact k='深度推理' v={model.reasoning ? '支持' : '—'} />
        <Fact k='定价' v='免费' />
      </div>
      <div className='featlist' data-testid='ft-featlist'>
        {model.context >= BIG_CONTEXT && (
          <Feat t='长上下文' d='支持 128K 以上上下文，适合长文档与代码库级任务' />
        )}
        {model.vision && <Feat t='多模态' d='除文本外还支持图像输入' />}
        {model.tools && (
          <Feat t='Agent 就绪' d='支持函数调用 / 工具使用，可接入代理工作流' />
        )}
        {model.reasoning && <Feat t='深度推理' d='具备可配置的推理 / 思考模式' />}
        <Feat t='零成本' d='在提供渠道内免费调用，无需付费' />
      </div>
    </>
  )
}
