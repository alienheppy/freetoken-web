/**
 * Freetoken 页脚
 */
export default function Footer({ siteInfo }) {
  return (
    <footer className='border-t border-[var(--ft-hairline)] bg-[var(--ft-bg-alt)] mt-20'>
      <div className='ft-container py-8 text-xs text-[var(--ft-faint)] leading-relaxed'>
        <div>
          {siteInfo?.title || 'FreeTokenHub'} 汇总各平台免费大模型信息。免费额度随时可能调整，请以各平台官方页面为准。
        </div>
        <div className='h-px bg-[var(--ft-hairline)] my-3' />
        <div>
          数据由 Notion 后台同步 · 技术基座 NotionNext
        </div>
      </div>
    </footer>
  )
}
