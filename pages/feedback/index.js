import BLOG from '@/blog.config'
import { siteConfig } from '@/lib/config'
import { fetchGlobalAllData } from '@/lib/db/SiteDataApi'
import { DynamicLayout } from '@/themes/theme'

const Feedback = props => {
  const theme = siteConfig('THEME', BLOG.THEME, props.NOTION_CONFIG)
  return <DynamicLayout theme={theme} layoutName='LayoutFeedback' {...props} />
}

export async function getStaticProps({ locale }) {
  const props = await fetchGlobalAllData({ from: 'feedback', locale })
  delete props.allPages
  return {
    props: {
      ...props,
      turnstileSiteKey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ''
    },
    revalidate: process.env.EXPORT
      ? undefined
      : siteConfig(
          'NEXT_REVALIDATE_SECOND',
          BLOG.NEXT_REVALIDATE_SECOND,
          props.NOTION_CONFIG
        )
  }
}

export default Feedback
