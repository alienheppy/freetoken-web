const fs = require('node:fs')
const path = require('node:path')
const BLOG = require('./blog.config')
const { extractLangPrefix } = require('./lib/utils/pageId')
const { isExport } = require('./lib/utils/buildMode')
const { getStaticPageGenerationTimeoutSec } = require('./lib/build/buildEnv')

// 打包时是否分析代码
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: BLOG.BUNDLE_ANALYZER
})

// 扫描项目 /themes下的目录名
const themes = scanSubdirectories(path.resolve(__dirname, 'themes'))
// 检测用户开启的多语言
const locales = (function () {
  // 根据BLOG_NOTION_PAGE_ID 检查支持多少种语言数据.
  // 支持如下格式配置多个语言的页面id xxx,zh:xxx,en:xxx
  const langs = [BLOG.LANG]
  if (BLOG.NOTION_PAGE_ID.indexOf(',') > 0) {
    const siteIds = BLOG.NOTION_PAGE_ID.split(',')
    for (const siteId of siteIds) {
      const prefix = extractLangPrefix(siteId)
      // 如果包含前缀 例如 zh , en 等
      if (prefix) {
        if (!langs.includes(prefix)) {
          langs.push(prefix)
        }
      }
    }
  }
  return langs
})()

/**
 * next dev 会话开始时清掉不可靠的 Notion 派生缓存，
 * 保证每次 `yarn dev` 都重新拉取最新数据，而不是命中上一次会话的旧结果。
 *
 * 只保留「带明确过期时间的有版本 page block」（page_block_<id>_<lastEditedDate>，
 * 且 expireTime 由 NOTION_DATA_CACHE_TTL_SECOND 写入），其余一律删除：
 *   - global_data_* / site_* / build_static_paths_*：键不带版本；
 *   - 无版本的 page_block_<id>（根页面等）；
 *   - 无过期时间的 page_block_*：历史遗留条目。版本号只覆盖「页面本身被编辑」，
 *     而模型页内嵌的渠道子表增删行不会改动父页面 lastEditedDate，这类条目
 *     可能永久陈旧（实测线上曾长期用 10-14 的旧渠道快照渲染「模型提供商」）。
 *
 * 设 NOTION_DEV_KEEP_CACHE=true 可跳过（复用上次会话数据，起服务更快）。
 */
function purgeDerivedNotionCache(dataDir) {
  if (!fs.existsSync(dataDir)) return { removed: 0, kept: 0 }

  let removed = 0
  let kept = 0
  for (const name of fs.readdirSync(dataDir)) {
    if (!name.endsWith('.json')) continue
    const file = path.join(dataDir, name)
    try {
      const entry = JSON.parse(fs.readFileSync(file, 'utf8'))
      if (
        isVersionedPageBlockCacheKey(entry?.key) &&
        hasExplicitExpiry(entry)
      ) {
        kept++
        continue
      }
    } catch {}
    try {
      fs.rmSync(file, { force: true })
      removed++
    } catch {}
  }
  return { removed, kept }
}

/**
 * 条目是否带明确的过期时间。
 *
 * 版本号（lastEditedDate）不足以判定 page block 是否仍是最新：渠道子表的行增删
 * 不会改动父页面。只有写入时带了 TTL 的条目才允许跨会话复用，否则视为遗留条目。
 * @param {{expireTime?: number|null}} entry 缓存条目
 * @returns {boolean} 是否带未来/正数过期时间
 */
function hasExplicitExpiry(entry) {
  const t = Number(entry?.expireTime)
  return Number.isFinite(t) && t > 0
}

/** 进程是否仍在运行（用于判断锁文件是否属于「上一次已退出的会话」） */
function isProcessAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false
  try {
    process.kill(pid, 0)
    return true
  } catch (err) {
    // EPERM：进程存在但无权限探测，同样视为存活
    return Boolean(err && err.code === 'EPERM')
  }
}

/**
 * 判断本次 dev 会话是否已经清过缓存。
 * 判据是「锁文件里记录的 pid 是否还活着」，而不是时间窗口：
 * 停止服务后立刻重启（秒级）也必须重新拉取，不能被时间窗口误判为同一次会话。
 * 返回 true 表示本次会话是新的（需要清缓存并写锁）。
 */
