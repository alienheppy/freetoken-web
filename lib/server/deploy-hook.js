/**
 * Trigger a full Vercel rebuild for structural Notion changes such as adding,
 * deleting, or renaming a page. The URL is intentionally read from the
 * environment only; callers must never be able to provide an arbitrary URL.
 */
export async function triggerVercelDeployHook(reason = 'manual') {
  const hookUrl = String(process.env.VERCEL_DEPLOY_HOOK_URL || '').trim()
  if (!hookUrl) {
    return {
      configured: false,
      triggered: false,
      message: 'VERCEL_DEPLOY_HOOK_URL is not configured'
    }
  }

  if (!hookUrl.startsWith('https://')) {
    return {
      configured: true,
      triggered: false,
      message: 'VERCEL_DEPLOY_HOOK_URL must use https://'
    }
  }

  try {
    const response = await fetch(hookUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify({ reason })
    })

    const responseText = await response.text()
    if (!response.ok) {
      return {
        configured: true,
        triggered: false,
        status: response.status,
        message: `Deploy hook returned ${response.status}`,
        response: responseText.slice(0, 500)
      }
    }

    return {
      configured: true,
      triggered: true,
      status: response.status,
      message: 'Vercel deploy hook triggered',
      response: responseText.slice(0, 500)
    }
  } catch (error) {
    return {
      configured: true,
      triggered: false,
      message: `Deploy hook request failed: ${error?.message || error}`
    }
  }
}
