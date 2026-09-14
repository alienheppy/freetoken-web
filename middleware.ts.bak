import { NextRequest, NextResponse } from 'next/server'
import { checkStrIsNotionId, getLastPartOfUrl } from '@/lib/utils'
import { idToUuid } from 'notion-utils'
import BLOG from './blog.config'

/**
 * FreeToken 站 middleware（精简版）
 * 原版为 NotionNext 官方 Clerk 身份验证中间件：顶层 `import { clerkMiddleware }
 * from '@clerk/nextjs/server'` 会在无 Clerk 配置的部署（Vercel Node 运行时）里
 * 以 ESM 语法加载失败 → MIDDLEWARE_INVOCATION_FAILED 500。
 * 本站不使用 Clerk 多租户功能，故移除顶层 Clerk import 与鉴权分支；
 * 仅保留 UUID_REDIRECT 短链跳转功能（与 Clerk 无关）。
 * 如未来需要 Clerk，恢复原版并配置 NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY。
 */
export const config = {
  // 白名单：静态资源与 auth 路由不进 middleware
  matcher: ['/((?!.*\\..*|_next|/sign-in|/auth).*)', '/', '/(api|trpc)(.*)']
}

// eslint-disable-next-line @typescript-eslint/require-await, @typescript-eslint/no-explicit-any
const freetokenMiddleware = async (req: NextRequest, ev: any) => {
  if (BLOG['UUID_REDIRECT']) {
    let redirectJson: Record<string, string> = {}
    try {
      const response = await fetch(`${req.nextUrl.origin}/redirect.json`)
      if (response.ok) {
        redirectJson = (await response.json()) as Record<string, string>
      }
    } catch (err) {
      console.error('Error fetching static file:', err)
    }
    let lastPart = getLastPartOfUrl(req.nextUrl.pathname) as string
    if (checkStrIsNotionId(lastPart)) {
      lastPart = idToUuid(lastPart)
    }
    if (lastPart && redirectJson[lastPart]) {
      const redirectToUrl = req.nextUrl.clone()
      redirectToUrl.pathname = '/' + redirectJson[lastPart]
      console.log(
        `redirect from ${req.nextUrl.pathname} to ${redirectToUrl.pathname}`
      )
      return NextResponse.redirect(redirectToUrl, 308)
    }
  }
  return NextResponse.next()
}

export default freetokenMiddleware
