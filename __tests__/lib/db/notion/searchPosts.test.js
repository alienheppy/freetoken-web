import {
  getSearchablePostText,
  resolveSearchRootPageId,
  searchPosts
} from '@/lib/db/notion/searchPosts'

jest.mock('@/blog.config', () => ({
  __esModule: true,
  default: {
    NOTION_PAGE_ID: 'root-zh,en:root-en'
  }
}))

const mocks = {
  getDataFromCache: jest.fn(),
  getPageContentText: jest.fn(),
  getPageBlockCacheKey: jest.fn(),
  fetchNotionPageBlocks: jest.fn()
}

jest.mock('@/lib/cache/cache_manager', () => ({
  getDataFromCache: (...args) => mocks.getDataFromCache(...args)
}))

jest.mock('@/lib/db/notion/getPageContentText', () => ({
  getPageContentText: (...args) => mocks.getPageContentText(...args)
}))

jest.mock('@/lib/db/notion/getPostBlocks', () => ({
  getPageBlockCacheKey: (...args) => mocks.getPageBlockCacheKey(...args),
  fetchNotionPageBlocks: (...args) => mocks.fetchNotionPageBlocks(...args)
}))

jest.mock('@/lib/utils/notion.util', () => ({
  adapterNotionBlockMap: page => page
}))

describe('lib/db/notion/searchPosts', () => {
  beforeEach(() => {
    mocks.getDataFromCache.mockReset()
    mocks.getPageContentText.mockReset()
    mocks.getPageBlockCacheKey.mockReset()
    mocks.fetchNotionPageBlocks.mockReset()
    mocks.getPageBlockCacheKey.mockImplementation(
      (id, date) => `page_block_${id}_${date}`
    )
    mocks.getDataFromCache.mockResolvedValue({ block: {} })
    mocks.fetchNotionPageBlocks.mockResolvedValue({ block: {} })
  })

  test('uses Post body blocks from the root page cache', async () => {
    const posts = [
      {
        id: 'post-1',
        title: 'DeepSeek V4.1 Flash',
        summary: '高性价比推理模型',
        tags: ['Free'],
        category: ['Model'],
        lastEditedDate: '2026-10-17'
      },
      {
        id: 'post-2',
        title: 'Gemini Flash',
        summary: '快速响应',
        tags: [],
        category: [],
        lastEditedDate: '2026-10-17'
      },
      {
        id: 'post-3',
        title: 'Other model',
        summary: 'unrelated',
        tags: [],
        category: [],
        lastEditedDate: '2026-10-17'
      }
    ]

    mocks.fetchNotionPageBlocks.mockResolvedValue({
      block: {
        'post-2': {
          value: {
            id: 'post-2',
            type: 'page',
            content: ['post-2-body']
          }
        }
      }
    })
    mocks.getPageContentText.mockImplementation(post => {
      return post.content?.includes('post-2-body')
        ? '支持 Tool Calling 和长上下文'
        : ''
    })

    const results = await searchPosts(posts, ' tool calling ', {
      locale: 'zh-CN'
    })

    expect(results).toHaveLength(1)
    expect(results[0].id).toBe('post-2')
    expect(results[0].results[0]).toContain('Tool Calling')
    expect(mocks.getPageContentText).toHaveBeenCalledTimes(3)
    expect(mocks.getPageContentText.mock.calls[1][0]).toMatchObject({
      id: 'post-2',
      content: ['post-2-body']
    })
    expect(mocks.fetchNotionPageBlocks).toHaveBeenCalledWith(
      'root-zh',
      'search'
    )
  })

  test('loads the root body cache once for all matching Posts', async () => {
    const posts = [
      {
        id: 'post-1',
        title: 'First',
        summary: '',
        tags: [],
        category: []
      },
      {
        id: 'post-2',
        title: 'Second',
        summary: '',
        tags: [],
        category: []
      }
    ]

    mocks.fetchNotionPageBlocks.mockResolvedValue({
      block: {
        'post-1': {
          value: { id: 'post-1', type: 'page', content: ['body-1'] }
        },
        'post-2': {
          value: { id: 'post-2', type: 'page', content: ['body-2'] }
        }
      }
    })
    mocks.getPageContentText.mockReturnValue('共享正文')

    const results = await searchPosts(posts, '共享正文', { locale: 'zh-CN' })

    expect(results).toHaveLength(2)
    expect(mocks.fetchNotionPageBlocks).toHaveBeenCalledTimes(1)
    expect(mocks.getDataFromCache).not.toHaveBeenCalled()
  })

  test('metadata search works without a cached body', async () => {
    mocks.fetchNotionPageBlocks.mockResolvedValue(null)
    mocks.getDataFromCache.mockResolvedValue(null)

    const results = await searchPosts(
      [
        {
          id: 'post-1',
          title: 'KiraAI',
          summary: '免费模型',
          tags: ['免费'],
          category: []
        }
      ],
      'kiraai',
      { locale: 'zh-CN' }
    )

    expect(results).toHaveLength(1)
    expect(results[0].results[0]).toContain('KiraAI')
  })

  test('fetches the page body when it is not cached yet', async () => {
    mocks.fetchNotionPageBlocks.mockImplementation(id => {
      if (id === 'root-zh') return Promise.resolve({ block: {} })
      return Promise.resolve({ block: {} })
    })
    mocks.getDataFromCache.mockResolvedValue(null)
    mocks.getPageContentText.mockReturnValue('正文里的独占关键词')

    const results = await searchPosts(
      [
        {
          id: 'post-1',
          title: 'Untitled',
          summary: '摘要',
          tags: [],
          category: [],
          lastEditedDate: '2026-10-17'
        }
      ],
      '独占关键词',
      { locale: 'zh-CN' }
    )

    expect(results).toHaveLength(1)
    expect(mocks.fetchNotionPageBlocks).toHaveBeenCalledWith(
      'post-1',
      'search',
      { cacheVersion: '2026-10-17' }
    )
    expect(mocks.fetchNotionPageBlocks).toHaveBeenCalledWith(
      'root-zh',
      'search'
    )
  })

  test('resolves localized root page ids', () => {
    expect(resolveSearchRootPageId('zh-CN')).toBe('root-zh')
    expect(resolveSearchRootPageId('en-US')).toBe('root-en')
    expect(resolveSearchRootPageId()).toBe('root-zh')
  })

  test('empty keywords and password-protected bodies do not expose content', async () => {
    const passwordPost = {
      id: 'protected',
      title: 'Protected',
      summary: 'private',
      password: 'secret',
      tags: [],
      category: []
    }
    const page = { block: {} }

    expect(await searchPosts([passwordPost], '   ')).toEqual([])
    expect(mocks.fetchNotionPageBlocks).not.toHaveBeenCalled()
    expect(getSearchablePostText(passwordPost, page)).toEqual({
      metadataText: 'Protected private',
      contentText: ''
    })
    expect(mocks.getPageContentText).not.toHaveBeenCalled()
  })
})
