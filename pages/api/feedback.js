import { Client } from '@notionhq/client'

import {
  buildFeedbackProperties,
  validateFeedbackPayload
} from '@/lib/freetoken/feedback'
import { verifyTurnstileToken } from '@/lib/freetoken/turnstile'

const databaseId =
  process.env.NOTION_FEEDBACK_DATABASE_ID || '3fe2570237f4805bbdadf7c7c78dfb6f'

const rateWindowMs = 60 * 1000
const rateLimit = Number(process.env.NOTION_FEEDBACK_RATE_LIMIT || 5)
const ipHits = new Map()

const getClient = () => {
  const token =
    process.env.NOTION_FEEDBACK_TOKEN ||
    process.env.NOTION_API_TOKEN ||
    process.env.NOTION_TOKEN
  if (!databaseId || !token) {
    throw new Error(
      'Missing NOTION_FEEDBACK_DATABASE_ID or a Notion write token'
    )
  }
  return new Client({ auth: token })
}

const getClientIp = req => {
  const forwardedFor = req.headers['x-forwarded-for']
  return String(
    Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor || ''
  )
    .split(',')[0]
    .trim()
}

const isRateLimited = ip => {
  const now = Date.now()
  const hits = (ipHits.get(ip) || []).filter(time => now - time < rateWindowMs)
  if (hits.length >= rateLimit) {
    ipHits.set(ip, hits)
    return true
  }
  hits.push(now)
  ipHits.set(ip, hits)
  return false
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  const validation = validateFeedbackPayload(req.body)
  if (!validation.ok) {
    return res.status(400).json({ error: validation.error })
  }
  if (validation.spam) {
    return res.status(200).json({ ok: true })
  }

  const ip = getClientIp(req) || 'unknown'
  if (isRateLimited(ip)) {
    return res.status(429).json({ error: '提交过于频繁，请稍后再试' })
  }

  const turnstile = await verifyTurnstileToken({
    token: req.body?.turnstileToken,
    remoteIp: ip === 'unknown' ? '' : ip,
    secretKey: process.env.TURNSTILE_SECRET_KEY
  })
  if (!turnstile.ok) {
    if (turnstile.reason === 'not-configured') {
      console.error('Missing TURNSTILE_SECRET_KEY')
      return res.status(503).json({ error: '反馈验证尚未配置' })
    }
    if (turnstile.reason === 'verification-unavailable') {
      console.error('Turnstile verification unavailable:', turnstile.error)
      return res.status(503).json({ error: '人机验证服务暂时不可用，请稍后再试' })
    }
    return res.status(400).json({ error: '人机验证未通过，请刷新后重试' })
  }

  try {
    const notion = getClient()
    const response = await notion.pages.create({
      parent: { database_id: databaseId },
      properties: buildFeedbackProperties(validation.value)
    })

    return res.status(200).json({
      ok: true,
      id: response.id
    })
  } catch (error) {
    console.error('Failed to create Notion feedback:', error)
    const message =
      error?.code === 'unauthorized'
        ? '反馈服务尚未完成 Notion 授权'
        : '提交失败，请稍后再试'
    return res.status(500).json({ error: message })
  }
}
