'use client'

import Head from 'next/head'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/router'

import SmartLink from '@/components/SmartLink'
import { FEEDBACK_OBJECT_TYPES, FEEDBACK_TYPES } from '@/lib/freetoken/feedback'
import TurnstileWidget from './TurnstileWidget'

const emptyForm = {
  title: '',
  type: FEEDBACK_TYPES[0],
  objectType: '模型',
  objectName: '',
  description: '',
  pageUrl: '',
  email: ''
}

const normalizeQueryValue = value =>
  typeof value === 'string' ? value.trim() : ''

/**
 * 反馈页：表单字段与 Notion 反馈库一一对应。
 * 从模型/平台详情页进入时，query 会预填对象与页面地址；
 * 用户在提交前仍可修改全部内容。
 */
export default function FeedbackPage({ turnstileSiteKey = '' }) {
  const router = useRouter()
  const [form, setForm] = useState(emptyForm)
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const [website, setWebsite] = useState('')
  const [turnstileToken, setTurnstileToken] = useState('')
  const [turnstileResetKey, setTurnstileResetKey] = useState(0)

  useEffect(() => {
    if (!router.isReady) return
    const query = router.query || {}
    const pageUrl = normalizeQueryValue(query.pageUrl)
    const type = normalizeQueryValue(query.type)
    const objectType = normalizeQueryValue(query.objectType)
    const objectName = normalizeQueryValue(query.objectName)
    const title = normalizeQueryValue(query.title)

    setForm(current => ({
      ...current,
      title: title || current.title,
      type: FEEDBACK_TYPES.includes(type) ? type : current.type,
      objectType: FEEDBACK_OBJECT_TYPES.includes(objectType)
        ? objectType
        : current.objectType,
      objectName: objectName || current.objectName,
      pageUrl:
        pageUrl && pageUrl.startsWith('/')
          ? `${window.location.origin}${pageUrl}`
          : pageUrl || window.location.href.split('#')[0]
    }))
  }, [router.isReady, router.query])

  const canSubmit = useMemo(
    () =>
      status !== 'submitting' &&
      Boolean(turnstileSiteKey) &&
      turnstileToken.length > 0 &&
      form.objectName.trim().length > 0 &&
      form.description.trim().length > 1 &&
      form.pageUrl.trim().length > 0,
    [form, status, turnstileSiteKey, turnstileToken]
  )

  const update = event => {
    const { name, value } = event.target
    setForm(current => ({ ...current, [name]: value }))
    if (error) setError('')
  }

  const handleTurnstileVerify = useCallback(token => {
    setTurnstileToken(token)
  }, [])

  const handleTurnstileExpire = useCallback(() => {
    setTurnstileToken('')
  }, [])

  const handleTurnstileError = useCallback(() => {
    setTurnstileToken('')
    setError('人机验证加载失败，请刷新页面后重试。')
  }, [])

  const submit = async event => {
    event.preventDefault()
    if (!canSubmit) return

    setStatus('submitting')
    setError('')

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          website,
          turnstileToken
        })
      })
      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(payload.error || '提交失败，请稍后再试')
      }
      setStatus('success')
    } catch (e) {
      setStatus('idle')
      setTurnstileToken('')
      setTurnstileResetKey(current => current + 1)
      setError(e.message || '提交失败，请稍后再试')
    }
  }

  if (status === 'success') {
    return (
      <main className='feedback-page' data-testid='ft-feedback-page'>
        <Head>
          <title>信息反馈 · FreeTok</title>
          <meta
            name='description'
            content='报告 FreeTok 上的过期额度、错误信息和失效链接。'
          />
        </Head>
        <section className='feedback-success' data-testid='ft-feedback-success'>
          <div className='feedback-check' aria-hidden='true'>
            ✓
          </div>
          <div className='feedback-eyebrow'>反馈已收到</div>
          <h1>谢谢你帮我们把信息变准。</h1>
          <p>我们会按反馈记录逐条核实。若留下电子邮件，必要时会与你联系。</p>
          <div className='feedback-success-actions'>
            <SmartLink href='/' className='feedback-primary'>
              返回首页
            </SmartLink>
            <button
              type='button'
              className='feedback-secondary'
              onClick={() => {
                setForm(emptyForm)
                setStatus('idle')
              }}
            >
              再提交一条
            </button>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className='feedback-page' data-testid='ft-feedback-page'>
      <Head>
        <title>信息反馈 · FreeTok</title>
        <meta
          name='description'
          content='报告 FreeTok 上的过期额度、错误信息和失效链接。'
        />
      </Head>
      <section className='feedback-intro'>
        <div className='feedback-eyebrow'>一起维护这份免费清单</div>
        <h1>
          发现信息不对？
          <br />
          告诉我们。
        </h1>
        <p>
          免费额度会变化，链接也会失效。你提供的一条线索，会直接进入我们的反馈库，
          帮助下一位访客少走弯路。
        </p>
        <div className='feedback-note'>
          <span aria-hidden='true'>●</span>
          请尽量附上原始页面地址；不需要注册，也不会公开你的邮箱。
        </div>
      </section>

      <form className='feedback-form' onSubmit={submit} noValidate>
        <div className='feedback-form-head'>
          <div>
            <div className='feedback-eyebrow'>反馈内容</div>
            <h2>把问题说清楚。</h2>
          </div>
          <span className='feedback-required'>* 为必填项</span>
        </div>

        <div className='feedback-grid'>
          <label className='feedback-field feedback-field-wide'>
            <span>反馈标题</span>
            <input
              name='title'
              value={form.title}
              onChange={update}
              maxLength={120}
              placeholder='例如：DeepSeek V4.1 Flash 的免费额度已变化'
            />
          </label>

          <label className='feedback-field'>
            <span>反馈类型 *</span>
            <select name='type' value={form.type} onChange={update}>
              {FEEDBACK_TYPES.map(type => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>

          <label className='feedback-field'>
            <span>对象类型 *</span>
            <select name='objectType' value={form.objectType} onChange={update}>
              {FEEDBACK_OBJECT_TYPES.map(type => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>

          <label className='feedback-field feedback-field-wide'>
            <span>对象名称 *</span>
            <input
              name='objectName'
              value={form.objectName}
              onChange={update}
              maxLength={120}
              required
              placeholder='模型名 / 平台名 / 站点名称'
            />
          </label>

          <label className='feedback-field feedback-field-wide'>
            <span>页面地址 *</span>
            <input
              name='pageUrl'
              type='url'
              value={form.pageUrl}
              onChange={update}
              required
              placeholder='https://www.freetok.org/article/...'
            />
          </label>

          <label className='feedback-field feedback-field-wide'>
            <span id='feedback-description-label'>问题说明 *</span>
            <textarea
              name='description'
              aria-labelledby='feedback-description-label'
              value={form.description}
              onChange={update}
              maxLength={2000}
              rows={6}
              required
              placeholder='你看到了什么？期望是什么？如果有截图或原始链接，也可以一并说明。'
            />
            <small aria-hidden='true'>{form.description.length} / 2000</small>
          </label>

          <label className='feedback-field feedback-field-wide'>
            <span id='feedback-email-label'>
              电子邮件 <em>选填</em>
            </span>
            <input
              name='email'
              aria-labelledby='feedback-email-label'
              type='email'
              value={form.email}
              onChange={update}
              maxLength={200}
              placeholder='需要回复时留下邮箱'
            />
          </label>
        </div>

        <input
          className='feedback-honeypot'
          tabIndex={-1}
          autoComplete='off'
          aria-hidden='true'
          name='website'
          value={website}
          onChange={event => setWebsite(event.target.value)}
        />

        <div className='feedback-verification'>
          <div className='feedback-verification-copy'>
            <strong>人机验证</strong>
            <span>为避免无意义的重复提交，需要人机认证后方可提交。</span>
          </div>
          {turnstileSiteKey ? (
            <TurnstileWidget
              key={turnstileResetKey}
              siteKey={turnstileSiteKey}
              onVerify={handleTurnstileVerify}
              onExpire={handleTurnstileExpire}
              onError={handleTurnstileError}
            />
          ) : (
            <div className='feedback-turnstile-missing' role='alert'>
              反馈验证尚未配置，暂时无法提交。
            </div>
          )}
        </div>

        {error && (
          <div className='feedback-error' role='alert'>
            {error}
          </div>
        )}

        <div className='feedback-actions'>
          <button
            type='submit'
            className='feedback-primary'
            disabled={!canSubmit}
          >
            {status === 'submitting' ? '正在提交…' : '提交反馈'}
          </button>
          <span>提交后我们会统一核实与追踪。</span>
        </div>
      </form>
    </main>
  )
}
