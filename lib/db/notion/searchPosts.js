import BLOG from '@/blog.config'
import { getDataFromCache } from '@/lib/cache/cache_manager'
import { getPageContentText } from '@/lib/db/notion/getPageContentText'
import {
  fetchNotionPageBlocks,
  getPageBlockCacheKey
} from '@/lib/db/notion/getPostBlocks'
import { adapterNotionBlockMap } from '@/lib/utils/notion.util'
import { extractLangId, extractLangPrefix } from '@/lib/utils/pageId'

const MAX_SNIPPETS = 3
const SNIPPET_LENGTH = 160

/**
 * Join the post metadata that participates in search.
 * @param {object} post
 * @returns {string}
 */
function getPostMetadataText(post) {
  const tags = post?.tags && Array.isArray(post.tags) ? post.tags.join(' ') : ''
  const category =
    post?.category && Array.isArray(post.category)
      ? post.category.join(' ')
      : ''

  return [post?.title, post?.summary, tags, category]
    .filter(value => typeof value === 'string' && value)
    .join(' ')
}

/**
 * Return a short readable excerpt around the first keyword occurrence.
 * @param {string} text
 * @param {string} normalizedKeyword
 * @returns {string}
 */
function getSnippet(text, normalizedKeyword) {
  const source = String(text || '')
    .replace(/\s+/g, ' ')
    .trim()
  if (!source) return ''

  const index = source.toLowerCase().indexOf(normalizedKeyword)
  if (index < 0) return source.slice(0, SNIPPET_LENGTH)

  const half = Math.floor((SNIPPET_LENGTH - normalizedKeyword.length) / 2)
  const start = Math.max(0, index - half)
  const end = Math.min(source.length, start + SNIPPET_LENGTH)
  const prefix = start > 0 ? '…' : ''
  const suffix = end < source.length ? '…' : ''

  return `${prefix}${source.slice(start, end)}${suffix}`
}

/**
 * Build searchable text for a post. Cached blocks are optional: metadata-only
 * search still works when a page body is unavailable or encrypted.
 * @param {object} post
 * @param {object|null} page
 * @returns {{ metadataText: string, contentText: string }}
 */
export function getSearchablePostText(post, page) {
  const metadataText = getPostMetadataText(post)
  let contentText = ''

  if (page && !post?.password) {
    try {
      contentText = getPageContentText(post, page)
    } catch (error) {
      console.warn(
        `[Search] failed to read page content for ${post?.id || 'unknown'}: ${
          error?.message || 'unknown error'
        }`
      )
    }
  }

  return { metadataText, contentText }
}

/**
 * Resolve the Notion root page that owns the posts for a locale.
 * A configured value may contain multiple `locale:pageId` entries.
 *
 * @param {string} locale
 * @returns {string}
 */
export function resolveSearchRootPageId(locale) {
  const siteIds = String(BLOG.NOTION_PAGE_ID || '')
    .split(',')
    .map(value => value.trim())
    .filter(Boolean)
  if (!siteIds.length) return ''

  const normalizedLocale = String(locale || '').toLowerCase()
  const localizedId = siteIds.find(siteId => {
    const prefix = extractLangPrefix(siteId).toLowerCase()
    return (
      prefix &&
      (normalizedLocale === prefix || normalizedLocale.startsWith(`${prefix}-`))
    )
  })
  const defaultId = siteIds.find(siteId => !extractLangPrefix(siteId))

  return extractLangId(localizedId || defaultId || siteIds[0])
}

/**
 * Load the root page record map once. It contains the Post page blocks and
 * their body children, unlike the possibly incomplete per-page cache.
 *
 * @param {string} locale
 * @returns {Promise<object|null>}
 */
async function getRootPageBlockMap(locale) {
  const pageId = resolveSearchRootPageId(locale)
  if (!pageId) return null

  try {
    return await fetchNotionPageBlocks(pageId, 'search')
  } catch (error) {
    console.warn(
      `[Search] failed to load root page ${pageId}: ${
        error?.message || 'unknown error'
      }`
    )
    return null
  }
}

/**
 * Read a Post's direct child block ids from an adapted root record map.
 *
 * @param {object|null} page
 * @param {string} postId
 * @returns {Array<string>}
 */
function getPostContentIds(page, postId) {
  const content = page?.block?.[postId]?.value?.content
  return Array.isArray(content) ? content : []
}

/**
 * Search all published posts using their metadata and Notion page content.
 * The returned post objects receive a `results` array for compatibility with
 * existing search layouts.
 *
 * @param {Array<object>} allPosts
 * @param {string} keyword
 * @param {{ locale?: string }} options
 * @returns {Promise<Array<object>>}
 */
export async function searchPosts(allPosts, keyword, options = {}) {
  const normalizedKeyword = String(keyword || '')
    .trim()
    .toLowerCase()
  if (!normalizedKeyword || !allPosts?.length) return []

  const rootPage = await getRootPageBlockMap(options.locale)
  const adaptedRootPage = rootPage ? adapterNotionBlockMap(rootPage) : null
  const matchedPosts = []
  const postBodyCache = new Map()

  for (const post of allPosts || []) {
    let page = adaptedRootPage
    let postForSearch = post
    const rootContentIds = getPostContentIds(page, post.id)

    if (rootContentIds.length) {
      postForSearch = { ...post, content: rootContentIds }
    } else {
      const cacheKey = getPageBlockCacheKey(post.id, post.lastEditedDate)
      try {
        page = postBodyCache.get(post.id)
        if (!page) {
          page = await getDataFromCache(cacheKey, true)
          if (!page) {
            // Search can run before a visitor has opened the article. Fetch the
            // page blocks on demand and let the normal block cache handle reuse.
            page = await fetchNotionPageBlocks(post.id, 'search', {
              cacheVersion: post.lastEditedDate
            })
          }
          postBodyCache.set(post.id, page || null)
        }
        page = page ? adapterNotionBlockMap(page) : null
      } catch (error) {
        page = null
        console.warn(
          `[Search] failed to read cached page for ${post?.id || 'unknown'}: ${
            error?.message || 'unknown error'
          }`
        )
      }
    }

    const { metadataText, contentText } = getSearchablePostText(
      postForSearch,
      page
    )
    const metadataHit = metadataText.toLowerCase().includes(normalizedKeyword)
    const contentHit = contentText.toLowerCase().includes(normalizedKeyword)

    if (!metadataHit && !contentHit) continue

    const snippets = []
    if (contentHit) {
      const contentSnippet = getSnippet(contentText, normalizedKeyword)
      if (contentSnippet) snippets.push(contentSnippet)
    }
    if (metadataHit) {
      const metadataSnippet = getSnippet(metadataText, normalizedKeyword)
      if (metadataSnippet && !snippets.includes(metadataSnippet)) {
        snippets.push(metadataSnippet)
      }
    }

    matchedPosts.push({
      ...post,
      results: snippets.slice(0, MAX_SNIPPETS)
    })
  }

  return matchedPosts
}
