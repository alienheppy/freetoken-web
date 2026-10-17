import {
  buildOAuthResultUrl,
  exchangeNotionOAuthCode
} from '@/lib/auth/notion-oauth'

const UI = () => null

/**
 * 服务端接收参数处理
 * @param {*} ctx
 * @returns
 */
export const getServerSideProps = async ctx => {
  const code = Array.isArray(ctx.query.code)
    ? ctx.query.code[0]
    : ctx.query.code
  const result = await exchangeNotionOAuthCode(code)
  ctx.res.setHeader('Cache-Control', 'no-store')
  ctx.res.setHeader('Referrer-Policy', 'no-referrer')
  return {
    redirect: {
      destination: buildOAuthResultUrl(result),
      permanent: false
    }
  }
}

export default UI
