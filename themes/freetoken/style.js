/* eslint-disable react/no-unknown-property */
import CONFIG from './config'
import { themeConsoleStyle } from '@/lib/themeConsoleStyle'

/**
 * Freetoken 主题样式
 * 仅对 #theme-freetoken 作用域内生效，复用苹果风视觉 token
 */
const Style = () => (
  <style jsx global>{`
    #theme-freetoken {
      --ft-bg: ${CONFIG.FREETOKEN_BG};
      --ft-bg-alt: ${CONFIG.FREETOKEN_BG_ALT};
      --ft-card: ${CONFIG.FREETOKEN_CARD};
      --ft-hairline: ${CONFIG.FREETOKEN_HAIRLINE};
      --ft-txt: ${CONFIG.FREETOKEN_TXT};
      --ft-sub: ${CONFIG.FREETOKEN_SUB};
      --ft-faint: ${CONFIG.FREETOKEN_FAINT};
      --ft-blue: ${CONFIG.FREETOKEN_BLUE};
      --ft-green: ${CONFIG.FREETOKEN_GREEN};
      --ft-amber: ${CONFIG.FREETOKEN_AMBER};
      --ft-amber-bg: ${CONFIG.FREETOKEN_AMBER_BG};
      --ft-radius: ${CONFIG.FREETOKEN_RADIUS};
    }

    .dark #theme-freetoken {
      --ft-bg: ${CONFIG.FREETOKEN_DARK_BG};
      --ft-bg-alt: ${CONFIG.FREETOKEN_DARK_BG_ALT};
      --ft-card: ${CONFIG.FREETOKEN_DARK_CARD};
      --ft-hairline: ${CONFIG.FREETOKEN_DARK_HAIRLINE};
      --ft-txt: ${CONFIG.FREETOKEN_DARK_TXT};
      --ft-sub: ${CONFIG.FREETOKEN_DARK_SUB};
      --ft-faint: ${CONFIG.FREETOKEN_DARK_FAINT};
    }

    #theme-freetoken {
      background-color: var(--ft-bg);
      color: var(--ft-txt);
      font-family:
        -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text",
        "Helvetica Neue", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei",
        sans-serif;
      -webkit-font-smoothing: antialiased;
      line-height: 1.58;
      min-height: 100vh;
    }

    #theme-freetoken .ft-container {
      max-width: 980px;
      margin: 0 auto;
      padding-left: 22px;
      padding-right: 22px;
    }

    #theme-freetoken .ft-hero {
      max-width: 980px;
      margin: 0 auto;
      padding: 120px 22px 70px;
      text-align: center;
    }

    #theme-freetoken .ft-hero .eyebrow {
      font-size: 17px;
      font-weight: 600;
      color: var(--ft-blue);
      letter-spacing: -0.01em;
      margin-bottom: 10px;
    }

    #theme-freetoken .ft-hero h1 {
      font-size: clamp(42px, 8vw, 72px);
      font-weight: 700;
      letter-spacing: -0.028em;
      line-height: 1.06;
      white-space: pre-line;
    }

    #theme-freetoken .ft-hero .sub {
      font-size: 24px;
      font-weight: 400;
      color: var(--ft-sub);
      letter-spacing: -0.01em;
      margin-top: 14px;
    }

    #theme-freetoken .ft-hero .cta {
      margin-top: 34px;
      display: flex;
      gap: 16px;
      justify-content: center;
      align-items: center;
    }

    #theme-freetoken .ft-btn {
      display: inline-block;
      font-size: 15px;
      padding: 11px 24px;
      border-radius: 980px;
      transition: 0.2s;
    }

    #theme-freetoken .ft-btn-primary {
      background: var(--ft-blue);
      color: #fff;
    }

    #theme-freetoken .ft-btn-primary:hover {
      background: #0077ed;
    }

    #theme-freetoken .ft-btn-ghost {
      color: var(--ft-blue);
    }

    #theme-freetoken .ft-btn-ghost:hover {
      text-decoration: underline;
    }

    #theme-freetoken .ft-strip {
      border-top: 1px solid var(--ft-hairline);
      border-bottom: 1px solid var(--ft-hairline);
      background: var(--ft-bg-alt);
    }

    #theme-freetoken .ft-strip-in {
      max-width: 980px;
      margin: 0 auto;
      padding: 34px 22px;
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 20px;
      text-align: center;
    }

    @media (max-width: 900px) {
      #theme-freetoken .ft-strip-in {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    #theme-freetoken .ft-stat .n {
      font-size: 40px;
      font-weight: 700;
      letter-spacing: -0.02em;
    }

    #theme-freetoken .ft-stat .l {
      font-size: 13px;
      color: var(--ft-faint);
      margin-top: 2px;
    }

    #theme-freetoken .ft-section {
      max-width: 980px;
      margin: 0 auto;
      padding: 110px 22px 0;
    }

    #theme-freetoken .ft-section h2 {
      font-size: 44px;
      font-weight: 700;
      letter-spacing: -0.022em;
      line-height: 1.1;
    }

    #theme-freetoken .ft-secsub {
      font-size: 17px;
      color: var(--ft-sub);
      margin-top: 8px;
    }

    #theme-freetoken .ft-notice {
      font-size: 13px;
      color: var(--ft-amber);
      background: var(--ft-amber-bg);
      border-radius: 12px;
      padding: 13px 18px;
      margin: 26px 0 0;
    }

    #theme-freetoken .ft-card {
      background: var(--ft-card);
      border: 1px solid var(--ft-hairline);
      border-radius: var(--ft-radius);
      transition: transform 0.25s ease, box-shadow 0.25s ease;
    }

    #theme-freetoken .ft-card:hover {
      transform: scale(1.015);
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.08);
    }

    /* 待核实/陈旧条目弱化显示；已过期进一步降透明度 */
    #theme-freetoken .ft-card.is-weak,
    #theme-freetoken .ft-facts.is-stale {
      opacity: 0.82;
    }

    #theme-freetoken .ft-card.is-stale {
      opacity: 0.68;
    }

    #theme-freetoken .ft-mcard {
      display: flex;
      flex-direction: column;
      gap: 0;
    }

    #theme-freetoken .ft-mcard-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
    }

    #theme-freetoken .ft-prov {
      font-size: 12px;
      color: var(--ft-faint);
      margin-top: 2px;
    }

    #theme-freetoken .ft-mdesc {
      font-size: 13px;
      color: var(--ft-sub);
      margin-top: 12px;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    #theme-freetoken .ft-mtags {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 14px;
    }

    #theme-freetoken .ft-ctxrow {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 12px;
      color: var(--ft-faint);
      margin-top: 16px;
    }

    #theme-freetoken .ft-badge {
      font-size: 11px;
      font-weight: 600;
      padding: 3px 10px;
      border-radius: 980px;
      white-space: nowrap;
    }

    #theme-freetoken .ft-badge-ok {
      background: rgba(52, 199, 89, 0.14);
      color: #248a3d;
    }

    #theme-freetoken .ft-badge-pending {
      background: rgba(255, 149, 18, 0.16);
      color: var(--ft-amber);
    }

    #theme-freetoken .ft-badge-dup {
      background: var(--ft-bg-alt);
      color: var(--ft-faint);
    }

    .dark #theme-freetoken .ft-badge-ok {
      color: #30d158;
    }

    #theme-freetoken .ft-strip-caps {
      grid-column: 1 / -1;
      font-size: 12px;
      color: var(--ft-faint);
    }

    #theme-freetoken .ft-facts {
      background: var(--ft-bg-alt);
      border: 1px solid var(--ft-hairline);
    }

    #theme-freetoken .ft-fact-l {
      font-size: 12px;
      color: var(--ft-faint);
    }

    #theme-freetoken .ft-fact-v {
      font-size: 15px;
      margin-top: 4px;
    }

    #theme-freetoken .ft-limits {
      margin-top: 20px;
      padding-top: 16px;
      border-top: 1px solid var(--ft-hairline);
    }

    #theme-freetoken .ft-link {
      color: var(--ft-blue);
      word-break: break-all;
    }

    #theme-freetoken .ft-eyebrow {
      font-size: 13px;
      font-weight: 600;
      color: var(--ft-blue);
      letter-spacing: 0.06em;
      text-transform: uppercase;
      padding-top: 24px;
    }

    #theme-freetoken .ft-detail-sub {
      font-size: 19px;
      color: var(--ft-sub);
      margin-top: 10px;
    }

    #theme-freetoken .ft-platcount {
      font-size: 12px;
      color: var(--ft-faint);
      margin-top: 4px;
    }

    #theme-freetoken .ft-pill {
      display: inline-flex;
      align-items: center;
      padding: 8px 16px;
      border-radius: 980px;
      font-size: 13px;
      border: none;
      cursor: pointer;
      transition: 0.2s;
      background: var(--ft-bg-alt);
      color: var(--ft-sub);
    }

    #theme-freetoken .ft-pill:hover {
      color: var(--ft-txt);
    }

    #theme-freetoken .ft-pill.on {
      background: var(--ft-txt);
      color: var(--ft-bg);
    }

    #theme-freetoken .ft-tag {
      font-size: 11px;
      font-weight: 500;
      padding: 4px 11px;
      border-radius: 980px;
      background: var(--ft-bg-alt);
      color: var(--ft-sub);
    }

    #theme-freetoken .ft-tag-dot {
      display: inline-flex;
      align-items: center;
      gap: 5px;
    }

    #theme-freetoken .ft-tag-dot::before {
      content: '';
      width: 5px;
      height: 5px;
      border-radius: 50%;
    }

    #theme-freetoken .ft-tag-vision::before {
      background: #af52de;
    }

    #theme-freetoken .ft-tag-tools::before {
      background: var(--ft-green);
    }

    #theme-freetoken .ft-tag-reasoning::before {
      background: var(--ft-blue);
    }

    #theme-freetoken .ft-tag-stale {
      background: rgba(255, 149, 18, 0.14);
      color: var(--ft-amber);
      font-weight: 600;
    }

    #theme-freetoken .ft-search {
      display: flex;
      align-items: center;
      gap: 10px;
      background: var(--ft-bg-alt);
      border: 1px solid transparent;
      border-radius: 980px;
      padding: 9px 18px;
      transition: 0.2s;
    }

    #theme-freetoken .ft-search:focus-within {
      border-color: var(--ft-blue);
      background: var(--ft-card);
    }

    #theme-freetoken .ft-search input {
      flex: 1;
      min-width: 0;
      background: transparent;
      border: none;
      outline: none;
      font-size: 14px;
      color: var(--ft-txt);
    }

    #theme-freetoken .ft-search input::placeholder {
      color: var(--ft-faint);
    }

    #theme-freetoken .ft-search-btn {
      background: none;
      border: none;
      padding: 0;
      cursor: pointer;
      font-size: 14px;
      color: var(--ft-sub);
      transition: 0.2s;
    }

    #theme-freetoken .ft-search-btn:hover {
      color: var(--ft-txt);
    }

    ${themeConsoleStyle('freetoken', CONFIG, { rootId: 'theme-freetoken' })}
  `}</style>
)

export { Style }
