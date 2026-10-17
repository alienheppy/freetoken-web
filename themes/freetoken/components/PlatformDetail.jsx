'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

import SmartLink from '@/components/SmartLink'
import { siteConfig } from '@/lib/config'

import CONFIG from '../config'
import { adaptPosts, fmtCtx } from '../lib/adaptModel'
import {
  PLATFORM_SORTS,
  sortModelsBy,
  togglePlatformSort
} from '../lib/modelView'

/**
 * 「免费模型」表格首屏展示的行数：超出的部分在本区域内滚动。
 * 模型多的平台（例如 UnoRouter 有 38 个）否则会把「接入说明」推到很远，
 * 用户要滚很久才能看到，也失去“一眼看清这个平台给什么”的作用。
 */
const VISIBLE_ROWS = 11

/**
 * 平台详情页：某提供商（Notion type=Platform）的免费模型列表。
 * 结构：返回（回首页平台区块）→ 平台名 + 认证徽标 → 元信息 → 平台简介 → 免费模型表格 → 接入说明。
 * 模型用表格列表呈现（而非卡片网格）：一眼即可按「上下文 / 能力 / 提供商」横向对比，
 * 提供商数量再多也不会撑爆版面。
 * 表头即排序控件：点列名在「首击方向 → 反向 → 默认顺序」间循环，与首页模型库的排序语义一致。
 * 模型列表由 pages/platform/[platform] 传入（已按 ext.platforms 命中该平台过滤）。
 */
