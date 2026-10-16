'use client'

import { useRouter } from 'next/router'
import { useEffect, useMemo } from 'react'

import NotionPage from '@/components/NotionPage'
import SmartLink from '@/components/SmartLink'
import { siteConfig } from '@/lib/config'
import { useGlobal } from '@/lib/global'
import { isBrowser } from '@/lib/utils'

import CONFIG from './config'
import ArticleLock from './components/ArticleLock'
import {
  applyPlatformProfiles,
  collectOfferRows,
  hasRenderableBody,
  stripEmbeddedTables
} from './lib/offerBlocks'
import Hero from './components/Hero'
import LayoutBase from './components/LayoutBase'
import ModelCard from './components/ModelCard'
import ModelDetailFacts from './components/ModelDetailFacts'
import ModelDetailHero from './components/ModelDetailHero'
import ModelOffers from './components/ModelOffers'
import ModelToolbar from './components/ModelToolbar'
import PlatformDetail from './components/PlatformDetail'
import PlatformGrid from './components/PlatformGrid'
import SearchInput from './components/SearchInput'
import StatsStrip from './components/StatsStrip'
import { adaptPost, adaptPosts, isStale } from './lib/adaptModel'
import { useClientToday } from './lib/useClientToday'

/**
 * 是否为「普通单页」（非模型条目）。
 * 判定口径与数据来源一致：主库 type=Post 是模型条目（唯一会渲染
 * 「模型特性 / 免费获取渠道」的类型），type=Page 是官方定义的普通单页
 * （关于、友链、作品集…），只有标题、摘要与 Notion 正文。
 * 仅在显式 type=Page 时切换骨架：类型缺失/异常仍走模型骨架，
 * 避免对历史数据造成行为变化。
 */
function isPlainPage(post) {
  return Boolean(post) && post.type === 'Page'
}

/**
 * 首页：原设计 page.jsx 结构（hero → strip → models → platforms）
 * 数据：官方 SiteDataApi 注入的 posts（已发布），业务字段来自 ext（adaptPosts 只适配一次）
 */
const LayoutIndex = props => {
  // freetokenStats：服务端全量口径聚合（模型总数 / 最大上下文 / 每平台模型数）。
  // 首页 posts 会被 POSTS_PER_PAGE 截断，统计与平台卡片必须读这份全量值。
  const { posts, platformProfiles, freetokenStats } = props
  const models = useMemo(() => adaptPosts(posts), [posts])
  const today = useClientToday()

  return (
    <>
      <Hero />
      <StatsStrip
        models={models}
        platformProfiles={platformProfiles}
        stats={freetokenStats}
      />

      <section id='models'>
        <div className='sechead'>
          <h2>{siteConfig('FREETOKEN_MODELS_TITLE', null, CONFIG)}</h2>
          <div className='secsub'>
            {siteConfig('FREETOKEN_MODELS_SUB', null, CONFIG)}
          </div>
          <div className='notice'>
            {siteConfig('FREETOKEN_MODELS_NOTICE', null, CONFIG)}
          </div>
        </div>
        <ModelToolbar models={models} today={today} />
      </section>

      <section id='platforms'>
        <div className='sechead'>
          <h2>{siteConfig('FREETOKEN_PLATFORMS_TITLE', null, CONFIG)}</h2>
          <div className='secsub'>
            {siteConfig('FREETOKEN_PLATFORMS_SUB', null, CONFIG)}
          </div>
        </div>
        <PlatformGrid
          models={models}
          platformProfiles={platformProfiles}
          stats={freetokenStats}
        />
      </section>
    </>
  )
}

/**
 * 列表页（分类 / 标签 / 搜索结果复用）：原设计卡片网格
 */
const LayoutPostList = props => {
  const { posts, category, tag } = props
  const models = useMemo(() => adaptPosts(posts), [posts])
  const today = useClientToday()
  const heading =
    category || (tag ? `#${tag}` : siteConfig('FREETOKEN_MODELS_TITLE', null, CONFIG))

  return (
    <section>
      <div className='sechead'>
        <h2>{heading}</h2>
      </div>
      <div className='grid' data-testid='ft-model-grid'>
        {models.map(model => (
          <ModelCard key={model.id || model.href} model={model} today={today} />
        ))}
        {models.length === 0 && <div className='empty'>没有符合条件的模型。</div>}
      </div>
    </section>
  )
}

