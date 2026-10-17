import {
  buildOAuthResultUrl,
  exchangeNotionOAuthCode
} from '@/lib/auth/notion-oauth'
import type { NextApiRequest, NextApiResponse } from 'next'

/**
 * Notion授权回调
 * @param req
 * @param res
 * @returns
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('Referrer-Policy', 'no-referrer')
  const code = Array.isArray(req.query.code)
    ? req.query.code[0]
    : req.query.code
  const result = await exchangeNotionOAuthCode(code)
  res.redirect(302, buildOAuthResultUrl(result))
}
