'use client'

import { useRouter } from 'next/router'
import { useEffect, useMemo } from 'react'

import NotionIcon from '@/components/NotionIcon'
import NotionPage from '@/components/NotionPage'
import SmartLink from '@/components/SmartLink'
import { siteConfig } from '@/lib/config'
import { useGlobal } from '@/lib/global'
import { isBrowser } from '@/lib/utils'

import CONFIG from './config'
import { Style } from './style'
import LayoutBase from './components/LayoutBase'
import ModelCard from './components/ModelCard'
import ModelFacts from './components/ModelFacts'
import PlatformGrid from './components/PlatformGrid'
import SearchInput from './components/SearchInput'
import StatsStrip from './components/StatsStrip'
import { adaptPost, adaptPosts } from './lib/adaptModel'

/**
 * 首页：Hero + 真实统计条 + 模型卡片 + 平台并集
 * posts 来自官方 SiteDataApi（首页为 Published 列表）；适配只做一次（adaptPosts 记忆化）
 */
const LayoutIndex = props => {
  const { posts } = props
  const heroTitle = siteConfig('FREETOKEN_HERO_TITLE', null, CONFIG)
  const heroSub = siteConfig('FREETOKEN_HERO_SUB', null, CONFIG)
  const eyebrow = siteConfig('FREETOKEN_HERO_EYEBROW', null, CONFIG)
  const models = useMemo(() => adaptPosts(posts), [posts])

  return (
    <div className='ft-hero'>
      <div className='eyebrow'>{eyebrow}</div>
      <h1>{heroTitle}</h1>
      <p className='sub'>{heroSub}</p>
      <div className='cta'>
        <SmartLink href='/#models' className='ft-btn ft-btn-primary'>
          浏览模型库
        </SmartLink>
        <SmartLink href='/about' className='ft-btn ft-btn-ghost'>
          了解更多
        </SmartLink>
      </div>

      <StatsStrip models={models} />

      <section id='models' className='ft-section pb-24'>
        <h2>免费模型库。</h2>
        <p className='ft-secsub'>
          OpenAI 兼容接口，注册获取 Key，替换 base_url 即可调用。数据由 Notion
          后台同步维护。
        </p>
        <div className='ft-notice'>
          免费额度具有时效性，随时可能调整。每条数据均标注核实日期与来源，请以平台官网为准。
        </div>
        <div className='mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
          {models.map(model => (
            <ModelCard key={model.id || model.href} model={model} />
          ))}
        </div>
        {models.length === 0 && (
          <div className='mt-8 p-8 ft-card text-center text-[var(--ft-sub)]'>
            暂无已发布的模型，等待 Notion 后台同步。
          </div>
        )}
      </section>

      <section id='platforms' className='ft-section pb-24'>
        <h2>免费平台一览。</h2>
        <p className='ft-secsub'>
          平台由已发布模型行的 ext.platforms 自动汇总；额度与可用性请以各平台官网为准。
        </p>
        <PlatformGrid models={models} />
      </section>
    </div>
  )
}

/**
 * 文章列表（分类/标签/搜索结果页面）：同一套真实模型卡片
 */
const LayoutPostList = props => {
  const { posts, category, tag } = props
  const models = useMemo(() => adaptPosts(posts), [posts])

  return (
    <div className='ft-section pb-24'>
      {(category || tag) && (
        <h2 className='mb-6'>
          {category && <i className='mr-2 fas fa-folder-open' />}
          {category || `#${tag}`}
        </h2>
      )}
      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
        {models.map(model => (
          <ModelCard key={model.id || model.href} model={model} />
        ))}
      </div>
      {models.length === 0 && (
        <div className='mt-8 p-8 ft-card text-center text-[var(--ft-sub)]'>
          没有符合条件的模型。
        </div>
      )}
    </div>
  )
}

/**
 * 文章详情页：Notion 正文 + Freetoken 业务信息区（平台/额度/核实日期/截止提示/来源）
 */
