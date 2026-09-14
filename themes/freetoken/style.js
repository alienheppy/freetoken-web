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
    #theme-freetoken :where(nav:not(#article-wrapper nav)) {
      position: sticky;
      top: 0;
      z-index: 100;
      backdrop-filter: saturate(180%) blur(20px);
      -webkit-backdrop-filter: saturate(180%) blur(20px);
      background: rgba(255, 255, 255, 0.72);
      border-bottom: 1px solid var(--hairline);
    }

    .dark #theme-freetoken :where(nav:not(#article-wrapper nav)) {
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
    }

    #theme-freetoken .logo {
      font-weight: 600;
      font-size: 17px;
      letter-spacing: -0.02em;
    }

    #theme-freetoken .navlinks {
      display: flex;
      align-items: center;
      gap: 28px;
      font-size: 12px;
      color: var(--sub);
    }

    #theme-freetoken .navlinks a {
      transition: color 0.2s;
    }

    #theme-freetoken .navlinks a:hover {
      color: var(--txt);
    }

    /* 扩展：customMenu 二级项下拉（视觉同 .sortdd/.sortmenu） */
    #theme-freetoken .navdd {
      position: relative;
    }

    #theme-freetoken .navbtn {
      display: inline-flex;
      align-items: center;
      gap: 5px;
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
      white-space: nowrap;
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

    #theme-freetoken .sortdd:hover .sortmenu,
    #theme-freetoken .sortdd:focus-within .sortmenu {
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

    #theme-freetoken .footin a {
      color: var(--blue);
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
      background: var(--bg-alt);
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

    #theme-freetoken .orow {
      display: flex;
      align-items: center;
      gap: 18px;
      padding: 22px 4px;
      border-bottom: 1px solid var(--hairline);
      flex-wrap: wrap;
    }

    #theme-freetoken .orow .oname {
      font-size: 17px;
      font-weight: 600;
      letter-spacing: -0.01em;
      display: flex;
      align-items: center;
      gap: 9px;
    }

    #theme-freetoken .orow .olim {
      font-size: 13px;
      color: var(--sub);
      flex: 1;
      min-width: 200px;
    }

    #theme-freetoken .st {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: var(--sub);
      white-space: nowrap;
    }

    #theme-freetoken .st i {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      display: inline-block;
    }

    #theme-freetoken .st.ok i {
      background: var(--green);
    }

    #theme-freetoken .st.todo i {
      background: #c7c7cc;
    }

    #theme-freetoken .st.down i {
      background: #ff9f0a;
    }

    #theme-freetoken .obtn {
      font-size: 13px;
      color: var(--blue);
      white-space: nowrap;
    }

    #theme-freetoken .obtn:hover {
      text-decoration: underline;
    }

    #theme-freetoken .obtn::after {
      content: " ↗";
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

    #theme-freetoken .pagefoot {
      border-top: 1px solid var(--hairline);
      margin-top: 90px;
      background: var(--bg-alt);
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
    }

    @media (max-width: 520px) {
      #theme-freetoken .facts {
        grid-template-columns: 1fr;
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
