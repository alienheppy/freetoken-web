import { render, screen, fireEvent, act } from '@testing-library/react'

/**
 * 右键菜单入口配置（Conf/right-click-menu.js）回归守卫。
 *
 * 本站只有「模型库 / 平台一览」两个区块，没有博客式分类与标签，
 * 「博客分类 / 博客标签」会指向空页面；「主题切换」会随机跳到其他官方主题；
 * 「主题切换」会随机跳到其他官方主题，这三项应保持默认关闭。
 * 「复制」是常用入口、保持默认开启，但必须走独立开关
 * CUSTOM_RIGHT_CLICK_CONTEXT_MENU_COPY，不能复用 CAN_COPY —— 后者一旦为 false
 * 会连带渲染 <DisableCopy/> 禁止全站复制。
 */

// 用真实 blog.config 值（不 mock 配置文件本身），确保断言的是实际默认值
jest.mock('@/lib/config', () => {
  const BLOG = require('../../blog.config.js')
  return {
    __esModule: true,
    siteConfig: (key, fallback) =>
      BLOG[key] !== undefined ? BLOG[key] : fallback,
  }
})

jest.mock('@/lib/global', () => ({
  useGlobal: () => ({
    isDarkMode: false,
    updateDarkMode: jest.fn(),
    locale: {
      MENU: {
        WALK_AROUND: '随便逛逛',
        CATEGORY: '博客分类',
        TAGS: '博客标签',
        COPY: '复制',
        SHARE_URL: '分享地址',
        DARK_MODE: '深色模式',
        LIGHT_MODE: '浅色模式',
        THEME_SWITCH: '主题切换'
      },
      COMMON: { PAGE_URL_COPIED: '页面地址已复制' }
    }
  })
}))

jest.mock('@/themes/theme', () => ({
  THEMES: ['freetoken', 'hexo'],
  saveDarkModeToLocalStorage: jest.fn()
}))

jest.mock('@/hooks/useWindowSize', () => ({
  __esModule: true,
  default: () => ({ width: 1280, height: 800 })
}))

import CustomContextMenu from '@/components/CustomContextMenu'

/** 打开右键菜单（组件监听 window 的 contextmenu） */
function openMenu() {
  render(<CustomContextMenu />)
  act(() => {
    fireEvent.contextMenu(window, { clientX: 20, clientY: 20 })
  })
}

describe('右键菜单：默认入口集合', () => {
  test('保留「随便逛逛 / 分享地址 / 复制 / 深色模式」，去掉分类与标签', () => {
    openMenu()
    expect(screen.getByText('随便逛逛')).toBeInTheDocument()
    expect(screen.getByText('分享地址')).toBeInTheDocument()
    expect(screen.getByText('复制')).toBeInTheDocument()
    expect(screen.getByText('深色模式')).toBeInTheDocument()
    // 本站没有博客式分类/标签，指向空页面，默认不展示
    expect(screen.queryByText('博客分类')).toBeNull()
    expect(screen.queryByText('博客标签')).toBeNull()
  })

  test('去掉「主题切换」，保留「复制」，且不因复制开关禁用全站复制', () => {
    openMenu()
    expect(screen.queryByText('主题切换')).toBeNull()
    expect(screen.getByText('复制')).toBeInTheDocument()
    // 「复制」走独立开关，不能把站点级 CAN_COPY 一起改成 false
    // （否则 ExternalPlugins 会渲染 <DisableCopy/> 禁掉全站划选复制）
    const BLOG = require('../../blog.config.js')
    expect(BLOG.CAN_COPY).not.toBe(false)
    expect(BLOG.CUSTOM_RIGHT_CLICK_CONTEXT_MENU_COPY).toBe(true)
  })

  test('无效入口默认关闭、常用入口默认开启，且均可被环境变量覆盖', () => {
    const BLOG = require('../../blog.config.js')
    expect(BLOG.CUSTOM_RIGHT_CLICK_CONTEXT_MENU_CATEGORY).toBe(false)
    expect(BLOG.CUSTOM_RIGHT_CLICK_CONTEXT_MENU_TAG).toBe(false)
    expect(BLOG.CUSTOM_RIGHT_CLICK_CONTEXT_MENU_THEME_SWITCH).toBe(false)
    expect(BLOG.CUSTOM_RIGHT_CLICK_CONTEXT_MENU_COPY).toBe(true)
    // 菜单本体与导航类入口保持开启
    expect(BLOG.CUSTOM_RIGHT_CLICK_CONTEXT_MENU).toBe(true)
    expect(BLOG.CUSTOM_RIGHT_CLICK_CONTEXT_MENU_RANDOM_POST).toBe(true)
    expect(BLOG.CUSTOM_RIGHT_CLICK_CONTEXT_MENU_DARK_MODE).toBe(true)
  })
})
