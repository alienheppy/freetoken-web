/* eslint-disable react/no-unknown-property */
import CONFIG from './config'
import { themeConsoleStyle } from '@/lib/themeConsoleStyle'

/**
 * Freetoken 主题样式（返工版：原设计 1:1 移植）
 *
 * 来源：原项目 `app/app/globals.css`（只读参考，逐条搬运），
 * 差别仅两处，均为“限定作用域”所必需：
 *   1. 原 CSS 变量块（作用在 :root 上的那一段）整体挂到主题根节点 `#theme-freetoken`（不再占用全局根变量）；
 *      原 `*` / `html` / `body` / `a` / `button` / `h1` / `h2` / `section` / `footer` / `nav`
 *      等全局元素选择器统一加 `#theme-freetoken` 前缀；
 *   2. Notion 正文区（`#article-wrapper` 子树）用 `:where(X:not(#article-wrapper X))` 排除，
 *      确保官方 `NotionPage` 内容样式不被主题的元素级规则覆盖；
 *      `:where()` 参数特异性恒为 0；若不用 :where，排除选择器里的 `#article-wrapper`
 *      会把特异性抬到 2 个 id，压过主题全部类规则（margin:0 auto / padding 等失效）。
 *
 * 另外几处“扩展”（原设计没有、主题场景必需，已在下方注释标明）：
 *   - `.dark #theme-freetoken`：深色模式变量（原设计无深色模式）；
 *   - `.navdd/.navbtn/.navmenu`：Notion customMenu 二级菜单，视觉复用原设计排序下拉；
 *   - `.notification`：官方解锁成功通知条（渲染在主题根容器外）收敛为居中小胶囊，
 *     视觉对齐主题药丸（浅底 + hairline 细边框 + 深色文字）。
 */
