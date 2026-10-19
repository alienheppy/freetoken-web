import BLOG from '@/blog.config'
import { siteConfig } from '@/lib/config'
import {
  cleanPostSummaries,
  fetchGlobalAllData
} from '@/lib/db/SiteDataApi'
import { normalizePlatformProfiles } from '@/lib/freetoken/offerBlocks'
import { DynamicLayout } from '@/themes/theme'

/**
 * 平台详情页：/platform/[platform]
 *
 * 展示某个提供商（Notion type=Platform 行）的免费模型列表。
 * 平台档案（网址 / baseUrl / 简介 / 免费额度 / 接入说明 / 上下文 / 平台认证）
 * 来自 `platformProfiles`；模型列表由已发布模型行的 ext.platforms 命中该平台名派生。
 * 平台名以 URL 段承载（可能含中文/空格，必要时解码）。
 */
const Platform = props => {
  const theme = siteConfig('THEME', BLOG.THEME, props.NOTION_CONFIG)
  return (
    <DynamicLayout theme={theme} layoutName='LayoutPlatform' {...props} />
  )
}

/** URL 段 → 平台名（已是明文时原样返回，避免对无 % 的字符串抛错） */
function decodeParam(value) {
  if (typeof value !== 'string') return ''
  try {
    return decodeURIComponent(value).trim()
  } catch (e) {
    return value.trim()
  }
}

/** 平台名归一（与主题侧 join 一致：去空白 + 小写） */
function normalizeName(name) {
  return typeof name === 'string' ? name.trim().toLowerCase() : ''
}

export async function getStaticProps({ params: { platform }, locale }) {
  const from = 'platform-props'
  const props = await fetchGlobalAllData({ from, locale })
  const target = normalizeName(decodeParam(platform))

  // 复用共享归一化：与主题侧同口径（上下文按 K 语义 ×1024、认证标签归一）。
  const profiles = normalizePlatformProfiles(props.platformProfiles)
  const profile =
    profiles.find(p => normalizeName(p.name) === target) || null

  // 未收录的平台档案：404（避免渲染空壳）
  if (!profile) {
    return { props: { platform: null }, revalidate: 60, notFound: true }
  }

  const platformName = profile.name

  const posts = (props.allPages || [])
    .filter(page => page && page.type === 'Post' && page.status === 'Published')
    .filter(page => {
      const platforms = page?.ext?.platforms
      const list = Array.isArray(platforms)
        ? platforms
        : typeof platforms === 'string'
          ? platforms.split(/[,，、]/)
          : []
      return list.some(
        name =>
          typeof name === 'string' &&
          normalizeName(name) === normalizeName(platformName)
      )
    })

  props.platform = {
    name: platformName,
    url: profile.url,
    baseUrl: profile.baseUrl,
    desc: profile.desc,
    intro: profile.intro,
    quota: profile.quota,
    guide: profile.guide,
    context: profile.context,
    certifications: profile.certifications,
    // 平台详情页反馈行的「核实日期」；Notion 未填时为空串，主题侧显示「待核实」
    verifiedAt: profile.verifiedAt || ''
  }
  props.posts = cleanPostSummaries(posts)
  delete props.allPages

  return {
    props,
    revalidate: process.env.EXPORT
      ? undefined
      : siteConfig(
          'NEXT_REVALIDATE_SECOND',
          BLOG.NEXT_REVALIDATE_SECOND,
          props.NOTION_CONFIG
        )
  }
}

export async function getStaticPaths() {
  const data = await fetchGlobalAllData({ from: 'platform-static-path' })
  const paths = (data.platformProfiles || [])
    .map(p => String(p?.name || p?.title || '').trim())
    .filter(Boolean)
    .map(name => ({ params: { platform: name } }))

  // 新平台上线后无需重新构建即可访问
  return { paths, fallback: 'blocking' }
}

export default Platform