/**
 * 详情页：原设计 model/[slug]/page.jsx 逐块移植
 * 顺序：hero（返回/eyebrow/h1/herosub/heropills）→ 模型特性 → 免费获取渠道
 *       （列表下方紧跟「报告过期 / 核实日期」补充行）→ Notion 正文
 *
 * 例外：Notion 里 type 不是 Post 的行（type=Page 的普通单页，例如「关于」「友链」）
 * 没有模型属性，走下面的单页骨架，不渲染「模型特性 / 免费获取渠道 / 核实日期」。
 */
const LayoutSlug = props => {
  const { post, lock, validPassword, offerRowsOverride, platformProfiles } = props
  const router = useRouter()
  const waiting404 = siteConfig('POST_WAITING_TIME_FOR_404') * 1000
  const model = useMemo(() => adaptPost(post), [post])
  const offerRowsFromPage = useMemo(
    () => {
      const rows = Array.isArray(offerRowsOverride)
        ? offerRowsOverride
        : collectOfferRows(post?.blockMap)
      // 方案A：渠道行只写平台名，平台级字段由「平台档案」按平台名回填（行级值优先）
      return applyPlatformProfiles(rows, platformProfiles)
    },
    [post?.blockMap, offerRowsOverride, platformProfiles]
  )
  // 「详细说明」只渲染模型级叙述：剔除内嵌明细表（其内容已由「免费获取渠道」渠道卡承载，避免重复）
  const articlePost = useMemo(
    () =>
      post?.blockMap
        ? { ...post, blockMap: stripEmbeddedTables(post.blockMap) }
        : post,
    [post]
  )
  // 正文若只剩内嵌表（无模型级叙述），不显示只有标题的空板块
  const showArticle = useMemo(
    () => Boolean(post?.blockMap) && hasRenderableBody(articlePost?.blockMap),
    [post?.blockMap, articlePost]
  )
  const today = useClientToday()
  const stale = isStale(model, today)

  useEffect(() => {
    if (!post) {
      setTimeout(() => {
        if (isBrowser) {
          const article = document.querySelector(
            '#article-wrapper #notion-article'
          )
          if (!article) {
            router.push('/404').then(() => {
              console.warn('找不到页面', router.asPath)
            })
          }
        }
      }, waiting404)
    }
  }, [post])

  if (lock) {
    return (
      <div className='detail'>
        <div className='lockwrap'>
          <ArticleLock validPassword={validPassword} />
        </div>
      </div>
    )
  }

  if (!post) return null

  // 普通单页（关于 / 友链等）：只有标题、摘要与 Notion 正文
  if (isPlainPage(post)) {
    return (
      <div className='detail'>
        <div className='hero' data-testid='ft-page-hero'>
          <SmartLink href='/' className='back'>
            <span className='chev'>‹</span>
            {siteConfig('FREETOKEN_PAGE_BACK', null, CONFIG)}
          </SmartLink>
          <h1>{post.title}</h1>
          {post.summary && <div className='herosub'>{post.summary}</div>}
        </div>

        <section data-testid='ft-article'>
          <div id='article-wrapper'>
            <NotionPage post={post} />
          </div>
        </section>
      </div>
    )
  }

  const reportHref = `${siteConfig('FREETOKEN_REPORT_URL', null, CONFIG)}${encodeURIComponent(
    `过期报告：${model.name}`
  )}`

  return (
    <div className='detail'>
      <ModelDetailHero model={model} today={today} />

      <section>
        <h2>{siteConfig('FREETOKEN_DETAIL_FACTS_TITLE', null, CONFIG)}</h2>
        <ModelDetailFacts model={model} />
      </section>

      <div className='band'>
        <section>
          <h2>{siteConfig('FREETOKEN_DETAIL_OFFERS_TITLE', null, CONFIG)}</h2>
          <div className='secsub'>
            {siteConfig('FREETOKEN_DETAIL_OFFERS_SUB', null, CONFIG)}
          </div>
          <ModelOffers model={model} rows={offerRowsFromPage} />

          {/* 「报告过期 / 核实日期」紧贴渠道列表：这是对渠道数据的补充说明，
              放在列表正下方才读得连贯；不再单独占一条灰色页脚带 */}
          <div className='reportline'>
            信息有误或额度已变化？
            <SmartLink href={reportHref}>报告过期</SmartLink> · 核实日期{' '}
            {model.verifiedAt || '待核实'}
            {stale ? '（信息可能过期，请以官网为准）' : ''}
          </div>
        </section>
      </div>

      {/* 「快速接入」curl 已下移为每个渠道卡内的 base_url + 示例（各提供商 base_url 不同） */}

      {showArticle && (
        <section data-testid='ft-article'>
          <h2>{siteConfig('FREETOKEN_DETAIL_ARTICLE_TITLE', null, CONFIG)}</h2>
          <div id='article-wrapper'>
            <NotionPage post={articlePost} />
          </div>
        </section>
      )}
    </div>
  )
}

