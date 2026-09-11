'use client'

/**
 * Freetoken 自定义导航主题 - 阶段 1 最小可构建骨架
 * 技术基座：NotionNext（仅 themes/freetoken 内实现，不修改官方核心、themes/nav 或原项目）
 * 导出官方契约的 9 个 Layout 组件：
 * LayoutBase / LayoutIndex / LayoutPostList / LayoutSlug / LayoutSearch /
 * LayoutArchive / LayoutCategoryIndex / LayoutTagIndex / Layout404
 * 阶段 1 不接真实 ext 业务数据，仅使用 NotionNext 通用 post 字段做占位渲染。
 */

import { useRouter } from 'next/router'
import { useEffect } from 'react'

import NotionIcon from '@/components/NotionIcon'
import NotionPage from '@/components/NotionPage'
import SearchInput from './components/SearchInput'
import SmartLink from '@/components/SmartLink'
import { siteConfig } from '@/lib/config'
import { useGlobal } from '@/lib/global'
import { isBrowser } from '@/lib/utils'

import CONFIG from './config'
import { Style } from './style'
import LayoutBase from './components/LayoutBase'

/**
 * 首页：展示苹果风 Hero + 统计占位 + 简化列表
 */
const LayoutIndex = props => {
  const { posts } = props
  const heroTitle = siteConfig('FREETOKEN_HERO_TITLE', null, CONFIG)
  const heroSub = siteConfig('FREETOKEN_HERO_SUB', null, CONFIG)
  const eyebrow = siteConfig('FREETOKEN_HERO_EYEBROW', null, CONFIG)

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

      <section className='ft-strip mt-16 rounded-2xl'>
        <div className='ft-strip-in'>
          <div className='ft-stat'>
            <div className='n'>{posts?.length || 0}</div>
            <div className='l'>已收录模型</div>
          </div>
          <div className='ft-stat'>
            <div className='n'>0</div>
            <div className='l'>平台</div>
          </div>
          <div className='ft-stat'>
            <div className='n'>30</div>
            <div className='l'>验证周期/天</div>
          </div>
          <div className='ft-stat'>
            <div className='n'>0</div>
            <div className='l'>更新</div>
          </div>
        </div>
      </section>

      <section id='models' className='ft-section pb-24'>
        <h2>模型库</h2>
        <p className='ft-secsub'>即将与 Notion 后台同步，阶段 1 仅做占位展示。</p>
        <div className='mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
          {posts?.slice(0, 6).map(post => (
            <SmartLink
              key={post.id}
              href={post.href || '/'}
              className='ft-card p-5 block text-left'>
              <div className='flex items-center gap-3 mb-3'>
                {siteConfig('POST_TITLE_ICON') && (
                  <NotionIcon icon={post.pageIcon} />
                )}
                <h3 className='font-semibold text-lg'>{post.title}</h3>
              </div>
              <p className='text-sm text-[var(--ft-sub)] line-clamp-3'>
                {post.summary}
              </p>
            </SmartLink>
          ))}
        </div>
      </section>

      <section className='ft-section pb-24'>
        <h2>平台</h2>
        <p className='ft-secsub'>后续从 Notion 数据库中自动汇总。</p>
        <div className='mt-8 p-8 ft-card text-center text-[var(--ft-sub)]'>
          阶段 2 接入真实平台数据
        </div>
      </section>
    </div>
  )
}

/**
 * 文章列表（分类/标签/搜索结果页面）
 */
const LayoutPostList = props => {
  const { posts, category, tag } = props
  return (
    <div className='ft-section pb-24'>
      {(category || tag) && (
        <h2 className='mb-6'>
          {category && <i className='mr-2 fas fa-folder-open' />}
          {category || `#${tag}`}
        </h2>
      )}
      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
        {posts?.map(post => (
          <SmartLink
            key={post.id}
            href={post.href || '/'}
            className='ft-card p-5 block text-left'>
            <div className='flex items-center gap-3 mb-3'>
              {siteConfig('POST_TITLE_ICON') && (
                <NotionIcon icon={post.pageIcon} />
              )}
              <h3 className='font-semibold text-lg'>{post.title}</h3>
            </div>
            <p className='text-sm text-[var(--ft-sub)] line-clamp-3'>
              {post.summary}
            </p>
          </SmartLink>
        ))}
      </div>
    </div>
  )
}

/**
 * 文章详情页
 */
const LayoutSlug = props => {
  const { post, lock, validPassword } = props
  const router = useRouter()
  const waiting404 = siteConfig('POST_WAITING_TIME_FOR_404') * 1000

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
      <h1 className='text-3xl md:text-4xl font-bold tracking-tight pt-4 md:pt-12'>
        {siteConfig('POST_TITLE_ICON') && <NotionIcon icon={post.pageIcon} />}
        {post.title}
      </h1>

      <section className='px-1 mt-6'>
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
