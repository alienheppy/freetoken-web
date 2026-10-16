import BLOG from '@/blog.config'
import { getOrSetDataWithCache } from '@/lib/cache/cache_manager'
import { fetchGlobalAllData } from '@/lib/db/SiteDataApi'
import { getPriorityPages, prefetchAllBlockMaps } from '@/lib/build/prefetch'
import { isExport } from '@/lib/utils/buildMode'
import {
  getStaticPathsMax,
  isStaticPathsPriorityOnly
} from '@/lib/build/buildEnv'

const inProcessAllPagesPromises = new Map()

function getStaticPathsCacheKey({ pageId = BLOG.NOTION_PAGE_ID, locale }) {
  const safePageId = String(pageId || BLOG.NOTION_PAGE_ID).replace(
    /[^a-z0-9,_:-]/gi,
    '_'
  )
  const safeLocale = String(locale || 'default').replace(/[^a-z0-9_-]/gi, '_')
  return `build_static_paths_all_pages_${safeLocale}_${safePageId}`
}

export function getSharedAllPages({
  from = 'slug-paths',
  pageId = BLOG.NOTION_PAGE_ID,
  locale
} = {}) {
  const cacheKey = getStaticPathsCacheKey({ pageId, locale })

  if (!inProcessAllPagesPromises.has(cacheKey)) {
    const promise = getOrSetDataWithCache(cacheKey, async () => {
      const { allPages = [] } = await fetchGlobalAllData({
        pageId,
        from,
        locale
      })
      return Array.isArray(allPages) ? allPages : []
    })
    promise.catch(() => {
      inProcessAllPagesPromises.delete(cacheKey)
    })
    inProcessAllPagesPromises.set(cacheKey, promise)
  }

  return inProcessAllPagesPromises.get(cacheKey)
}

export async function getStaticPathsBase({
  filterFn = () => true,
  mapPageToParams,
  from = 'slug-paths',
  pageId = BLOG.NOTION_PAGE_ID,
  locale
}) {
  const allPages = await getSharedAllPages({ from, pageId, locale })

  if (isExport()) {
    await prefetchAllBlockMaps(allPages)
    return {
      paths: allPages.filter(filterFn).map(mapPageToParams),
      fallback: false
    }
  }

  // ISR 模式：默认把「本路由能匹配到的全部页面」都预生成。
  //
  // 为什么不沿用「只预生成前 10 篇」：未预生成的路径会走 fallback: 'blocking'，
  // 首次访问必须在冷实例上现场装配整站 Notion 数据（实测线上单次 296 秒），
  // 表现为「新访客第一次点模型卡片长时间无响应、过一会儿才正常」。
  // 预生成过的路径（平台页就是全量预生成）都是 CDN 命中、秒开 —— 这就是
  // 「切平台秒进、点模型卡会卡」的根因。
  //
  // 预生成成本是构建期一次性的：每个页面需要它自己的 blockMap，构建结束后
  // 全部走静态产物。构建时间不够时可置 STATIC_PATHS_PRIORITY_ONLY=true 退回旧行为。
  const source = isStaticPathsPriorityOnly()
    ? getPriorityPages(allPages) || []
    : getPrebuildablePages(allPages)
  const max = getStaticPathsMax()
  const targets = max > 0 ? source.slice(0, max) : source

  return {
    paths: targets.filter(filterFn).map(mapPageToParams),
    fallback: 'blocking'
  }
}

/**
 * 全量预生成时的候选页面：只取「已发布」的行。
 *
 * allPages 里同时含有 Invisible 行（用于菜单等场景），它们不应出现在构建产物里；
 * 万一被直接访问，仍由 fallback: 'blocking' 现场渲染，行为与改动前一致。
 * 顺带省掉这部分无效的 blockMap 拉取与页面渲染。
 *
 * 另外要求 type 是字符串：各路由的 filterFn（checkSlugHasNoSlash 等）会直接读
 * row.type.indexOf('Menu')，缺失 type 的行会抛错。旧实现只传 type=Post 的行，
 * 天然不会遇到；改成全量后必须显式挡住这类脏数据。
 */
function getPrebuildablePages(allPages) {
  if (!Array.isArray(allPages)) return []
  return allPages.filter(
    page =>
      page &&
      page.status === 'Published' &&
      typeof page.type === 'string' &&
      page.slug
  )
}