export default function PlatformDetail({ platform, posts }) {
  const adapted = useMemo(() => adaptPosts(posts), [posts])
  // null = 默认顺序（保持 Notion 后台的录入顺序，与首页「默认」排序同义）
  const [sort, setSort] = useState(
    /** @type {{key: string, dir: 'asc'|'desc'}|null} */ (null)
  )
  const models = useMemo(
    () => (sort ? sortModelsBy(adapted, sort.key, sort.dir) : adapted),
    [adapted, sort]
  )
  const [copyStatus, setCopyStatus] = useState('idle')
  const copyTimerRef = useRef(null)

  // 表格限高：量出第 VISIBLE_ROWS 行的实测底部位置写进 CSS 变量，
  // 而不是写死像素 —— 行高会随模型名换行、有无简介而变。
  // 排序后行内容变化、窗口尺寸变化都会重新量算。
  const bodyRef = useRef(null)
  useEffect(() => {
    const body = bodyRef.current
    if (!body) return

    const measure = () => {
      const rows = body.querySelectorAll('.prow')
      if (rows.length === 0) return
      const lastVisible = rows[Math.min(VISIBLE_ROWS, rows.length) - 1]
      const height =
        lastVisible.getBoundingClientRect().bottom -
        body.getBoundingClientRect().top +
        body.scrollTop
      // 布局未就绪时量到 0（例如无渲染环境），此时不写入，避免把表格压成 0 高
      if (height > 0) {
        body.style.setProperty('--pbody-max', `${Math.ceil(height)}px`)
      }
    }

    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [models])

  useEffect(
    () => () => {
      clearTimeout(copyTimerRef.current)
    },
    []
  )

  if (!platform) return null

  const certified =
    Array.isArray(platform.certifications) && platform.certifications.length > 0

  const showCopyStatus = next => {
    clearTimeout(copyTimerRef.current)
    setCopyStatus(next)
    copyTimerRef.current = setTimeout(() => setCopyStatus('idle'), 1500)
  }

  // Base URL 一键复制：写入成功才提示“已复制”，失败或剪贴板不可用时显示失败态。
  const copyBaseUrl = async () => {
    if (!platform.baseUrl) return
    try {
      if (!navigator?.clipboard?.writeText)
        throw new Error('Clipboard unavailable')
      await navigator.clipboard.writeText(platform.baseUrl)
      showCopyStatus('copied')
    } catch (e) {
      showCopyStatus('failed')
    }
  }

  return (
    <div className='detail platform-detail' data-testid='ft-platform-detail'>
      <div className='hero'>
        <SmartLink href='/#platforms' className='back'>
          <span className='chev'>‹</span>
          {siteConfig('FREETOKEN_PLATFORM_BACK', null, CONFIG)}
        </SmartLink>
        <h1>
          {platform.name}{' '}
          <span className={'badge ' + (certified ? 'ok' : 'todo')}>
            {certified ? platform.certifications[0] : '待核实'}
          </span>
        </h1>
        {platform.desc && <div className='herosub'>{platform.desc}</div>}
        <div className='heropills'>
          {platform.quota && (
            <span className='hpill dark'>{platform.quota}</span>
          )}
          {platform.context > 0 && (
            <span className='hpill'>上下文 {fmtCtx(platform.context)}</span>
          )}
          <span className='hpill'>{models.length} 个免费模型</span>
        </div>
        {(platform.url || platform.baseUrl) && (
          <div className='pmeta'>
            {platform.url && (
              <SmartLink
                href={platform.url}
                className='pmetabtn'
                target='_blank'
                rel='noopener noreferrer'
              >
                前往官网
              </SmartLink>
            )}
            {platform.baseUrl && (
              <button
                type='button'
                className='pmetaurl'
                title='点击复制 Base URL'
                aria-label={`复制 Base URL：${platform.baseUrl}`}
                onClick={copyBaseUrl}
              >
                <span className='pmetaurl-text'>{platform.baseUrl}</span>
                <span className='pmetaurl-copy'>
                  {copyStatus === 'copied'
                    ? '已复制'
                    : copyStatus === 'failed'
                      ? '复制失败'
                      : '复制'}
                </span>
              </button>
            )}
          </div>
        )}
      </div>

      {platform.intro && (
        <section data-testid='ft-platform-intro'>
          <h2>{siteConfig('FREETOKEN_PLATFORM_INTRO_TITLE', null, CONFIG)}</h2>
          <p className='introcopy'>{platform.intro}</p>
        </section>
      )}

      <section>
        <h2>{siteConfig('FREETOKEN_PLATFORM_MODELS_TITLE', null, CONFIG)}</h2>
        <div className='ptable' data-testid='ft-platform-models'>
          {models.length > 0 && (
            <div className='phead'>
              {PLATFORM_SORTS.map(column => (
                <button
                  key={column.key}
                  type='button'
                  className={'psort' + (sort?.key === column.key ? ' on' : '')}
                  data-testid={`ft-platform-sort-${column.key}`}
                  // aria-pressed 表达「该列正在排序」，方向写进无障碍名称
                  aria-pressed={sort?.key === column.key}
                  aria-label={
                    sort?.key === column.key
                      ? `${column.label}，按${sort.dir === 'asc' ? '升序' : '降序'}排列，点击切换`
                      : `${column.label}，点击排序`
                  }
                  title='点击切换排序'
                  onClick={() =>
                    setSort(current => togglePlatformSort(current, column.key))
                  }
                >
                  <span>{column.label}</span>
                  <span className='psort-arrow' aria-hidden='true'>
                    {sort?.key === column.key
                      ? sort.dir === 'asc'
                        ? '▲'
                        : '▼'
                      : '↕'}
                  </span>
                </button>
              ))}
            </div>
          )}
          {models.length > 0 && (
            // 限高滚动区：表头留在外面常驻可见，只有行列表滚动。
            <div
              className='pbody'
              ref={bodyRef}
              data-testid='ft-platform-models-body'
            >
              {models.map(model => (
                <SmartLink
                  key={model.id || model.href}
                  href={model.href || '/'}
                  data-testid='ft-platform-model'
                  className='prow'
                >
                  <div className='pmain'>
                    <div className='pmname'>{model.name}</div>
                    {model.desc && <div className='pmdesc'>{model.desc}</div>}
                  </div>
                  <div className='pctx' data-label='上下文'>
                    {fmtCtx(model.context)}
                  </div>
                  <div className='pcaps' data-label='能力'>
                    {model.vision && <span className='tag dot vi'>视觉</span>}
                    {model.tools && <span className='tag dot tools'>工具</span>}
                    {model.reasoning && (
                      <span className='tag dot rsn'>推理</span>
                    )}
                    {!model.vision && !model.tools && !model.reasoning && (
                      <span className='pnone'>—</span>
                    )}
                  </div>
                  <div className='pprov' data-label='模型提供商'>
                    {model.platforms.length}
                  </div>
                </SmartLink>
              ))}
            </div>
          )}
          {models.length === 0 && (
            <div className='empty'>
              {siteConfig('FREETOKEN_PLATFORM_EMPTY', null, CONFIG)}
            </div>
          )}
        </div>
      </section>

      {/* 接入说明：来源为 Notion「平台供应商」库（type=Platform）的「接入说明」属性，
          与渠道行级 guide 同源字段；平台档案里录一次即在该平台所有模型页通用。 */}
      {platform.guide && (
        <section data-testid='ft-platform-guide'>
          <h2>{siteConfig('FREETOKEN_PLATFORM_GUIDE_TITLE', null, CONFIG)}</h2>
          <p className='introcopy'>{platform.guide}</p>
        </section>
      )}
    </div>
  )
}