const Style = () => (
  <style jsx global>{`
    /* ===== 原 :root —— 变量改挂主题根节点 ===== */
    #theme-freetoken {
      --bg: ${CONFIG.FREETOKEN_BG};
      --bg-alt: ${CONFIG.FREETOKEN_BG_ALT};
      --card: ${CONFIG.FREETOKEN_CARD};
      --hairline: ${CONFIG.FREETOKEN_HAIRLINE};
      --txt: ${CONFIG.FREETOKEN_TXT};
      --sub: ${CONFIG.FREETOKEN_SUB};
      --faint: ${CONFIG.FREETOKEN_FAINT};
      --blue: ${CONFIG.FREETOKEN_BLUE};
      --green: ${CONFIG.FREETOKEN_GREEN};
      --amber: ${CONFIG.FREETOKEN_AMBER};
      --amber-bg: ${CONFIG.FREETOKEN_AMBER_BG};
      --radius: ${CONFIG.FREETOKEN_RADIUS};
    }

    /* 扩展：深色模式变量（原设计无深色模式，保持主题可用） */
    .dark #theme-freetoken {
      --bg: ${CONFIG.FREETOKEN_DARK_BG};
      --bg-alt: ${CONFIG.FREETOKEN_DARK_BG_ALT};
      --card: ${CONFIG.FREETOKEN_DARK_CARD};
      --hairline: ${CONFIG.FREETOKEN_DARK_HAIRLINE};
      --txt: ${CONFIG.FREETOKEN_DARK_TXT};
      --sub: ${CONFIG.FREETOKEN_DARK_SUB};
      --faint: ${CONFIG.FREETOKEN_DARK_FAINT};
    }

    /* 原 *{margin:0;padding:0;box-sizing:border-box} —— 限定主题内、排除正文区 */
    #theme-freetoken :where(*:not(#article-wrapper *)) {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    /* 原 body{...} —— 挂到主题根节点 */
    #theme-freetoken {
      background: var(--bg);
      color: var(--txt);
      font-family:
        -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text",
        "Helvetica Neue", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei",
        sans-serif;
      line-height: 1.58;
      -webkit-font-smoothing: antialiased;
      min-height: 100vh;
    }

    #theme-freetoken :where(a:not(#article-wrapper a)) {
      color: inherit;
      text-decoration: none;
    }

    #theme-freetoken :where(button:not(#article-wrapper button)) {
      font-family: inherit;
    }

    /* nav */
    /* 顶上导航：仅命中真正的顶栏 nav；翻页控件同为 <nav>，需排除，
       否则会被同一条规则带上吸顶与底部分隔线（模型库分页下方那条横线即由此而来）。 */
    #theme-freetoken :where(nav:not(#article-wrapper nav):not(.pager)) {
      position: sticky;
      top: 0;
      z-index: 100;
      backdrop-filter: saturate(180%) blur(20px);
      -webkit-backdrop-filter: saturate(180%) blur(20px);
      background: rgba(255, 255, 255, 0.72);
      border-bottom: 1px solid var(--hairline);
    }

    .dark #theme-freetoken :where(nav:not(#article-wrapper nav):not(.pager)) {
      background: rgba(0, 0, 0, 0.62);
    }

    #theme-freetoken .navin {
      max-width: 980px;
      margin: 0 auto;
      padding: 0 22px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
    }

    #theme-freetoken .logo {
      font-weight: 600;
      font-size: 17px;
      letter-spacing: -0.02em;
    }

    #theme-freetoken .navlinks {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 28px;
      font-size: 12px;
      color: var(--sub);
      white-space: nowrap;
    }

    #theme-freetoken .navlinks a {
      transition: color 0.2s;
    }

    #theme-freetoken .navlinks a:hover {
      color: var(--txt);
    }

    #theme-freetoken .navtoggle {
      display: none;
    }

    /* 扩展：customMenu 二级项下拉（视觉同 .sortdd/.sortmenu） */
    #theme-freetoken .navdd {
      position: relative;
    }

    #theme-freetoken .navbtn {
      display: inline-flex;
      align-items: center;
      gap: 5px;
    }

    #theme-freetoken .navsubtoggle {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      border: 0;
      font: inherit;
      color: inherit;
      background: transparent;
      cursor: pointer;
    }

    #theme-freetoken .navmenu {
      position: absolute;
      top: calc(100% + 12px);
      right: 0;
      min-width: 150px;
      background: var(--bg);
      border: 1px solid var(--hairline);
      border-radius: 14px;
      padding: 6px;
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.12);
      opacity: 0;
      visibility: hidden;
      transform: translateY(-4px);
      transition: 0.18s ease;
      z-index: 50;
    }

    #theme-freetoken .navdd:hover .navmenu,
    #theme-freetoken .navdd:focus-within .navmenu {
      opacity: 1;
      visibility: visible;
      transform: translateY(0);
    }

    #theme-freetoken .navmenu a {
      display: block;
      padding: 8px 14px;
      border-radius: 9px;
      white-space: nowrap;
    }

    #theme-freetoken .navmenu a:hover {
      background: var(--bg-alt);
      color: var(--txt);
    }

    /* hero (home) */
    #theme-freetoken .hero {
      max-width: 980px;
      margin: 0 auto;
      padding: 120px 22px 70px;
      text-align: center;
    }

    #theme-freetoken .eyebrow {
      font-size: 17px;
      font-weight: 600;
      color: var(--blue);
      letter-spacing: -0.01em;
      margin-bottom: 10px;
    }

    #theme-freetoken :where(h1:not(#article-wrapper h1)) {
      font-size: 72px;
      font-weight: 700;
      letter-spacing: -0.028em;
      line-height: 1.06;
    }

    #theme-freetoken .hero .sub {
      font-size: 24px;
      font-weight: 400;
      color: var(--sub);
      letter-spacing: -0.01em;
      margin-top: 14px;
    }

    #theme-freetoken .hero .cta {
      margin-top: 34px;
      display: flex;
      gap: 16px;
      justify-content: center;
      align-items: center;
    }

    #theme-freetoken .btn {
      display: inline-block;
      font-size: 15px;
      padding: 11px 24px;
      border-radius: 980px;
      transition: 0.2s;
    }

    #theme-freetoken .btn-primary {
      background: var(--blue);
      color: #fff;
    }

    #theme-freetoken .btn-primary:hover {
      background: #0077ed;
    }

    #theme-freetoken .btn-ghost {
      color: var(--blue);
    }

    #theme-freetoken .btn-ghost:hover {
      text-decoration: underline;
    }

    #theme-freetoken .btn-ghost::after {
      content: " ›";
    }

    /* stats strip */
    #theme-freetoken .strip {
      border-top: 1px solid var(--hairline);
      border-bottom: 1px solid var(--hairline);
      background: var(--bg-alt);
    }

    #theme-freetoken .stripin {
      max-width: 980px;
      margin: 0 auto;
      padding: 34px 22px;
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 20px;
      text-align: center;
    }

    #theme-freetoken .stat .n {
      font-size: 40px;
      font-weight: 700;
      letter-spacing: -0.02em;
    }

    #theme-freetoken .stat .l {
      font-size: 13px;
      color: var(--faint);
      margin-top: 2px;
    }

    /* sections */
    #theme-freetoken :where(section:not(#article-wrapper section)) {
      max-width: 980px;
      margin: 0 auto;
      padding: 110px 22px 0;
    }

    #theme-freetoken .sechead {
      margin-bottom: 30px;
    }

    #theme-freetoken :where(h2:not(#article-wrapper h2)) {
      font-size: 44px;
      font-weight: 700;
      letter-spacing: -0.022em;
      line-height: 1.1;
    }

    #theme-freetoken .secsub {
      font-size: 17px;
      color: var(--sub);
      margin-top: 8px;
      white-space: normal;
    }

    /* notice */
    #theme-freetoken .notice {
      font-size: 13px;
      color: var(--amber);
      background: var(--amber-bg);
      border-radius: 12px;
      padding: 13px 18px;
      margin: 26px 0 0;
    }

    /* toolbar */
    #theme-freetoken .toolbar {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      align-items: center;
      margin: 34px 0 22px;
    }

    #theme-freetoken .search {
      flex: 1;
      min-width: 200px;
      background: var(--bg-alt);
      border: 1px solid transparent;
      border-radius: 980px;
      padding: 9px 18px;
      font-size: 14px;
      color: var(--txt);
      outline: none;
      transition: 0.2s;
    }

    #theme-freetoken .search::placeholder {
      color: var(--faint);
    }

    #theme-freetoken .search:focus {
      border-color: var(--blue);
      background: var(--bg);
    }

    #theme-freetoken .chip {
      padding: 8px 16px;
      border-radius: 980px;
      border: none;
      background: var(--bg-alt);
      color: var(--sub);
      font-size: 13px;
      cursor: pointer;
      transition: 0.2s;
    }

    #theme-freetoken .chip:hover {
      color: var(--txt);
    }

    #theme-freetoken .chip.on {
      background: var(--txt);
      color: var(--bg);
    }

    /* sort dropdown */
    #theme-freetoken .sortdd {
      position: relative;
    }

    #theme-freetoken .sortbtn {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 8px 16px;
      border-radius: 980px;
      border: 1px solid var(--hairline);
      background: var(--bg);
      color: var(--txt);
      font-size: 13px;
      cursor: pointer;
      transition: 0.2s;
    }

    #theme-freetoken .sortbtn .caret {
      font-size: 11px;
      color: var(--faint);
      line-height: 1;
      transform: translateY(-1px);
    }

    #theme-freetoken .sortdd:hover .sortbtn {
      border-color: var(--txt);
    }

    #theme-freetoken .sortmenu {
      position: absolute;
      top: calc(100% + 8px);
      right: 0;
      min-width: 150px;
      background: var(--bg);
      border: 1px solid var(--hairline);
      border-radius: 14px;
      padding: 6px;
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.12);
      opacity: 0;
      visibility: hidden;
      transform: translateY(-4px);
      transition: 0.18s ease;
      z-index: 50;
    }

    /* 展开态由组件显式控制（hover 进入展开、选中后收起）：
       不用 :hover 直接撑开关联菜单，否则鼠标停在菜单上时无法收回。 */
    #theme-freetoken .sortdd.open .sortmenu {
      opacity: 1;
      visibility: visible;
      transform: translateY(0);
    }

    #theme-freetoken .sortmenu button {
      display: block;
      width: 100%;
      text-align: left;
      padding: 8px 14px;
      border: none;
      border-radius: 9px;
      background: transparent;
      color: var(--txt);
      font-size: 13px;
      cursor: pointer;
      transition: background 0.15s;
    }

    #theme-freetoken .sortmenu button:hover {
      background: var(--bg-alt);
    }

    #theme-freetoken .sortmenu button.on {
      background: var(--txt);
      color: var(--bg);
    }

    /* back to top */
    #theme-freetoken .totop {
      position: fixed;
      right: 28px;
      bottom: 28px;
      z-index: 90;
      width: 44px;
      height: 44px;
      border-radius: 50%;
      border: 1px solid var(--hairline);
      background: rgba(255, 255, 255, 0.85);
      backdrop-filter: saturate(180%) blur(20px);
      -webkit-backdrop-filter: saturate(180%) blur(20px);
      color: var(--txt);
      font-size: 17px;
      cursor: pointer;
      opacity: 0;
      pointer-events: none;
      transform: translateY(8px);
      transition: 0.25s;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
    }

    .dark #theme-freetoken .totop {
      background: rgba(22, 22, 26, 0.85);
    }

    #theme-freetoken .totop.show {
      opacity: 1;
      pointer-events: auto;
      transform: translateY(0);
    }

    #theme-freetoken .totop:hover {
      background: var(--bg);
      transform: translateY(-2px);
    }

    /* 路由切换反馈（扩展：原设计无加载提示）
     * 未预生成的模型详情页首次打开要在服务端现场重建 Notion 数据，
     * 期间页面毫无变化，用户会以为点击失效。进度条立刻出现给出确定响应，
     * 文字胶囊延迟出现避免快跳转闪烁（见 LoadingIndicator.jsx）。 */
    #theme-freetoken .loadingbar {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      height: 2px;
      z-index: 120;
      background: transparent;
      pointer-events: none;
    }

    #theme-freetoken .loadingbar-fill {
      display: block;
      height: 100%;
      width: 100%;
      background: var(--blue);
      transform-origin: left center;
      animation: ft-loading-slide 1.6s ease-in-out infinite;
    }

    /* 不定长进度条：前段持续前进到 90% 后回退，等待期间始终在动 */
    @keyframes ft-loading-slide {
      0% {
        transform: scaleX(0.05);
        opacity: 1;
      }
      60% {
        transform: scaleX(0.9);
        opacity: 1;
      }
      100% {
        transform: scaleX(0.98);
        opacity: 0.85;
      }
    }

    #theme-freetoken .loadingpill {
      position: fixed;
      top: 18px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 121;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      border-radius: 999px;
      border: 1px solid var(--hairline);
      background: rgba(255, 255, 255, 0.9);
      backdrop-filter: saturate(180%) blur(20px);
      -webkit-backdrop-filter: saturate(180%) blur(20px);
      color: var(--txt);
      font-size: 13px;
      line-height: 1;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
      pointer-events: none;
      animation: ft-loading-fade 0.24s ease-out;
    }

    .dark #theme-freetoken .loadingpill {
      background: rgba(22, 22, 26, 0.9);
    }

    @keyframes ft-loading-fade {
      from {
        opacity: 0;
        transform: translateX(-50%) translateY(-6px);
      }
      to {
        opacity: 1;
        transform: translateX(-50%) translateY(0);
      }
    }

    #theme-freetoken .loadingdot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      border: 1.5px solid var(--hairline);
      border-top-color: var(--blue);
      animation: ft-loading-spin 0.8s linear infinite;
    }

    @keyframes ft-loading-spin {
      to {
        transform: rotate(360deg);
      }
    }

    /* 无障碍：用户声明减少动态效果时，进度条与转圈改为静态，文案保留 */
    @media (prefers-reduced-motion: reduce) {
      #theme-freetoken .loadingbar-fill {
        animation: none;
        transform: scaleX(0.4);
      }
      #theme-freetoken .loadingpill {
        animation: none;
      }
      #theme-freetoken .loadingdot {
        animation: none;
        border-top-color: var(--hairline);
        background: var(--blue);
      }
    }

    /* model grid */
    #theme-freetoken .grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
    }

    #theme-freetoken .mcard {
      background: var(--card);
      border: 1px solid var(--hairline);
      border-radius: var(--radius);
      padding: 26px 24px 22px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      transition: transform 0.25s ease, box-shadow 0.25s ease;
      cursor: pointer;
      position: relative;
    }

    #theme-freetoken .mcard:hover {
      transform: scale(1.015);
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.08);
    }

    #theme-freetoken .mname {
      font-size: 21px;
      font-weight: 600;
      letter-spacing: -0.015em;
    }

    #theme-freetoken .prov {
      font-size: 13px;
      color: var(--faint);
      margin-top: 1px;
    }

    #theme-freetoken .mdesc {
      font-size: 14px;
      color: var(--sub);
      flex: 1;
    }

    #theme-freetoken .mtags {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
    }

    #theme-freetoken .tag {
      font-size: 11px;
      font-weight: 500;
      padding: 4px 11px;
      border-radius: 980px;
      background: var(--bg-alt);
      color: var(--sub);
    }

    #theme-freetoken .tag.dot {
      display: inline-flex;
      align-items: center;
      gap: 5px;
    }

    #theme-freetoken .tag.dot::before {
      content: "";
      width: 5px;
      height: 5px;
      border-radius: 50%;
    }

    #theme-freetoken .tag.vi::before {
      background: #af52de;
    }

    #theme-freetoken .tag.tools::before {
      background: var(--green);
    }

    #theme-freetoken .tag.rsn::before {
      background: var(--blue);
    }

    #theme-freetoken .ctxrow {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      border-top: 1px solid var(--hairline);
      padding-top: 12px;
      font-size: 12px;
      color: var(--faint);
    }

    #theme-freetoken .ctxrow b {
      font-size: 15px;
      font-weight: 600;
      color: var(--txt);
      letter-spacing: -0.01em;
    }

    #theme-freetoken .empty {
      color: var(--faint);
      text-align: center;
      padding: 70px 0;
      font-size: 15px;
      grid-column: 1 / -1;
    }

    /* 模型库翻页：右对齐（与上方卡片网格右缘齐平） */
    #theme-freetoken .pager {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 30px;
    }

    /* 页码使用圆形按钮；翻页箭头另加浅灰底，贴近 Apple 的克制控件 */
    #theme-freetoken .pgbtn {
      width: 38px;
      height: 38px;
      padding: 0;
      border-radius: 50%;
      border: 1px solid var(--hairline);
      background: var(--bg);
      color: var(--txt);
      font-size: 14px;
      line-height: 1;
      cursor: pointer;
      transition: 0.2s;
    }

    /* 上一页 / 下一页：浅灰圆形底 + 深灰箭头 */
    #theme-freetoken .pgbtn:first-child,
    #theme-freetoken .pgbtn[aria-label='下一页'] {
      display: inline-grid;
      place-items: center;
      border-color: transparent;
      background: var(--bg-alt);
      color: #666666;
    }

    /* 用纯 CSS 折线绘制箭头，避免不同字体下 ‹ › 粗细和位置漂移 */
    #theme-freetoken .pgchev {
      display: block;
      width: 9px;
      height: 9px;
      border-top: 2.5px solid currentColor;
      border-left: 2.5px solid currentColor;
      transform: rotate(-45deg) translate(1px, 1px);
    }

    #theme-freetoken .pgbtn[aria-label='下一页'] .pgchev {
      transform: rotate(135deg) translate(1px, 1px);
    }

    /* 跳页输入：三个圆框中的中间项；右侧仅作总页数提示 */
    #theme-freetoken .pgjump {
      display: inline-flex;
      align-items: center;
      gap: 7px;
    }

    #theme-freetoken .pginput {
      box-sizing: border-box;
      width: 42px;
      height: 38px;
      padding: 0 5px;
      border: 1px solid var(--hairline);
      border-radius: 50%;
      outline: none;
      background: var(--bg);
      color: var(--txt);
      font: inherit;
      font-size: 14px;
      font-weight: 600;
      text-align: center;
      transition: 0.2s;
      appearance: textfield;
    }

    #theme-freetoken .pginput::-webkit-inner-spin-button,
    #theme-freetoken .pginput::-webkit-outer-spin-button {
      margin: 0;
      appearance: none;
    }

    #theme-freetoken .pginput:focus {
      border-color: var(--txt);
      box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.06);
    }

    #theme-freetoken .pgcount {
      min-width: 42px;
      font-size: 13px;
      color: var(--faint);
      white-space: nowrap;
    }

    #theme-freetoken .pgbtn:hover:not(:disabled):not(.on) {
      border-color: var(--txt);
    }

    #theme-freetoken .pgbtn.on {
      background: var(--txt);
      color: var(--bg);
      border-color: var(--txt);
      font-weight: 600;
    }

    #theme-freetoken .pgbtn:disabled {
      opacity: 0.35;
      cursor: default;
    }

    /* stale / expired cards */
    #theme-freetoken .mcard.stale {
      opacity: 0.55;
      filter: grayscale(0.5);
    }

    #theme-freetoken .mcard.stale:hover {
      transform: none;
      box-shadow: none;
    }

    #theme-freetoken .tag.stale-badge {
      background: rgba(255, 149, 18, 0.14);
      color: var(--amber);
      font-weight: 600;
    }

    #theme-freetoken .stale-label {
      position: absolute;
      top: 10px;
      right: 10px;
      font-size: 10px;
      color: var(--amber);
      font-weight: 600;
      background: rgba(255, 149, 18, 0.08);
      padding: 2px 8px;
      border-radius: 980px;
    }

    /* platforms */
    #theme-freetoken .plats {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
    }

    #theme-freetoken .pcard {
      background: var(--bg-alt);
      border-radius: var(--radius);
      padding: 28px 26px;
      position: relative;
      transition: transform 0.25s ease, box-shadow 0.25s ease;
    }

    /* 悬停动效与模型卡 .mcard 一致；整卡可点，点击进入平台详情页 */
    #theme-freetoken .pcard:hover {
      transform: scale(1.015);
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.08);
    }

    /* 拉伸链接：铺满整卡使卡片可点；相对 .pcard 定位（h3 为 static 不受影响） */
    #theme-freetoken .pcard .pname {
      color: inherit;
    }

    #theme-freetoken .pcard .pname::after {
      content: "";
      position: absolute;
      inset: 0;
      border-radius: inherit;
    }

    #theme-freetoken .pcard h3 {
      font-size: 19px;
      font-weight: 600;
      letter-spacing: -0.01em;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    #theme-freetoken .pcard p {
      font-size: 14px;
      color: var(--sub);
      margin-top: 6px;
    }

    #theme-freetoken .pcard .lim {
      font-size: 12px;
      color: var(--faint);
      margin-top: 12px;
    }

    #theme-freetoken .plimk {
      margin-top: 10px;
      /* 提到拉伸链接覆盖层之上，保证「前往官网」仍可点击 */
      position: relative;
      z-index: 1;
      /* 命中区域收缩到胶囊本身：块级 div 默认撑满整行，
         会把同行右侧空白也压在拉伸链接之上，导致该处点击进入不了详情页 */
      width: fit-content;
    }

    /* 「前往官网」：恢复平台卡片原有的浅蓝药丸样式 */
    #theme-freetoken .plimk a {
      display: inline-flex;
      align-items: center;
      font-size: 12px;
      font-weight: 600;
      color: var(--blue);
      border-radius: 980px;
      padding: 3px 10px;
      background: rgba(10, 132, 255, 0.1);
      transition: background 0.15s ease;
    }

    #theme-freetoken .plimk a:hover {
      background: rgba(10, 132, 255, 0.18);
    }

    .dark #theme-freetoken .plimk a {
      background: rgba(10, 132, 255, 0.22);
      color: #6cb2ff;
    }

    #theme-freetoken .pcount {
      font-size: 12px;
      font-weight: 600;
      color: var(--txt);
      margin-top: 14px;
      border-top: 1px solid var(--hairline);
      padding-top: 12px;
    }

    #theme-freetoken .provbar {
      margin-top: -14px;
    }

    #theme-freetoken .badge {
      font-size: 10px;
      font-weight: 600;
      padding: 3px 9px;
      border-radius: 980px;
    }

    #theme-freetoken .badge.ok {
      background: rgba(52, 199, 89, 0.14);
      color: #1d7a36;
    }

    .dark #theme-freetoken .badge.ok {
      color: #30d158;
    }

    #theme-freetoken .badge.todo {
      background: rgba(0, 0, 0, 0.05);
      color: var(--faint);
    }

    /* ---------- platform detail: 免费模型表格 ---------- */
    #theme-freetoken .ptable {
      margin-top: 26px;
      border: 1px solid var(--hairline);
      border-radius: var(--radius);
      overflow: hidden;
      background: var(--card);
    }

    #theme-freetoken .ptable .empty {
      padding: 70px 0;
    }

    /* 「免费模型」限高滚动：表头留在容器外常驻可见，只有行列表滚动。
       --pbody-max 由组件按第 VISIBLE_ROWS 行的实测底部位置写入，
       这里的 800px 只是 JS 挂载前的首帧兜底，避免整表铺开再收起的闪动。 */
    #theme-freetoken .pbody {
      --pbody-max: 800px;
      /* 滚动手柄颜色：静止时淡到几乎看不出，指针进入列表区才加深。
         对应 Apple 的浮层滚动条观感 —— 轨道恒透明，只有手柄淡淡浮现。 */
      --pbody-thumb: rgba(17, 17, 17, 0.07);
      max-height: var(--pbody-max);
      overflow-y: auto;
      /* 常驻预留滚动条槽位：无论表格是否超出行数，列宽都一致，
         表头（.phead 在滚动区外）与数据行的列不会左右错开。 */
      scrollbar-gutter: stable;
      /* Firefox 不支持 hover 渐变，退化成半透明的细滚动条 */
      scrollbar-width: thin;
      scrollbar-color: rgba(17, 17, 17, 0.2) transparent;
    }

    /* 鼠标在列表区内（或键盘聚焦其中）时手柄浮现，移到外部随即淡出 */
    #theme-freetoken .pbody:hover,
    #theme-freetoken .pbody:focus-within {
      --pbody-thumb: rgba(17, 17, 17, 0.28);
    }

    /* Chromium / Edge：轨道透明、手柄内缩成胶囊，宽度收窄到 10px */
    #theme-freetoken .pbody::-webkit-scrollbar {
      width: 10px;
      height: 10px;
    }

    #theme-freetoken .pbody::-webkit-scrollbar-track {
      background: transparent;
    }

    #theme-freetoken .pbody::-webkit-scrollbar-thumb {
      background-color: var(--pbody-thumb);
      background-clip: content-box;
      border: 2px solid transparent;
      border-radius: 999px;
      transition: background-color 0.3s ease;
    }

    #theme-freetoken .pbody::-webkit-scrollbar-thumb:hover {
      background-color: rgba(17, 17, 17, 0.44);
    }

    .dark #theme-freetoken .pbody {
      --pbody-thumb: rgba(255, 255, 255, 0.09);
      scrollbar-color: rgba(255, 255, 255, 0.24) transparent;
    }

    .dark #theme-freetoken .pbody:hover,
    .dark #theme-freetoken .pbody:focus-within {
      --pbody-thumb: rgba(255, 255, 255, 0.32);
    }

    .dark #theme-freetoken .pbody::-webkit-scrollbar-thumb:hover {
      background-color: rgba(255, 255, 255, 0.48);
    }

    #theme-freetoken .phead,
    #theme-freetoken .prow {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 96px minmax(0, 240px) 108px;
      align-items: center;
      gap: 20px;
      padding: 15px 22px;
    }

    #theme-freetoken .phead {
      padding-top: 13px;
      padding-bottom: 13px;
      font-size: 12px;
      color: var(--faint);
      background: var(--bg-alt);
      border-bottom: 1px solid var(--hairline);
      /* 补上右侧滚动条槽位的宽度，让表头列和数据行列对齐。
         数值 = 行内边距 22px + .pbody 的 10px 滚动条槽位。 */
      padding-right: 32px;
    }

    /* 表头即排序控件：沿用表头字号/颜色，去掉按钮默认外观，
       箭头常驻占位（未排序显示 ↕），避免切换列时表头宽度跳动。 */
    #theme-freetoken .psort {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;
      font-weight: 400;
      color: var(--faint);
      background: none;
      border: 0;
      cursor: pointer;
      text-align: left;
      transition: color 0.15s ease;
    }

    #theme-freetoken .psort:hover {
      color: var(--txt);
    }

    #theme-freetoken .psort.on {
      color: var(--txt);
      font-weight: 600;
    }

    #theme-freetoken .psort .psort-arrow {
      font-size: 9px;
      line-height: 1;
    }

    #theme-freetoken .phead > .psort:last-child {
      /* 末列（模型提供商）表头与下方数字同为居中 */
      justify-self: center;
    }

    #theme-freetoken .prow {
      color: inherit;
      transition: background 0.15s ease;
    }

    #theme-freetoken .prow + .prow {
      border-top: 1px solid var(--hairline);
    }

    #theme-freetoken .prow:hover {
      background: var(--bg-alt);
    }

    #theme-freetoken .pmname {
      font-size: 16px;
      font-weight: 600;
      letter-spacing: -0.01em;
    }

    #theme-freetoken .pmdesc {
      font-size: 13px;
      color: var(--sub);
      margin-top: 4px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    #theme-freetoken .pctx {
      font-size: 14px;
      font-weight: 500;
    }

    #theme-freetoken .pcaps {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
    }

    #theme-freetoken .pnone {
      font-size: 14px;
      color: var(--faint);
    }

    #theme-freetoken .pprov {
      font-size: 15px;
      font-weight: 600;
      letter-spacing: -0.01em;
      text-align: center;
    }

    /* 移动端：表格降级为堆叠卡片，用 data-label 前缀标注列含义；
       表头只保留「模型」排序，其余列标签已在每张卡片内展示。 */
    @media (max-width: 760px) {
      /* 手机上每行是堆叠卡片、行高大得多，限高会变成「陷进内部滚动」的死区，
         交还给整页滚动更自然。 */
      #theme-freetoken .pbody {
        max-height: none;
        overflow: visible;
      }

      #theme-freetoken .phead {
        display: flex;
        flex-wrap: wrap;
        gap: 8px 16px;
        padding: 12px 20px;
      }

      #theme-freetoken .phead > .psort:not(:first-child) {
        display: none;
      }

      #theme-freetoken .prow {
        grid-template-columns: 1fr;
        gap: 10px;
        padding: 18px 20px;
      }

      #theme-freetoken .pmdesc {
        overflow: visible;
        text-overflow: clip;
        white-space: normal;
        line-height: 1.55;
      }

      #theme-freetoken .pctx,
      #theme-freetoken .pcaps,
      #theme-freetoken .pprov {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 12px;
        text-align: left;
      }

      #theme-freetoken .pctx::before,
      #theme-freetoken .pcaps::before,
      #theme-freetoken .pprov::before {
        content: attr(data-label);
        font-size: 12px;
        font-weight: 400;
        color: var(--faint);
        flex-shrink: 0;
      }

      #theme-freetoken .pcaps {
        justify-content: flex-start;
      }
    }

    /* footer */
    #theme-freetoken :where(footer:not(#article-wrapper footer)) {
      border-top: 1px solid var(--hairline);
      margin-top: 110px;
      background: var(--bg-alt);
    }

    #theme-freetoken .footin {
      max-width: 980px;
      margin: 0 auto;
      padding: 28px 22px 44px;
      font-size: 12px;
      color: var(--faint);
      line-height: 1.9;
    }

    #theme-freetoken .footin .sep {
      border-top: 1px solid var(--hairline);
      margin: 14px 0;
    }

    #theme-freetoken .footmeta {
      display: flex;
      align-items: center;
      justify-content: flex-start;
      gap: 16px;
      flex-wrap: wrap;
    }

    #theme-freetoken .footlink {
      white-space: nowrap;
    }

    #theme-freetoken .footmeta a {
      color: var(--txt);
      font-weight: 600;
    }

    /* ---------- detail page (scoped) ---------- */
    #theme-freetoken .detail .back {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      font-size: 14px;
      font-weight: 500;
      color: var(--txt);
      background: var(--bg-alt);
      border-radius: 980px;
      padding: 8px 18px;
      margin-bottom: 38px;
      transition: background 0.2s;
    }

    #theme-freetoken .detail .back:hover {
      background: rgba(0, 0, 0, 0.08);
    }

    #theme-freetoken .detail .back .chev {
      color: var(--faint);
      font-size: 15px;
    }

    #theme-freetoken .detail .hero {
      padding: 56px 22px 10px;
      text-align: left;
    }

    /* 详情页推广位：仅在 Notion 同时配置推广图与推广链接时启用两栏 */
    #theme-freetoken .detail .hero.has-promo .hero-main {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 334px;
      gap: 48px;
      align-items: start;
    }

    #theme-freetoken .hero-promo {
      position: relative;
      display: block;
      width: 100%;
      aspect-ratio: 334 / 152;
      overflow: hidden;
      border: 1px solid var(--hairline);
      border-radius: 18px;
      background: var(--bg-alt);
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
      transition:
        transform 0.22s ease,
        box-shadow 0.22s ease;
    }

    #theme-freetoken .hero-promo img {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.35s ease;
    }

    #theme-freetoken .hero-promo-badge {
      position: absolute;
      z-index: 1;
      top: 12px;
      left: 12px;
      padding: 5px 9px;
      border-radius: 980px;
      color: #fff;
      background: rgba(0, 0, 0, 0.58);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      font-size: 11px;
      font-weight: 600;
      line-height: 1.2;
      letter-spacing: 0.04em;
      pointer-events: none;
    }

    #theme-freetoken .hero-promo::after {
      content: "前往官网 ↗";
      position: absolute;
      right: 12px;
      bottom: 12px;
      padding: 6px 11px;
      border-radius: 980px;
      color: #fff;
      background: rgba(0, 0, 0, 0.62);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      font-size: 11px;
      font-weight: 600;
      opacity: 0;
      transform: translateY(4px);
      transition:
        opacity 0.2s ease,
        transform 0.2s ease;
    }

    #theme-freetoken .hero-promo:hover {
      transform: translateY(-2px);
      box-shadow: 0 14px 30px rgba(0, 0, 0, 0.12);
    }

    #theme-freetoken .hero-promo:hover img {
      transform: scale(1.025);
    }

    #theme-freetoken .hero-promo:hover::after,
    #theme-freetoken .hero-promo:focus-visible::after {
      opacity: 1;
      transform: translateY(0);
    }

    #theme-freetoken .hero-promo:focus-visible {
      outline: 3px solid rgba(0, 113, 227, 0.38);
      outline-offset: 4px;
    }

    #theme-freetoken .detail .eyebrow {
      font-size: 15px;
      font-weight: 600;
      color: var(--sub);
      letter-spacing: -0.01em;
      margin-bottom: 8px;
    }

    #theme-freetoken .detail :where(h1:not(#article-wrapper h1)) {
      font-size: 56px;
      font-weight: 700;
      letter-spacing: -0.025em;
      line-height: 1.08;
    }

    #theme-freetoken .herosub {
      font-size: 19px;
      color: var(--sub);
      margin-top: 12px;
      max-width: 700px;
    }

    #theme-freetoken .heropills {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin-top: 22px;
    }

    #theme-freetoken .hpill {
      font-size: 12px;
      font-weight: 500;
      padding: 5px 13px;
      border-radius: 980px;
      background: var(--bg-alt);
      color: var(--sub);
    }

    #theme-freetoken .hpill.dark {
      background: var(--txt);
      color: var(--bg);
    }

    #theme-freetoken .hpill.warn {
      background: rgba(255, 149, 18, 0.14);
      color: var(--amber);
      font-weight: 600;
    }

    /* 平台详情头部：官网入口 + Base URL 收成一行，与药丸同族视觉 */
    #theme-freetoken .pmeta {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
      margin-top: 16px;
    }

    #theme-freetoken .pmetabtn {
      display: inline-flex;
      align-items: center;
      font-size: 12px;
      font-weight: 600;
      color: #fff;
      background: var(--blue);
      border-radius: 980px;
      padding: 8px 18px;
      transition: background 0.2s;
    }

    #theme-freetoken .pmetabtn:hover {
      background: #0077ed;
    }

    #theme-freetoken .pmetabtn::after {
      content: " ↗";
    }

    #theme-freetoken .pmetaurl {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font: inherit;
      font-family: "SF Mono", ui-monospace, Menlo, Consolas, monospace;
      font-size: 12.5px;
      color: var(--sub);
      background: var(--bg-alt);
      border: none;
      border-radius: 980px;
      padding: 7px 16px;
      cursor: pointer;
      overflow: hidden;
      max-width: 100%;
      transition: background 0.15s ease;
    }

    #theme-freetoken .pmetaurl:hover {
      background: rgba(0, 0, 0, 0.07);
    }

    #theme-freetoken .pmetaurl-text {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    #theme-freetoken .pmetaurl-copy {
      flex-shrink: 0;
      font-family:
        -apple-system, BlinkMacSystemFont, "SF Pro Text", "PingFang SC",
        "Microsoft YaHei", sans-serif;
      font-size: 12px;
      font-weight: 600;
      color: var(--blue);
    }

    /* 平台简介正文 */
    #theme-freetoken .introcopy {
      margin-top: 18px;
      font-size: 16px;
      line-height: 1.75;
      color: var(--sub);
      /* 与下方免费模型表格使用同一内容宽度，简介左右边缘对齐 */
      width: 100%;
      white-space: pre-line;
    }

    #theme-freetoken .detail :where(section:not(#article-wrapper section)) {
      padding: 64px 22px 0;
    }

    #theme-freetoken .detail :where(h2:not(#article-wrapper h2)) {
      font-size: 32px;
      font-weight: 700;
      letter-spacing: -0.02em;
      line-height: 1.12;
    }

    #theme-freetoken .detail .secsub {
      font-size: 15px;
      color: var(--sub);
      margin-top: 6px;
      white-space: normal;
    }

    #theme-freetoken .band {
      /* 与平台详情页（/platform/[platform]）保持同一底色：正文纯白，
         区块之间靠卡片 hairline 边框区分，而非整块灰底。 */
      background: var(--bg);
      margin-top: 72px;
      padding: 4px 0 42px;
    }

    #theme-freetoken .band :where(section:not(#article-wrapper section)) {
      padding-top: 54px;
    }

    #theme-freetoken .facts {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 14px;
      margin-top: 28px;
    }

    #theme-freetoken .fact {
      background: var(--bg-alt);
      border-radius: var(--radius);
      padding: 20px 22px;
    }

    #theme-freetoken .fact .k {
      font-size: 12px;
      color: var(--faint);
    }

    #theme-freetoken .fact .v {
      font-size: 19px;
      font-weight: 600;
      letter-spacing: -0.01em;
      margin-top: 3px;
    }

    #theme-freetoken .featlist {
      margin-top: 26px;
      border-top: 1px solid var(--hairline);
    }

    #theme-freetoken .feat {
      display: flex;
      gap: 12px;
      padding: 15px 4px;
      border-bottom: 1px solid var(--hairline);
      font-size: 15px;
    }

    #theme-freetoken .feat .ck {
      color: var(--green);
      font-weight: 700;
      flex-shrink: 0;
    }

    #theme-freetoken .feat .fd {
      color: var(--sub);
      margin-left: auto;
      text-align: right;
      font-size: 13px;
      max-width: 55%;
    }

    #theme-freetoken .offers {
      margin-top: 26px;
    }

    /* 免费获取渠道：紧凑可检索清单（一行一家，详情渐进展开，支撑数十上百家） */
    #theme-freetoken .offers {
      margin-top: 22px;
    }

    #theme-freetoken .offersbar {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
      margin-bottom: 14px;
    }

    #theme-freetoken .osearch {
      flex: 1;
      min-width: 200px;
      font: inherit;
      font-size: 14px;
      color: var(--txt);
      background: var(--card);
      border: 1px solid var(--hairline);
      border-radius: 980px;
      padding: 9px 16px;
      outline: none;
    }

    #theme-freetoken .osearch:focus {
      border-color: var(--blue);
    }

    #theme-freetoken .osorts {
      display: inline-flex;
      gap: 6px;
    }

    #theme-freetoken .osort {
      font: inherit;
      font-size: 13px;
      color: var(--sub);
      background: var(--bg-alt);
      border: none;
      border-radius: 980px;
      padding: 7px 14px;
      cursor: pointer;
    }

    #theme-freetoken .osort.on {
      background: var(--txt);
      color: var(--bg);
    }

    #theme-freetoken .ocount {
      font-size: 13px;
      color: var(--faint);
      white-space: nowrap;
    }

    #theme-freetoken .olist {
      border: 1px solid var(--hairline);
      border-radius: var(--radius);
      overflow: hidden;
      background: var(--card);
    }

    #theme-freetoken .oitem + .oitem {
      border-top: 1px solid var(--hairline);
    }

    #theme-freetoken .orow {
      display: grid;
      grid-template-columns: minmax(0, 2.2fr) 90px minmax(0, 1.6fr) auto;
      align-items: center;
      gap: 16px;
      padding: 15px 20px;
    }

    #theme-freetoken .ocell {
      min-width: 0;
    }

    #theme-freetoken .otop {
      display: flex;
      align-items: center;
      gap: 9px;
      flex-wrap: wrap;
    }

    #theme-freetoken .oname {
      font-size: 16px;
      font-weight: 600;
      letter-spacing: -0.01em;
    }

    /* 平台名可点（命中平台档案时渲染为链接）：悬停给出可点提示，
       但不加下划线压力，保持整行清单的克制观感 */
    #theme-freetoken a.oname {
      cursor: pointer;
      transition: color 0.2s ease;
    }

    #theme-freetoken a.oname:hover {
      color: var(--blue);
    }

    #theme-freetoken .oquota {
      font-size: 12px;
      font-weight: 600;
      padding: 3px 10px;
      border-radius: 980px;
      background: rgba(52, 199, 89, 0.14);
      color: var(--green);
      white-space: nowrap;
    }

    #theme-freetoken .odesc {
      font-size: 13px;
      color: var(--sub);
      margin-top: 4px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    #theme-freetoken .olabel {
      display: block;
      font-size: 11px;
      color: var(--faint);
    }

    #theme-freetoken .oval {
      display: block;
      font-size: 14px;
      font-weight: 500;
      margin-top: 2px;
    }

    #theme-freetoken .oval.mono {
      font-family: "SF Mono", ui-monospace, Menlo, Consolas, monospace;
      font-size: 12.5px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    #theme-freetoken .oact {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 14px;
      white-space: nowrap;
    }

    #theme-freetoken .otoggle {
      font: inherit;
      font-size: 13px;
      color: var(--sub);
      background: var(--bg-alt);
      border: none;
      border-radius: 980px;
      padding: 6px 14px;
      cursor: pointer;
      /* 固定宽度：避免「接入方式」↔「收起」文案变化时列宽抖动，
         导致左侧「上下文 / Base URL」两列来回位移。 */
      min-width: 84px;
      text-align: center;
    }

    #theme-freetoken .otoggle:hover {
      color: var(--txt);
    }

    #theme-freetoken .obtn {
      display: inline-flex;
      align-items: center;
      font-size: 13px;
      font-weight: 500;
      color: var(--blue);
      background: rgba(0, 113, 227, 0.12);
      border: 1px solid rgba(0, 113, 227, 0.22);
      border-radius: 980px;
      padding: 6px 15px;
      white-space: nowrap;
      transition: 0.2s;
    }

    #theme-freetoken .obtn:hover {
      background: rgba(0, 113, 227, 0.2);
      border-color: rgba(0, 113, 227, 0.34);
      text-decoration: none;
    }

    #theme-freetoken .obtn::after {
      content: " ↗";
    }

    /* 深色模式：换用更亮的蓝，避免 #0071e3 在深底上发闷 */
    .dark #theme-freetoken .obtn {
      color: #4da3ff;
      background: rgba(77, 163, 255, 0.16);
      border-color: rgba(77, 163, 255, 0.3);
    }

    .dark #theme-freetoken .obtn:hover {
      background: rgba(77, 163, 255, 0.24);
      border-color: rgba(77, 163, 255, 0.42);
    }

    #theme-freetoken .opanel {
      padding: 0 20px 20px;
    }

    #theme-freetoken .oguide .k {
      font-size: 12px;
      color: var(--faint);
    }

    #theme-freetoken .oguide .t {
      font-size: 14px;
      line-height: 1.7;
      margin-top: 4px;
      white-space: pre-line;
    }

    #theme-freetoken .opanel-code {
      margin-top: 14px;
    }

    @media (max-width: 760px) {
      #theme-freetoken .orow {
        grid-template-columns: 1fr;
        gap: 10px;
      }

      #theme-freetoken .oact {
        justify-content: flex-start;
      }

      #theme-freetoken .oval.mono {
        white-space: normal;
        word-break: break-all;
      }
    }

    @media (max-width: 600px) {
      #theme-freetoken .platform-meta .pmetabtn {
        height: 27px;
        padding: 0 13px;
        font-size: 12px;
        margin-left: 0;
      }

      #theme-freetoken .platform-meta .hpill {
        display: inline-flex;
        align-items: center;
        height: 27px;
        padding: 0 13px;
        font-size: 12px;
      }

      #theme-freetoken .orow {
        grid-template-columns: minmax(0, 1fr) auto;
        gap: 8px 12px;
        padding: 15px 16px;
      }

      #theme-freetoken .omain {
        grid-column: 1;
        grid-row: 1;
      }

      #theme-freetoken .octx {
        grid-column: 2;
        grid-row: 1;
        text-align: right;
      }

      #theme-freetoken .obase {
        grid-column: 1 / -1;
        grid-row: 2;
      }

      #theme-freetoken .oact {
        grid-column: 1 / -1;
        grid-row: 3;
      }

      #theme-freetoken .odesc {
        white-space: normal;
        line-height: 1.55;
      }

      #theme-freetoken .opanel {
        padding: 0 16px 16px;
      }
    }

    #theme-freetoken .code {
      background: #1d1d1f;
      color: #f5f5f7;
      border-radius: 14px;
      padding: 20px 22px;
      font-family: "SF Mono", ui-monospace, Menlo, Consolas, monospace;
      font-size: 12.5px;
      line-height: 1.75;
      overflow: auto;
      position: relative;
      margin-top: 26px;
      white-space: pre;
    }

    #theme-freetoken .code code {
      font-family: inherit;
    }

    #theme-freetoken .copy {
      position: absolute;
      top: 12px;
      right: 12px;
      background: rgba(255, 255, 255, 0.16);
      color: #fff;
      border: none;
      border-radius: 980px;
      padding: 5px 14px;
      font-size: 12px;
      cursor: pointer;
      transition: 0.2s;
    }

    #theme-freetoken .copy:hover {
      background: rgba(255, 255, 255, 0.28);
    }

    /* 「报告过期 / 核实日期」：渠道列表正下方的补充说明行（原先独立成灰色页脚带，
       既与渠道列表割裂，又会在页面底部夹出一条白块） */
    #theme-freetoken .reportline {
      margin-top: 16px;
      font-size: 12px;
      line-height: 1.9;
      color: var(--faint);
    }

    #theme-freetoken .reportline a {
      color: var(--blue);
    }

    #theme-freetoken .missing {
      text-align: center;
      padding: 40px 0;
      color: var(--sub);
      font-size: 15px;
    }

    /* 锁定文章页（ArticleLock）：返回链接复用 .detail .back，仅补输入区 */
    #theme-freetoken .lockwrap {
      max-width: 980px;
      margin: 0 auto;
      padding: 56px 22px 10px;
      min-height: calc(100vh - 300px);
    }

    #theme-freetoken .lockwrap .back {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      font-size: 14px;
      font-weight: 500;
      color: var(--txt);
      background: var(--bg-alt);
      border-radius: 980px;
      padding: 8px 18px;
      margin-bottom: 38px;
    }

    #theme-freetoken .lockwrap .missing {
      text-align: center;
      width: 100%;
      color: var(--sub);
      font-size: 15px;
      padding: 24px 0 0;
    }

    #theme-freetoken .lockinput {
      display: block;
      margin: 20px auto 12px;
      width: min(320px, 80%);
      padding: 10px 16px;
      font-size: 15px;
      font-family: inherit;
      color: var(--txt);
      background: var(--card);
      border: 1px solid var(--hairline);
      border-radius: 14px;
      outline: none;
      transition: border-color 0.2s;
    }

    #theme-freetoken .lockinput:focus {
      border-color: var(--blue);
    }

    #theme-freetoken .lockbtn {
      display: block;
      margin: 0 auto;
      width: fit-content;
      padding: 10px 34px;
      font-size: 15px;
      font-weight: 500;
      color: #fff;
      background: var(--blue);
      border: none;
      border-radius: 980px;
      cursor: pointer;
      transition: opacity 0.2s;
    }

    #theme-freetoken .lockbtn:hover {
      opacity: 0.85;
    }

    #theme-freetoken .locktips {
      margin-top: 14px;
      text-align: center;
      color: var(--amber);
      font-size: 14px;
    }

    @media (max-width: 900px) {
      #theme-freetoken .grid,
      #theme-freetoken .plats {
        grid-template-columns: repeat(2, 1fr);
      }
      #theme-freetoken :where(h1:not(#article-wrapper h1)) {
        font-size: 52px;
      }
      #theme-freetoken .stripin {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    @media (max-width: 800px) {
      #theme-freetoken .facts {
        grid-template-columns: repeat(2, 1fr);
      }
      #theme-freetoken .detail :where(h1:not(#article-wrapper h1)) {
        font-size: 40px;
      }
      #theme-freetoken .detail .hero.has-promo .hero-main {
        grid-template-columns: 1fr;
        gap: 28px;
      }
      #theme-freetoken .hero-promo {
        max-width: none;
      }
    }

    @media (max-width: 640px) {
      #theme-freetoken .navin {
        padding: 0 18px;
        gap: 12px;
      }

      #theme-freetoken .logo {
        flex-shrink: 0;
        font-size: 16px;
      }

      #theme-freetoken .navtoggle {
        display: inline-flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 4px;
        width: 34px;
        height: 34px;
        margin-left: auto;
        padding: 0;
        border: 0;
        border-radius: 10px;
        color: var(--txt);
        background: transparent;
        cursor: pointer;
      }

      #theme-freetoken .navtoggle span {
        display: block;
        width: 17px;
        height: 1.5px;
        border-radius: 999px;
        background: currentColor;
        transition:
          transform 0.18s ease,
          opacity 0.18s ease;
      }

      #theme-freetoken .navtoggle.open span:nth-child(1) {
        transform: translateY(5.5px) rotate(45deg);
      }

      #theme-freetoken .navtoggle.open span:nth-child(2) {
        opacity: 0;
      }

      #theme-freetoken .navtoggle.open span:nth-child(3) {
        transform: translateY(-5.5px) rotate(-45deg);
      }

      #theme-freetoken .navlinks {
        position: absolute;
        top: calc(100% + 1px);
        right: 14px;
        left: 14px;
        display: block;
        padding: 8px;
        border: 1px solid var(--hairline);
        border-radius: 16px;
        background: var(--card);
        box-shadow: 0 14px 34px rgba(0, 0, 0, 0.14);
        opacity: 0;
        visibility: hidden;
        transform: translateY(-6px);
        transition:
          opacity 0.18s ease,
          transform 0.18s ease,
          visibility 0.18s;
      }

      #theme-freetoken .navlinks.open {
        opacity: 1;
        visibility: visible;
        transform: translateY(0);
      }

      #theme-freetoken .navlinks > a,
      #theme-freetoken .navlinks > .navdd > .navbtn {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 14px;
        border-radius: 10px;
        font-size: 14px;
      }

      #theme-freetoken .navlinks > .navdd > .navbtn > a {
        flex: 1;
      }

      #theme-freetoken .navlinks > a:hover,
      #theme-freetoken .navlinks > .navdd > .navbtn:hover {
        background: var(--bg-alt);
      }

      #theme-freetoken .navlinks .navmenu {
        position: static;
        display: none;
        min-width: 0;
        padding: 0 0 4px 12px;
        border: 0;
        box-shadow: none;
        opacity: 0;
        visibility: hidden;
        transform: none;
      }

      #theme-freetoken .navlinks .navmenu.open {
        display: block;
        opacity: 1;
        visibility: visible;
      }

      #theme-freetoken .navsubtoggle {
        width: 34px;
        height: 34px;
        margin: -8px -8px -8px 0;
      }

      #theme-freetoken .navsubtoggle .caret {
        transition: transform 0.18s ease;
      }

      #theme-freetoken .navsubtoggle[aria-expanded="true"] .caret {
        transform: rotate(180deg);
      }

      #theme-freetoken .navlinks .navmenu a {
        font-size: 13px;
      }
    }

    @media (max-width: 600px) {
      #theme-freetoken .grid,
      #theme-freetoken .plats {
        grid-template-columns: 1fr;
      }
      #theme-freetoken :where(h1:not(#article-wrapper h1)) {
        font-size: 42px;
      }
      #theme-freetoken :where(h2:not(#article-wrapper h2)) {
        font-size: 32px;
      }
      #theme-freetoken .hero {
        padding: 80px 22px 50px;
      }
      #theme-freetoken .hero .sub {
        font-size: 19px;
      }
      #theme-freetoken .stripin {
        grid-template-columns: repeat(2, 1fr);
        gap: 12px;
      }
      #theme-freetoken .stat .n {
        font-size: 28px;
      }

      #theme-freetoken .feat {
        display: grid;
        grid-template-columns: auto minmax(0, 1fr);
        gap: 3px 9px;
        padding: 13px 2px;
      }

      #theme-freetoken .feat .fd {
        grid-column: 2;
        max-width: none;
        margin-left: 0;
        text-align: left;
        line-height: 1.55;
      }
    }

    @media (max-width: 520px) {
      #theme-freetoken .facts {
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px;
      }

      #theme-freetoken .fact {
        min-height: 82px;
        padding: 15px 16px;
      }

      #theme-freetoken .fact .v {
        font-size: 17px;
        overflow-wrap: anywhere;
      }

      #theme-freetoken .detail :where(h1:not(#article-wrapper h1)) {
        font-size: 34px;
      }
    }

    /* ===== 扩展：解锁成功通知条（官方 components/Notification.js，纯 CSS 覆盖） =====
     * 渲染位置：官方由 pages/[prefix]/index.js 渲染在 DynamicLayout 之外，即位于
     * #theme-freetoken 根容器【外层】，主题前缀选择器命中不到 → 只能用全局特征类名
     * 覆盖（仅样式，不动官方 DOM/类名；全站仅此组件使用 .notification 类）。
     * 不用 :where() 降权的原因：官方工具类（w-full / left-0 / bg-green-500 …）特异性为
     * 单类 (0,1,0)，:where 参数特异性为 0 会被反压；故用 .notification.notification
     * 双类 (0,2,0) 稳定覆盖，作用面仍仅限该组件。
     */
    #theme-freetoken .notification.notification {
      left: 50% !important;
      right: auto !important;
      width: fit-content;
      max-width: calc(100vw - 32px);
      transform: translateX(-50%) !important;
    }

    /* 胶囊本体（官方内层 div：max-lg.mx-auto.bg-green-500…）
     * 视觉对齐主题药丸（.hpill / 详情页返回按钮）：浅底 + var(--hairline) 细边框 + 深色文字；
     * 组件在 #theme-freetoken 外取不到变量，直取同名常量 */
    #theme-freetoken .notification.notification > div {
      background: ${CONFIG.FREETOKEN_CARD} !important;
      color: ${CONFIG.FREETOKEN_TXT} !important;
      border: 1px solid ${CONFIG.FREETOKEN_HAIRLINE};
      border-radius: 999px;
      padding: 10px 20px;
      font-size: 14px;
      line-height: 1.4;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
    }

    /* 关闭按钮随胶囊收敛（官方 ml-4/p-2 会撑高胶囊；官方 text-white 在浅底上不可见 → 随文字色） */
    #theme-freetoken .notification.notification > div button {
      margin-left: 12px;
      padding: 4px;
      line-height: 1;
      color: ${CONFIG.FREETOKEN_TXT} !important;
      background: transparent !important;
      border-radius: 50%;
    }

    #theme-freetoken .notification.notification > div button:hover {
      background: ${CONFIG.FREETOKEN_HAIRLINE};
    }

    ${themeConsoleStyle('freetoken', CONFIG, { rootId: 'theme-freetoken' })}
  `}</style>
)

export { Style }
