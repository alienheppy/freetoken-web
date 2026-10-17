import { cleanCache } from '@/lib/cache/local_file_cache'
import { refreshNotionSiteDataInBackground } from '@/lib/cache/notion-runtime-refresh'

/**
 * 清理缓存
 * @param {*} req
 * @param {*} res
 */
export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res
      .status(405)
      .json({ status: 'error', message: 'Method not allowed' })
  }

  const token = process.env.CACHE_REVALIDATION_TOKEN
  if (!token) {
    return res.status(503).json({
      status: 'error',
      message:
        'Cache revalidation is disabled: missing CACHE_REVALIDATION_TOKEN'
    })
  }

  if (req.headers.authorization !== `Bearer ${token}`) {
    return res.status(401).json({ status: 'error', message: 'Unauthorized' })
  }

  try {
    let body = req.body
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body)
      } catch {
        body = null
      }
    }

    if (body?.clearOnly === true) {
      cleanCache()
      return res
        .status(200)
        .json({ status: 'success', message: 'Clean cache successful!' })
    }

    const { started } = refreshNotionSiteDataInBackground('api-cache')
    res.status(202).json({
      status: 'accepted',
      message: started
        ? 'Notion refresh started in background. Old cache remains available.'
        : 'A Notion refresh is already running. Reused the current task.'
    })
  } catch (error) {
    console.error('Cache refresh scheduling error:', error)
    res
      .status(400)
      .json({ status: 'error', message: 'Cache refresh scheduling failed!' })
  }
}
