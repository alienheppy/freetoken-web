import { getPageContentText } from '@/lib/db/notion/getPageContentText'
import { adapterNotionBlockMap } from '@/lib/utils/notion.util'

describe('lib/db/notion/getPageContentText', () => {
  test('reads body text from newer nested Notion blocks as one string', () => {
    const page = adapterNotionBlockMap({
      block: {
        post_1: {
          spaceId: 'space_1',
          value: {
            role: 'reader',
            value: {
              id: 'post_1',
              type: 'page',
              content: ['body_1', 'body_2']
            }
          }
        },
        body_1: {
          spaceId: 'space_1',
          value: {
            role: 'reader',
            value: {
              id: 'body_1',
              type: 'text',
              properties: {
                title: [['这里是正文关键词']]
              }
            }
          }
        },
        body_2: {
          spaceId: 'space_1',
          value: {
            role: 'reader',
            value: {
              id: 'body_2',
              type: 'text',
              properties: {
                title: [['以及第二段内容']]
              }
            }
          }
        }
      }
    })

    const text = getPageContentText(
      { id: 'post_1', content: ['body_1', 'body_2'] },
      page
    )

    expect(typeof text).toBe('string')
    expect(text).toBe('这里是正文关键词以及第二段内容')
  })

  test('does not read a password-protected body', () => {
    const text = getPageContentText(
      {
        id: 'post_1',
        content: ['body_1'],
        password: 'secret'
      },
      {
        block: {
          body_1: {
            value: {
              id: 'body_1',
              type: 'text',
              properties: {
                title: [['不应被搜索到']]
              }
            }
          }
        }
      }
    )

    expect(text).toBe('')
  })
})