function claimDevCacheSession(lockFile) {
  try {
    const raw = fs.readFileSync(lockFile, 'utf8')
    const parsed = JSON.parse(raw)
    if (isProcessAlive(Number(parsed?.pid))) return false
  } catch (_) {
    /* 锁文件不存在或损坏：视为新会话 */
  }
  try {
    fs.mkdirSync(path.dirname(lockFile), { recursive: true })
    fs.writeFileSync(
      lockFile,
      JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() })
    )
    return true
  } catch (_) {
    return false
  }
}

// next dev 时配置会被主进程与各 worker 各自加载一次，globalThis 无法跨进程去重；
// 用锁文件把「清缓存 + 打印提示」收敛到本次会话的第一个加载者。
;(function prepareDevNotionCache() {
  if (process.env.npm_lifecycle_event !== 'dev') return

  const cacheRoot = process.env.NOTION_NEXT_NOTION_CACHE_DIR
    ? path.resolve(process.env.NOTION_NEXT_NOTION_CACHE_DIR)
    : path.join(__dirname, '.next', 'cache', 'notion')
  const lockFile = path.join(cacheRoot, 'dev-cache-session.lock')

  if (!claimDevCacheSession(lockFile)) return

  if (process.env.NOTION_DEV_KEEP_CACHE === 'true') {
    console.log(
      '[NotionNext] Dev cache reused (NOTION_DEV_KEEP_CACHE=true)；服务启动后会在后台刷新 Notion，期间继续使用旧缓存'
    )
    return
  }

  const { removed, kept } = purgeDerivedNotionCache(
    path.join(cacheRoot, 'data')
  )
  console.log(
    `[NotionNext] Dev session cache reset: purged ${removed} derived entries, kept ${kept} versioned page blocks → 本次启动会重新拉取 Notion 最新数据`
  )
  console.log(
    '[NotionNext] Dev cache ON (ENABLE_CACHE=true)；会话内命中缓存加速，ENABLE_CACHE=false 可完全关闭缓存'
  )
})()

// 编译前执行
// eslint-disable-next-line no-unused-vars
const preBuild = (function () {
  if (
    process.env.npm_lifecycle_event !== 'export' &&
    process.env.npm_lifecycle_event !== 'build'
  ) {
    return
  }
  // 删除 public/sitemap.xml 文件 ； 否则会和/pages/sitemap.xml.js 冲突。
  if (process.env.NEXT_PRIVATE_BUILD_WORKER) {
    return
  }
  const sitemapPath = path.resolve(__dirname, 'public', 'sitemap.xml')
  if (fs.existsSync(sitemapPath)) {
    fs.unlinkSync(sitemapPath)
    console.log('Deleted existing sitemap.xml from public directory')
  }

  const sitemap2Path = path.resolve(__dirname, 'sitemap.xml')
  if (fs.existsSync(sitemap2Path)) {
    fs.unlinkSync(sitemap2Path)
    console.log('Deleted existing sitemap.xml from root directory')
  }

  // 构建前删除遗留的静态 RSS 产物，避免与生成逻辑不一致时读到过时 feed（源自 PR #3123 的单一补丁）
  const rssDir = path.resolve(__dirname, 'public', 'rss')
  for (const name of ['feed.xml', 'atom.xml', 'feed.json']) {
    const rssPath = path.join(rssDir, name)
    if (fs.existsSync(rssPath)) {
      fs.unlinkSync(rssPath)
      console.log(`Deleted existing ${name} from public/rss`)
    }
  }

  const notionCacheRoot = path.resolve(__dirname, '.next', 'cache', 'notion')
  const dataDir = path.join(notionCacheRoot, 'data')
  const prefetchDir = path.join(notionCacheRoot, 'sessions')
  const sessionFile = path.join(notionCacheRoot, 'build-session.json')
  const sessionId = `${process.env.npm_lifecycle_event}-${Date.now()}-${process.pid}`

  if (process.env.NOTION_BUILD_CACHE_PURGE_DATA === 'true') {
    fs.rmSync(dataDir, { recursive: true, force: true })
    console.log('Purged persistent Notion data cache')
  } else {
    pruneTransientNotionDataCache(dataDir)
    console.log('Preserved versioned Notion page block cache')
  }
  fs.rmSync(prefetchDir, { recursive: true, force: true })
  fs.mkdirSync(notionCacheRoot, { recursive: true })
  fs.writeFileSync(
    sessionFile,
    JSON.stringify(
      {
        sessionId,
        createdAt: new Date().toISOString(),
        lifecycle: process.env.npm_lifecycle_event,
        pid: process.pid
      },
      null,
      2
    )
  )
  console.log('Prepared Notion build session', sessionId)
})()