/**
 * 搜索页
 */
const LayoutSearch = props => {
  const { keyword } = props
  const today = useClientToday()
  const models = useMemo(() => adaptPosts(props.posts), [props.posts])

  return (
    <section>
      <div className='sechead'>
        <h2>{keyword || '搜索'}</h2>
        <div className='secsub'>站内搜索：模型名 / 厂商 / 模型 ID</div>
      </div>
      <SearchInput {...props} />
      <div className='grid' data-testid='ft-model-grid'>
        {models.map(model => (
          <ModelCard key={model.id || model.href} model={model} today={today} />
        ))}
        {models.length === 0 && <div className='empty'>没有符合条件的模型。</div>}
      </div>
    </section>
  )
}

/**
 * 平台详情页（/platform/[platform]）：某提供商的免费模型列表
 * 平台档案与模型列表均由 pages/platform/[platform] 注入。
 */
const LayoutPlatform = props => {
  const { platform, posts } = props
  if (!platform) return null
  return <PlatformDetail platform={platform} posts={posts} />
}

/**
 * 归档页（原设计无对应页，沿用原设计卡片样式）
 */
const LayoutArchive = props => {
  const { archivePosts } = props
  const { locale } = useGlobal()

  return (
    <section>
      <div className='sechead'>
        <h2>{locale.COMMON.ARCHIVE}</h2>
      </div>
      {archivePosts &&
        Object.keys(archivePosts).map(archiveTitle => (
          <div key={archiveTitle}>
            <div className='sechead'>
              <h2>{archiveTitle}</h2>
            </div>
            <div className='grid'>
              {archivePosts[archiveTitle]?.map(post => (
                <SmartLink
                  key={post.id}
                  href={post.href || '/'}
                  className='mcard'>
                  <div>
                    <div className='mname'>{post.title}</div>
                  </div>
                </SmartLink>
              ))}
            </div>
          </div>
        ))}
    </section>
  )
}

/**
 * 404
 */
const Layout404 = () => {
  const router = useRouter()
  useEffect(() => {
    setTimeout(() => {
      if (isBrowser) {
        router.push('/')
      }
    }, 3000)
  }, [])

  return (
    <div className='hero'>
      <h1>404</h1>
      <div className='sub'>页面不存在，3 秒后返回首页…</div>
    </div>
  )
}

/**
 * 分类列表
 */
const LayoutCategoryIndex = props => {
  const { categoryOptions } = props
  const { locale } = useGlobal()
  return (
    <section>
      <div className='sechead'>
        <h2>{locale.COMMON.CATEGORY}</h2>
      </div>
      <div className='toolbar'>
        {categoryOptions?.map(category => (
          <SmartLink
            key={category.name}
            href={`/category/${category.name}`}
            className='chip'>
            {category.name}({category.count})
          </SmartLink>
        ))}
      </div>
    </section>
  )
}

/**
 * 标签列表
 */
const LayoutTagIndex = props => {
  const { tagOptions } = props
  const { locale } = useGlobal()
  return (
    <section>
      <div className='sechead'>
        <h2>{locale.COMMON.TAG}</h2>
      </div>
      <div className='toolbar'>
        {tagOptions?.map(tag => (
          <SmartLink key={tag.name} href={`/tag/${tag.name}`} className='chip'>
            #{tag.name}({tag.count})
          </SmartLink>
        ))}
      </div>
    </section>
  )
}

export {
  Layout404,
  LayoutArchive,
  LayoutBase,
  LayoutCategoryIndex,
  LayoutIndex,
  LayoutPlatform,
  LayoutPostList,
  LayoutSearch,
  LayoutSlug,
  LayoutTagIndex,
  CONFIG as THEME_CONFIG
}
