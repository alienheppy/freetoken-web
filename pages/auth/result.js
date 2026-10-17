/**
 * OAuth 结果页只接收粗粒度状态，不渲染 Token、工作区 ID 或用户资料。
 * 用 getServerSideProps 读取查询参数，避免静态页在客户端接管前先渲染错误状态。
 * @returns
 */
const AuthResult = ({ success, message }) => {
  return (
    <div className='detail'>
      <div className='hero'>
        <div className='eyebrow'>Notion 授权</div>
        <h1>{success ? '授权成功。' : '授权未完成。'}</h1>
        <div className='herosub'>
          {success
            ? '已完成 Notion 授权。'
            : message || '请返回后重新发起授权。'}
        </div>
        <div className='cta'>
          <a href='/' className='btn btn-primary'>
            返回首页
          </a>
        </div>
      </div>
    </div>
  )
}

export const getServerSideProps = async ({ query, res }) => {
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('Referrer-Policy', 'no-referrer')

  const success = query?.status === 'success'
  const message =
    typeof query?.message === 'string' ? query.message.slice(0, 160) : ''

  // Next serializes the route query into __NEXT_DATA__. Replace it with a
  // sanitized query so malformed/legacy callbacks cannot expose extra values.
  query.status = success ? 'success' : 'error'
  query.message = message
  Object.keys(query).forEach(key => {
    if (key !== 'status' && key !== 'message') delete query[key]
  })
  if (query.message === '') delete query.message

  return {
    props: {
      success,
      message,
      // SmartLink preserves the current query on internal links. Clear it so
      // arbitrary callback parameters cannot leak through the global nav.
      authResultQuery: success
        ? { status: 'success' }
        : { status: 'error', message }
    }
  }
}

export default AuthResult
