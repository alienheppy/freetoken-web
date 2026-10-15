/**
 * 开发人员可能需要关注的配置
 */
module.exports = {
  SUB_PATH: '', // leave this empty unless you want to deploy in a folder
  DEBUG: process.env.NEXT_PUBLIC_DEBUG || false, // 是否显示调试按钮
  // TAILWINDCSS 配置的自定义颜色，作废
  BACKGROUND_LIGHT: '#eeeeee', // use hex value, don't forget '#' e.g #fffefc
  BACKGROUND_DARK: '#000000', // use hex value, don't forget '#'

  // Redis 缓存数据库地址
  REDIS_URL: process.env.REDIS_URL || '',

  // 未设置 ENABLE_CACHE 时：build/export 默认开启；next dev 下 NODE_ENV=development 也默认开启，便于本地命中 file+memory 缓存。
  // 若不想用缓存，请在 .env.local 中设置 ENABLE_CACHE=false（字符串即可）。
  ENABLE_CACHE:
    process.env.ENABLE_CACHE ||
    process.env.npm_lifecycle_event === 'build' ||
    process.env.npm_lifecycle_event === 'export' ||
    process.env.NODE_ENV === 'development',
  // Notion 派生数据的缓存有效期（秒）；0 或留空 = 永不过期（旧行为）。
  //
  // 为什么需要硬上限：缓存的失效依据是「页面的 lastEditedDate」，但模型页正文里那张
  // 渠道子表（child_database）增删行**不会**改动父页面的 lastEditedDate，
  // 于是 page_block_<id>_<lastEditedDate> 这类键永远不会失效 —— 线上表现就是
  // 「Notion 里已经有 6 个渠道，站点长期只显示 1 个」。给所有 Notion 派生缓存
  // （global_data_* / site_* / page_block_* / build_static_paths_*）加统一上限后，
  // 数据最多滞后这么久就会自动重新拉取。
  //
  // 注意：整站冷重建要逐个拉取约 94 个模型页，实测 85~160 秒（个别请求会被
  // Notion 拖到 70 秒以上），所以不建议调到 60 秒级。改完 Notion 想立刻生效，
  // 用 POST /api/cache 清缓存即可。
  NOTION_DATA_CACHE_TTL_SECOND: (() => {
    const raw = process.env.NOTION_DATA_CACHE_TTL_SECOND
    if (raw === undefined || raw === null || String(raw).trim() === '') return 300
    const n = Number(raw)
    return Number.isFinite(n) && n >= 0 ? n : 300
  })(),
  isProd: process.env.VERCEL_ENV === 'production' || process.env.EXPORT, // distinguish between development and production environment (ref: https://vercel.com/docs/environment-variables#system-environment-variables)
  BUNDLE_ANALYZER: process.env.ANALYZE === 'true' || false, // 是否展示编译依赖内容与大小
  VERSION: (() => {
    try {
      // 优先使用环境变量，否则从package.json中获取版本号
      return (
        process.env.NEXT_PUBLIC_VERSION || require('../package.json').version
      )
    } catch (error) {
      console.warn('Failed to load package.json version:', error)
      return '1.0.0' // 缺省版本号
    }
  })()
}
