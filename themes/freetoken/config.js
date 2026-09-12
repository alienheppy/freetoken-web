/**
 * Freetoken 主题配置（返工版：文案/链接取自原设计）
 * 不修改官方核心，仅在本主题内部生效；可用 siteConfig('KEY', null, CONFIG) 覆盖
 */
const CONFIG = {
  // 站点信息（原设计 layout.jsx / page.jsx 文案）
  FREETOKEN_LOGO_TEXT: 'FreeTokenHub',
  FREETOKEN_HERO_EYEBROW: '持续更新 · 逐条核实',
  FREETOKEN_HERO_TITLE: '免费的大模型。\n一目了然。',
  FREETOKEN_HERO_SUB: '哪些平台送、送什么模型、有什么限制 — 收录于一个页面。',
  FREETOKEN_HERO_CTA_PRIMARY: '浏览模型',
  FREETOKEN_HERO_CTA_SECONDARY: '查看平台',

  // 模型库区块文案（原设计 page.jsx）
  FREETOKEN_MODELS_TITLE: '免费模型库。',
  FREETOKEN_MODELS_SUB:
    'OpenAI 兼容接口，注册获取 Key，替换 base_url 即可调用。数据由 Notion 后台同步维护。',
  FREETOKEN_MODELS_NOTICE:
    '免费额度具有时效性，随时可能调整。每条数据均标注核实日期，请以平台官网为准。',
  FREETOKEN_SEARCH_PLACEHOLDER: '搜索模型或厂商',

  // 平台区块文案（原设计 page.jsx）
  FREETOKEN_PLATFORMS_TITLE: '免费平台一览。',
  FREETOKEN_PLATFORMS_SUB:
    '各大平台免费额度速查。标注“已核实”的数据经过当日实测，其余待逐个核实后收录。',

  // 详情页文案（原设计 model/[slug]/page.jsx）
  FREETOKEN_DETAIL_BACK: '返回模型库',
  FREETOKEN_DETAIL_FACTS_TITLE: '模型特性。',
  FREETOKEN_DETAIL_OFFERS_TITLE: '免费获取渠道。',
  FREETOKEN_DETAIL_OFFERS_SUB:
    '以下平台免费提供该模型。核实状态来自站内人工核实记录，仅代表信息已核对，不代表当前额度可用。',
  FREETOKEN_DETAIL_CURL_TITLE: '快速接入。',
  FREETOKEN_DETAIL_CURL_SUB:
    'OpenAI 兼容接口，注册平台获取 API Key 后即可调用。',
  FREETOKEN_DETAIL_ARTICLE_TITLE: '详细说明。',
  FREETOKEN_DETAIL_EMPTY_OFFERS: '暂无已收录的免费获取渠道。',
  FREETOKEN_DETAIL_MISSING: '未找到该模型。',

  // curl 示例的 base_url：原设计取渠道 api 字段，主题侧 ext 不含该字段，
  // 因此与老站兜底一致（offers[0].api 缺失时用 OpenRouter 兼容端点）
  FREETOKEN_DEFAULT_API_BASE: 'https://openrouter.ai/api/v1',

  // 详情页页脚「报告过期」入口（原设计 model/[slug]/page.jsx）
  FREETOKEN_REPORT_URL:
    'https://github.com/FreeTokenHub/FreeTokenHub/issues/new?template=expired.md&title=',

  // 全站页脚（原设计 layout.jsx）
  FREETOKEN_FOOTER_TEXT:
    'FreeTokenHub 汇总各平台免费大模型信息。免费额度随时可能调整，请以各平台官方页面为准。',

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

  // 深色模式对应（原设计无深色模式，主题扩展）
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

  // 导航回退菜单（Notion 未配置 Menu/SubMenu 时使用，取原设计三链接）
  FREETOKEN_FALLBACK_MENU: [
    { title: '模型库', href: '/#models', show: true },
    { title: '平台', href: '/#platforms', show: true },
    { title: '关于', href: '#', show: true }
  ]
}

export default CONFIG
