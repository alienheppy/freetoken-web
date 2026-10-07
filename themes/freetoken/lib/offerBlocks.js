/**
 * 内嵌表（渠道）解析器：从 post.blockMap（与 NotionPage 同源的服务端数据）提取
 * 模型 Post 页自带 child_database / collection_view 表的行，供「免费获取渠道」渲染。
 *
 * 已实测的官方数据形状（Vercel 生产 blockMap）：
 *   blockMap = { block, collection, collection_view, collection_query, signed_urls }
 *   - collection(pointer.id=child_database 块id 8052) —— 需反向匹配 queries 顶层 key (真正的 collection id 80c9)
 *   - view.format.collection_pointer.id → collection 记录
 *   - view.page_sort = 行 page id 有序数组（顺序即用户 Notion 视图排序）
 *   - 行 properties: {RIg_:[['简介文字']], uQi\:[['https://…',[['a','https://…']]]], title:[['Kiraai']]}
 *
 * 纯函数、零额外请求。
 */

function unwrapEntry(entry) {
  if (!entry || typeof entry !== 'object') return null
  const v1 = entry.value
  if (v1 && typeof v1 === 'object' && v1.value && typeof v1.value === 'object') return v1.value
  if (v1 && typeof v1 === 'object') return v1
  return null
}

function mapSchemaKeys(schema) {
  const byName = {}
  for (const [key, def] of Object.entries(schema || {})) {
    const n = String(def?.name || '').trim()
    if (n) byName[n] = key
  }
  const pick = names => {
    for (const n of names) if (byName[n] != null) return byName[n]
    return null
  }
  return {
    name: pick(['名称', '平台', '供应商', 'name', 'title']),
    url: pick(['网址', '链接', '官网', 'url', 'link']),
    desc: pick(['供应商简介', '简介', '说明', '描述', 'desc']),
    context: pick(['上下文窗口', '上下文', 'context', 'contextLen', 'contextK']),
    baseUrl: pick(['baseUrl', 'base_url', 'apiBase', 'api', '接口地址', 'API地址']),
    guide: pick(['接入说明', '操作说明', '接入步骤', '步骤', 'guide', 'howto']),
    quota: pick(['免费额度', '额度', '免费福利', '福利', 'quota']),
    modelId: pick(['模型ID', '模型 ID', 'modelId', 'model_id', 'model'])
  }
}

function cellText(cell) {
  if (!Array.isArray(cell)) return ''
  let out = ''
  for (const seg of cell) {
    if (Array.isArray(seg) && typeof seg[0] === 'string') out += seg[0]
  }
  return out
}