function isVersionedPageBlockCacheKey(key) {
  return /^page_block_.+_\d{10,}$/.test(String(key || ''))
}

/**
 * 构建期裁剪持久化缓存：只保留「带过期时间的有版本 page block」。
 *
 * 与 dev 会话清理同一判据（见 purgeDerivedNotionCache / hasExplicitExpiry）：
 * 版本号无法感知渠道子表的行增删，只有带 TTL 的条目才敢跨构建复用；
 * 无过期时间的历史条目会在这次构建里被丢弃并重新拉取，避免部署出来的快照长期陈旧。
 * @param {string} dataDir 缓存 data 目录
 */
function pruneTransientNotionDataCache(dataDir) {
  if (!fs.existsSync(dataDir)) {
    return
  }

  let removed = 0
  let kept = 0
  for (const name of fs.readdirSync(dataDir)) {
    if (!name.endsWith('.json')) continue

    const file = path.join(dataDir, name)
    try {
      const entry = JSON.parse(fs.readFileSync(file, 'utf8'))
      if (
        isVersionedPageBlockCacheKey(entry?.key) &&
        hasExplicitExpiry(entry)
      ) {
        kept++
        continue
      }
    } catch {}

    fs.rmSync(file, { force: true })
    removed++
  }

  console.log(
    `Pruned transient Notion cache entries: removed=${removed} kept=${kept}`
  )
}

/**
 * 扫描指定目录下的文件夹名，用于获取所有主题
 * @param {*} directory
 * @returns
 */
function scanSubdirectories(directory) {
  const subdirectories = []

  fs.readdirSync(directory).forEach(file => {
    const fullPath = path.join(directory, file)
    const stats = fs.statSync(fullPath)
    if (stats.isDirectory()) {
      subdirectories.push(file)
    }

    // subdirectories.push(file)
  })

  return subdirectories
}

/**
 * @type {import('next').NextConfig}
 */

function getOutput() {
  if (isExport()) return 'export'
  if (process.env.NEXT_BUILD_STANDALONE === 'true') return 'standalone'
  return undefined
}

