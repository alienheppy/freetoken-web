'use client'

import { useRouter } from 'next/router'
import { useEffect, useMemo } from 'react'

import NotionPage from '@/components/NotionPage'
import SmartLink from '@/components/SmartLink'
import { siteConfig } from '@/lib/config'
import { useGlobal } from '@/lib/global'
import { isBrowser } from '@/lib/utils'

import CONFIG from './config'
import Hero from './components/Hero'
import LayoutBase from './components/LayoutBase'
import ModelCard from './components/ModelCard'
import ModelCurl from './components/ModelCurl'
import ModelDetailFacts from './components/ModelDetailFacts'
import ModelDetailHero from './components/ModelDetailHero'
import ModelOffers from './components/ModelOffers'
import ModelToolbar from './components/ModelToolbar'
import PlatformGrid from './components/PlatformGrid'
import SearchInput from './components/SearchInput'
import StatsStrip from './components/StatsStrip'
import { adaptPost, adaptPosts, isStale } from './lib/adaptModel'
import { useClientToday } from './lib/useClientToday'

/**
 * 首页：原设计 page.jsx 结构（hero → strip → models → platforms）
 * 数据：官方 SiteDataApi 注入的 posts（已发布），业务字段来自 ext（adaptPosts 只适配一次）
 */
const LayoutIndex = props => {
  const { posts } = props
  const models = useMemo(() => adaptPosts(posts), [posts])
  const today = useClientToday()

  return (
    <>
      <Hero />
      <StatsStrip models={models} />

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
        <PlatformGrid models={models} />
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
 *       → 快速接入（curl + 拷贝）→ Notion 正文 → 页脚报告入口
 */
const LayoutSlug = props => {
  const { post, lock } = props
  const router = useRouter()
  const waiting404 = siteConfig('POST_WAITING_TIME_FOR_404') * 1000
  const model = useMemo(() => adaptPost(post), [post])
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
      <div className='hero'>
        <div className='missing'>该文章需输入密码后查看</div>
      </div>
    )
  }

  if (!post) return null

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
          <ModelOffers model={model} />
        </section>
      </div>

      <section>
        <h2>{siteConfig('FREETOKEN_DETAIL_CURL_TITLE', null, CONFIG)}</h2>
        <div className='secsub'>
          {siteConfig('FREETOKEN_DETAIL_CURL_SUB', null, CONFIG)}
        </div>
        <ModelCurl model={model} />
      </section>

      {post.blockMap && (
        <section data-testid='ft-article'>
          <h2>{siteConfig('FREETOKEN_DETAIL_ARTICLE_TITLE', null, CONFIG)}</h2>
          <div id='article-wrapper'>
            <NotionPage post={post} />
          </div>
        </section>
      )}

      <footer className='pagefoot'>
        <div className='footin'>
          <div>
            信息有误或额度已变化？
            <SmartLink href={reportHref}>报告过期</SmartLink> · 核实日期{' '}
            {model.verifiedAt || '待核实'}
            {stale ? '（信息可能过期，请以官网为准）' : ''}
          </div>
        </div>
      </footer>
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
  LayoutPostList,
  LayoutSearch,
  LayoutSlug,
  LayoutTagIndex,
  CONFIG as THEME_CONFIG
}