function cellLink(cell) {
  if (!Array.isArray(cell)) return ''
  for (const seg of cell) {
    if (Array.isArray(seg)) {
      if (typeof seg[0] === 'string' && /^https?:\/\//i.test(seg[0])) return seg[0]
      const mods = seg[1]
      if (Array.isArray(mods)) {
        for (const m of mods) {
          if (Array.isArray(m) && m[0] === 'a' && typeof m[1] === 'string' && /^https?:\/\//i.test(m[1])) return m[1]
        }
      }
    }
  }
  return ''
}

function cellNumber(cell) {
  if (!Array.isArray(cell)) return 0
  const s = cellText(cell)
  const m = String(s).replace(/,/g, '').match(/(\d+(?:\.\d+)?)/)
  return m ? Number(m[1]) : 0
}

/**
 * 渠道行上下文窗口归一化（与 adaptModel.resolveContext 同口径）：
 * < 4096 视为 K 数（×1024），>= 4096 视为 tokens 原值。
 */
function normalizeRowContext(n) {
  if (!Number.isFinite(n) || n <= 0) return 0
  return n < 4096 ? n * 1024 : n
}

function rowToOffer(rowBlock, keys) {
  const props = rowBlock?.properties || {}
  const name = keys.name ? cellText(props[keys.name]) : ''
  const url = keys.url ? cellLink(props[keys.url]) : ''
  const desc = keys.desc ? cellText(props[keys.desc]) : ''
  const context = keys.context ? normalizeRowContext(cellNumber(props[keys.context])) : 0
  const baseUrl = keys.baseUrl ? cellText(props[keys.baseUrl]).trim() : ''
  const guide = keys.guide ? cellText(props[keys.guide]).trim() : ''
  const quota = keys.quota ? cellText(props[keys.quota]).trim() : ''
  const modelId = keys.modelId ? cellText(props[keys.modelId]).trim() : ''
  if (!name && !url && !desc) return null
  return {
    name: name || String(url || '').replace(/^https?:\/\/(?:www\.)?([^/]+).*$/, '$1'),
    url: /^https?:\/\//i.test(url) ? url : '',
    desc,
    context,
    baseUrl: /^https?:\/\//i.test(baseUrl) ? baseUrl : '',
    guide,
    quota,
    modelId,
    verified: true,
    verifiedAt: '',
    limits: desc
  }
}

/** 主入口：post.blockMap → 渠道行 */
export function collectOfferRows(blockMap) {
  try {
    if (!blockMap || typeof blockMap !== 'object') return []
    const blocks = blockMap.block || {}
    const collections = blockMap.collection || {}
    const views = blockMap.collection_view || {}
    const queries = blockMap.collection_query || {}
    if (!Object.keys(blocks).length) return []

    const isMainSchema = schema => {
      const names = Object.values(schema || {}).map(d => String(d?.name || ''))
      return names.includes('status') && names.includes('summary')
    }

    const out = []
    const seen = new Set()
    for (const viewEntry of Object.values(views)) {
      const view = unwrapEntry(viewEntry)
      if (!view?.format?.collection_pointer) continue
      const collectionId = view.format.collection_pointer.id
      if (!collectionId) continue

      const schema = unwrapEntry(collections[collectionId])?.schema
      if (!schema || isMainSchema(schema)) continue

      const keys = mapSchemaKeys(schema)
      // 行 id 顺序：view.page_sort 最优先（它就是用户视图顺序）
      let ids = Array.isArray(view.page_sort) ? view.page_sort : []
      // 兜底：collection_query —— pointer.id 可能 ≠ query key（child_database 块 id ≠ collection id）
      if (!ids.length) {
        for (const [queryKey, byView] of Object.entries(queries)) {
          if (!byView || typeof byView !== 'object') continue
          for (const viewKey of Object.keys(byView)) {
            const vq = unwrapEntry(byView[viewKey])
            const grp = vq?.collection_group_results || vq
            const bIds = grp?.blockIds
            if (Array.isArray(bIds !== undefined ? bIds : grp?.blockIds)) {
              ids = bIds || grp?.blockIds || []
              break
            }
            if (Array.isArray(grp?.blockIds)) { ids = grp.blockIds; break }
          }
          if (ids.length) break
        }
      }

      for (const id of ids) {
        if (seen.has(id)) continue
        const row = unwrapEntry(blocks[id])
        if (!row) continue
        seen.add(id)
        const offer = rowToOffer(row, keys)
        if (offer) out.push(offer)
      }
    }
    return out
  } catch (e) {
    return []
  }
}

/** 内嵌表/数据库块类型（这些内容由「免费获取渠道」渠道卡承载，正文不再重复渲染） */
const EMBEDDED_TABLE_TYPES = new Set([
  'collection_view',
  'collection_view_page',
  'child_database'
])

function blockValueOf(entry) {
  if (!entry || typeof entry !== 'object') return null
  const v1 = entry.value
  if (v1 && typeof v1 === 'object' && v1.value && typeof v1.value === 'object') return v1.value
  if (v1 && typeof v1 === 'object') return v1
  return null
}

/**
 * 正文渲染用：从 blockMap 中剔除内嵌明细表（collection_view / child_database）及其页容引用，
 * 使「详细说明」只剩模型级叙述文字（各提供商的渠道差异由渠道卡承载，避免与「免费获取渠道」重复）。
 *
 * 输入 blockMap 视为不可变，返回浅克隆；纯函数，坏值原样返回。
 * @param {object} blockMap
 * @returns {object} 新的 blockMap
 */
export function stripEmbeddedTables(blockMap) {
  try {
    if (!blockMap || typeof blockMap !== 'object') return blockMap
    const blocks = blockMap.block
    if (!blocks || typeof blocks !== 'object') return blockMap

    const removedIds = new Set()
    for (const [id, entry] of Object.entries(blocks)) {
      const b = blockValueOf(entry)
      if (b && EMBEDDED_TABLE_TYPES.has(b.type)) removedIds.add(id)
    }
    if (removedIds.size === 0) return blockMap

    const nextBlocks = {}
    for (const [id, entry] of Object.entries(blocks)) {
      if (removedIds.has(id)) continue
      const b = blockValueOf(entry)
      if (b && Array.isArray(b.content) && b.content.some(cid => removedIds.has(cid))) {
        const filtered = b.content.filter(cid => !removedIds.has(cid))
        let nextEntry = entry
        if (entry?.value?.value && typeof entry.value.value === 'object') {
          nextEntry = { ...entry, value: { ...entry.value, value: { ...entry.value.value, content: filtered } } }
        } else if (entry?.value && typeof entry.value === 'object') {
          nextEntry = { ...entry, value: { ...entry.value, content: filtered } }
        }
        nextBlocks[id] = nextEntry
      } else {
        nextBlocks[id] = entry
      }
    }

    return { ...blockMap, block: nextBlocks }
  } catch (e) {
    return blockMap
  }
}

/** 无标题也有意义的正文块类型（原设计正文可能只放这些） */
const MEDIA_BLOCK_TYPES = new Set([
  'image',
  'video',
  'code',
  'equation',
  'divider',
  'bookmark',
  'embed',
  'callout',
  'quote',
  'to_do',
  'toggle',
  'header',
  'sub_header',
  'sub_sub_header',
  'column_list',
  'column',
  'table_of_contents',
  'bulleted_list',
  'numbered_list'
])

function titleHasText(b) {
  const t = b?.properties?.title
  if (!Array.isArray(t)) return false
  return t.some(seg => Array.isArray(seg) && typeof seg[0] === 'string' && seg[0].trim())
}

/**
 * 剔除内嵌表后，正文是否还有可渲染内容。
 * 仅用于决定「详细说明」区块是否显示：模型页正文若只剩内嵌表（内容已由渠道卡承载），
 * 就不应出现一个只有标题的空板块。坏值一律返回 false。
 */
export function hasRenderableBody(blockMap) {
  try {
    const blocks = blockMap?.block
    if (!blocks || typeof blocks !== 'object') return false
    for (const entry of Object.values(blocks)) {
      const b = blockValueOf(entry)
      if (!b) continue
      if (b.type === 'page') continue
      if (EMBEDDED_TABLE_TYPES.has(b.type)) continue
      if (titleHasText(b)) return true
      if (MEDIA_BLOCK_TYPES.has(b.type)) return true
    }
    return false
  } catch (e) {
    return false
  }
}
