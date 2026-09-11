/**
 * Freetoken 主题配置
 * 不修改官方核心，仅在本主题内部生效
 */
const CONFIG = {
  // 站点信息
  FREETOKEN_LOGO_TEXT: 'FreeTokenHub',
  FREETOKEN_HERO_EYEBROW: '持续更新 · 逐条核实',
  FREETOKEN_HERO_TITLE: '免费的大模型。\n一目了然。',
  FREETOKEN_HERO_SUB:
    '哪些平台送、送什么模型、有什么限制 — 收录于一个页面。',

  // 视觉 token（同步自原 Freetoken globals.css）
  FREETOKEN_BG: '#ffffff',
  FREETOKEN_BG_ALT: '#f5f5f7',
  FREETOKEN_CARD: '#ffffff',
  FREETOKEN_HAIRLINE: 'rgba(0,0,0,.08)',
  FREETOKEN_TXT: '#1d1d1f',
  FREETOKEN_SUB: '#6e6e73',
  FREETOKEN_FAINT: '#86868b',
  FREETOKEN_BLUE: '#0071e3',
  FREETOKEN_GREEN: '#34c759',
  FREETOKEN_AMBER: '#b25000',
  FREETOKEN_AMBER_BG: '#fff8ec',
  FREETOKEN_RADIUS: '18px',

  // 深色模式对应
  FREETOKEN_DARK_BG: '#000000',
  FREETOKEN_DARK_BG_ALT: '#0f0f12',
  FREETOKEN_DARK_CARD: '#16161a',
  FREETOKEN_DARK_HAIRLINE: 'rgba(255,255,255,.10)',
  FREETOKEN_DARK_TXT: '#f5f5f7',
  FREETOKEN_DARK_SUB: '#a1a1a6',
  FREETOKEN_DARK_FAINT: '#8e8e93',

  // 交互开关
  FREETOKEN_MODEL_GRID_COLUMNS: 3,
  FREETOKEN_PLATFORM_GRID_COLUMNS: 3,
  FREETOKEN_EXPIRY_DAYS: 30,

  // 回退菜单（当 Notion 未配置 Menu/SubMenu 时使用）
  FREETOKEN_FALLBACK_MENU: [
    { title: '模型库', href: '/#models', show: true, icon: 'fas fa-cube' },
    { title: '平台', href: '/#platforms', show: true, icon: 'fas fa-layer-group' },
    { title: '关于', href: '/about', show: true, icon: 'fas fa-info-circle' }
  ]
}

export default CONFIG