const LayoutSlug = props => {
  const { post, lock } = props
  const router = useRouter()
  const waiting404 = siteConfig('POST_WAITING_TIME_FOR_404') * 1000
  const model = useMemo(() => adaptPost(post), [post])

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
      <div className='ft-container pt-24 pb-24 text-center'>
        <i className='fas fa-lock text-3xl text-[var(--ft-sub)]' />
        <p className='mt-4 text-[var(--ft-sub)]'>该文章需输入密码后查看</p>
      </div>
    )
  }

  if (!post) return null

  return (
    <div className='ft-container pt-8 pb-24'>
      {model.provider && <div className='ft-eyebrow'>{model.provider}</div>}
      <h1 className='text-3xl md:text-4xl font-bold tracking-tight pt-4 md:pt-12'>
        {siteConfig('POST_TITLE_ICON') && <NotionIcon icon={post.pageIcon} />}
        {post.title}
      </h1>
      {model.desc && <p className='ft-detail-sub'>{model.desc}</p>}

      <ModelFacts model={model} />

      <section className='px-1 mt-10'>
        <div id='article-wrapper'>
          <NotionPage post={post} />
        </div>
      </section>
    </div>
  )
}

/**
 * 搜索页
 */
const LayoutSearch = props => {
  const { keyword } = props
  return (
    <div className='ft-section pb-24'>
      <h2 className='mb-6'>
        <i className='mr-2 fas fa-search' />
        {keyword || '搜索'}
      </h2>
      <div className='max-w-xl mb-10'>
        <SearchInput {...props} />
      </div>
      <LayoutPostList {...props} />
    </div>
  )
}

/**
 * 归档页
 */
const LayoutArchive = props => {
  const { archivePosts } = props
  const { locale } = useGlobal()
  return (
    <div className='ft-section pb-24'>
      <h2 className='mb-8'>
        <i className='mr-2 fas fa-archive' />
        {locale.COMMON.ARCHIVE}
      </h2>
      {archivePosts &&
        Object.keys(archivePosts).map(archiveTitle => (
          <div key={archiveTitle} className='mb-8'>
            <h3 className='text-lg font-semibold mb-3'>{archiveTitle}</h3>
            <div className='space-y-2'>
              {archivePosts[archiveTitle]?.map(post => (
                <SmartLink
                  key={post.id}
                  href={post.href || '/'}
                  className='block ft-card p-4 text-sm'>
                  {post.title}
                </SmartLink>
              ))}
            </div>
          </div>
        ))}
    </div>
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
    <div className='ft-container min-h-[60vh] flex flex-col items-center justify-center text-center'>
      <h2 className='text-6xl font-bold text-[var(--ft-sub)]'>404</h2>
      <p className='mt-4 text-[var(--ft-faint)]'>
        页面不存在，3 秒后返回首页…
      </p>
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
    <div className='ft-section pb-24'>
      <h2 className='mb-8'>
        <i className='mr-2 fas fa-th' />
        {locale.COMMON.CATEGORY}
      </h2>
      <div className='flex flex-wrap gap-3'>
        {categoryOptions?.map(category => (
          <SmartLink
            key={category.name}
            href={`/category/${category.name}`}
            className='ft-card px-5 py-2 text-sm font-medium'>
            <i className='mr-2 fas fa-folder' />
            {category.name}({category.count})
          </SmartLink>
        ))}
      </div>
    </div>
  )
}

/**
 * 标签列表
 */
const LayoutTagIndex = props => {
  const { tagOptions } = props
  const { locale } = useGlobal()
  return (
    <div className='ft-section pb-24'>
      <h2 className='mb-8'>
        <i className='mr-2 fas fa-tags' />
        {locale.COMMON.TAG}
      </h2>
      <div className='flex flex-wrap gap-3'>
        {tagOptions?.map(tag => (
          <SmartLink key={tag.name} href={`/tag/${tag.name}`} className='ft-pill'>
            #{tag.name}({tag.count})
          </SmartLink>
        ))}
      </div>
    </div>
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
