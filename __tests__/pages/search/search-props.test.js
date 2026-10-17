const mockFetchGlobalAllData = jest.fn()
const mockSearchPosts = jest.fn()

jest.mock('@/lib/db/SiteDataApi', () => ({
  fetchGlobalAllData: (...args) => mockFetchGlobalAllData(...args)
}))

jest.mock('@/lib/db/notion/searchPosts', () => ({
  searchPosts: (...args) => mockSearchPosts(...args)
}))

jest.mock('@/themes/theme', () => ({
  DynamicLayout: () => null
}))

jest.mock('@/lib/config', () => ({
  siteConfig: (key, fallback) => fallback
}))

import { getStaticProps as getKeywordSearchProps } from '@/pages/search/[keyword]'
import { getStaticProps as getSearchProps } from '@/pages/search'

const makeProps = () => ({
  allPages: [
    { id: 'post-1', type: 'Post', status: 'Published', title: 'Published' },
    { id: 'post-2', type: 'Post', status: 'Draft', title: 'Draft' },
    {
      id: 'platform-1',
      type: 'Platform',
      status: 'Published',
      title: 'Platform'
    }
  ],
  NOTION_CONFIG: {}
})

beforeEach(() => {
  mockFetchGlobalAllData.mockImplementation(async () => makeProps())
  mockSearchPosts.mockResolvedValue([
    { id: 'post-1', type: 'Post', status: 'Published', title: 'Published' }
  ])
})

describe('搜索页 props 下发', () => {
  test('/search 删除 allPages，只下发筛选后的 posts', async () => {
    const result = await getSearchProps({ locale: 'zh-CN' })

    expect(result.props).not.toHaveProperty('allPages')
    expect(result.props.posts).toEqual([
      expect.objectContaining({ id: 'post-1', type: 'Post' })
    ])
  })

  test('/search/[keyword] 删除 allPages，并保留搜索与分页结果', async () => {
    const result = await getKeywordSearchProps({
      params: { keyword: 'GPT' },
      locale: 'zh-CN'
    })

    expect(result.props).not.toHaveProperty('allPages')
    expect(result.props.keyword).toBe('GPT')
    expect(result.props.postCount).toBe(1)
    expect(result.props.posts).toEqual([
      expect.objectContaining({ id: 'post-1', type: 'Post' })
    ])
  })
})