const nextConfig = {
  output: getOutput(),
  staticPageGenerationTimeout: getStaticPageGenerationTimeoutSec(),

  // 性能优化配置
  compress: true,
  poweredByHeader: false,
  generateEtags: true,

  // 构建优化
  modularizeImports: {
    '@heroicons/react/24/outline': {
      transform: '@heroicons/react/24/outline/{{member}}'
    },
    '@heroicons/react/24/solid': {
      transform: '@heroicons/react/24/solid/{{member}}'
    }
  },
  // 多语言， 在export时禁用
  i18n: process.env.EXPORT
    ? undefined
    : {
        defaultLocale: BLOG.LANG,
        // 支持的所有多语言,按需填写即可
        locales: locales
      },
  images: {
    // 图片压缩和格式优化
    formats: ['image/avif', 'image/webp'],
    // 图片尺寸优化
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // NotionNext 站长图源不可控（任意外链），这里放开 http/https 远程图片来源
    // 说明：这会显著降低“域名白名单漏配导致图片不显示”的概率
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**'
      },
      {
        protocol: 'http',
        hostname: '**'
      }
    ],
    // 图片加载器优化
    loader: 'default',
    // 图片缓存优化
    minimumCacheTTL: 60 * 60 * 24 * 7, // 7天
    // 危险的允许SVG
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;"
  },

  // 默认将feed重定向至 /public/rss/feed.xml
  redirects: process.env.EXPORT
    ? undefined
    : () => {
        return [
          {
            source: '/feed',
            destination: '/rss/feed.xml',
            permanent: true
          }
        ]
      },
  // 重写url
  rewrites: process.env.EXPORT
    ? undefined
    : () => {
        // 处理多语言重定向
        const langsRewrites = []
        if (BLOG.NOTION_PAGE_ID.indexOf(',') > 0) {
          const siteIds = BLOG.NOTION_PAGE_ID.split(',')
          const langs = []
          for (const siteId of siteIds) {
            const prefix = extractLangPrefix(siteId)
            // 如果包含前缀 例如 zh , en 等
            if (prefix) {
              langs.push(prefix)
            }
            console.log('[Locales]', siteId)
          }

          // 映射多语言
          // 示例： source: '/:locale(zh|en)/:path*' ; :locale() 会将语言放入重写后的 `?locale=` 中。
          langsRewrites.push(
            {
              source: `/:locale(${langs.join('|')})/:path*`,
              destination: '/:path*'
            },
            // 匹配没有路径的情况，例如 [domain]/zh 或 [domain]/en
            {
              source: `/:locale(${langs.join('|')})`,
              destination: '/'
            },
            // 匹配没有路径的情况，例如 [domain]/zh/ 或 [domain]/en/
            {
              source: `/:locale(${langs.join('|')})/`,
              destination: '/'
            }
          )
        }

        return [
          ...langsRewrites,
          // RSS fallback: when static file doesn't exist, route to API
          {
            source: '/rss/feed.xml',
            destination: '/api/rss'
          },
          {
            source: '/rss/atom.xml',
            destination: '/api/rss?format=atom'
          },
          {
            source: '/rss/feed.json',
            destination: '/api/rss?format=json'
          },
          // 伪静态重写
          {
            source: '/:path*.html',
            destination: '/:path*'
          }
        ]
      },
  headers: process.env.EXPORT
    ? undefined
    : () => {
        return [
          {
            source: '/vendor/fontawesome/:path*',
            headers: [
              {
                key: 'Cache-Control',
                value: 'public, max-age=31536000, immutable'
              }
            ]
          },
          {
            source: '/:path*{/}?',
            headers: [
              // 基础安全响应头；CSP 只限制高危能力，不阻断 Notion 图片与嵌入。
              { key: 'X-Content-Type-Options', value: 'nosniff' },
              { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
              {
                key: 'Referrer-Policy',
                value: 'strict-origin-when-cross-origin'
              },
              {
                key: 'Permissions-Policy',
                value: 'camera=(), microphone=(), geolocation=()'
              },
              {
                key: 'Content-Security-Policy',
                value:
                  "base-uri 'self'; object-src 'none'; frame-ancestors 'self'"
              }
            ]
          },
          {
            // CORS 只开放给 API；不使用 credentials，避免与通配 Origin 冲突。
            source: '/api/:path*',
            headers: [
              { key: 'Access-Control-Allow-Origin', value: '*' },
              {
                key: 'Access-Control-Allow-Methods',
                value: 'GET,HEAD,POST,OPTIONS'
              },
              {
                key: 'Access-Control-Allow-Headers',
                value:
                  'Authorization, X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
              }
            ]
          }
        ]
      },
  webpack: (config, { dev, isServer }) => {
    config.ignoreWarnings = [
      ...(config.ignoreWarnings || []),
      {
        module:
          /[\\/]next[\\/]dist[\\/]esm[\\/]client[\\/]components[\\/]navigation\.js$/,
        message: /useContext.*not exported from ['"]react['"]/i
      }
    ]

    // 动态主题：添加 resolve.alias 配置，将动态路径映射到实际路径
    config.resolve.alias['@'] = path.resolve(__dirname)
    config.resolve.alias['lodash.throttle'] = path.resolve(
      __dirname,
      'lib/utils/throttle.js'
    )

    if (!isServer) {
      console.log(
        '[ThemeResolver][webpack]',
        JSON.stringify({
          note: 'Layouts load via dynamic import(@/themes/<name>). Theme folder follows runtime NEXT_PUBLIC_THEME / Notion; no compile-time @theme-components alias.',
          envTheme: process.env.NEXT_PUBLIC_THEME || null,
          configTheme: BLOG.THEME,
          themeFolderPath: path.resolve(__dirname, 'themes', BLOG.THEME)
        })
      )
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        dns: false,
        path: false
      }
    }
    return config
  },
  experimental: {
    // cpus: 1,
    scrollRestoration: true,
    // 性能优化实验性功能
    optimizePackageImports: ['@heroicons/react', 'lodash']
  },
  exportPathMap: function (
    defaultPathMap,
    { dev, dir, outDir, distDir, buildId }
  ) {
    // export 静态导出时 忽略/pages/sitemap.xml.js ， 否则和getServerSideProps这个动态文件冲突
    const pages = { ...defaultPathMap }
    delete pages['/sitemap.xml']
    delete pages['/auth']
    return pages
  },
  publicRuntimeConfig: {
    // 这里的配置既可以服务端获取到，也可以在浏览器端获取到
    THEMES: themes
  }
}

module.exports = process.env.ANALYZE
  ? withBundleAnalyzer(nextConfig)
  : nextConfig
