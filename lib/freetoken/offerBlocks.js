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
  if (v1 && typeof v1 === 'object' && v1.value && typeof v1.value === 'object')
    return v1.value
  if (v1 && typeof v1 === 'object') return v1
  return null
}

/**
 * collection_query 行 id 提取（兜底路径）。
 *
 * collection_query 的形状在服务端序列化后并不稳定：
 *   - 视图查询：{ [collectionId]: { [viewId]: { collection_group_results: { blockIds } } } }
 *   - 有时会被包一层 / 两层 { value: ... }（与 collection / collection_view 一致）
 * 早先只走 unwrapEntry，对「无 value 包装」的最常见形状会返回 null，
 * 导致 page_sort 为空的内嵌表（新建的空白视图）完全解析不出行。
 * 这里在多个层级上探测 collection_group_results，任一命中即返回 blockIds。
 */
function queryBlockIds(entry) {
  const candidates = [entry, entry?.value, entry?.value?.value]
  for (const c of candidates) {
    if (!c || typeof c !== 'object') continue
    const grp = c.collection_group_results || c
    if (grp && Array.isArray(grp.blockIds)) return grp.blockIds
  }
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
    context: pick([
      '上下文窗口',
      '上下文',
      'context',
      'contextLen',
      'contextK'
    ]),
    baseUrl: pick([
      'baseUrl',
      'base_url',
      'apiBase',
      'api',
      '接口地址',
      'API地址'
    ]),
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
      if (typeof seg[0] === 'string' && /^https?:\/\//i.test(seg[0]))
        return seg[0]
      const mods = seg[1]
      if (Array.isArray(mods)) {
        for (const m of mods) {
          if (
            Array.isArray(m) &&
            m[0] === 'a' &&
            typeof m[1] === 'string' &&
            /^https?:\/\//i.test(m[1])
          )
            return m[1]
        }
      }
    }
  }
  return ''
}

function cellNumber(cell) {
  if (!Array.isArray(cell)) return 0
  const s = cellText(cell)
  const m = String(s)
    .replace(/,/g, '')
    .match(/(\d+(?:\.\d+)?)/)
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

/**
 * 标签字段归一：接受数组（select/multi_select 解析结果）或逗号拼接字符串，
 * 去空白 / 去空值 / 去重；坏值一律丢弃（不抛异常）。
 */
function normalizeStringList(value) {
  const raw = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(',')
      : []
  const out = []
  for (const item of raw) {
    if (typeof item !== 'string') continue
    const s = item.trim()
    if (!s || s === '__NO__' || out.includes(s)) continue
    out.push(s)
  }
  return out
}

function rowToOffer(rowBlock, keys) {
  const props = rowBlock?.properties || {}
  const name = keys.name ? cellText(props[keys.name]) : ''
  const url = keys.url ? cellLink(props[keys.url]) : ''
  const desc = keys.desc ? cellText(props[keys.desc]) : ''
  const context = keys.context
    ? normalizeRowContext(cellNumber(props[keys.context]))
    : 0
  const baseUrl = keys.baseUrl ? cellText(props[keys.baseUrl]).trim() : ''
  const guide = keys.guide ? cellText(props[keys.guide]).trim() : ''
  const quota = keys.quota ? cellText(props[keys.quota]).trim() : ''
  const modelId = keys.modelId ? cellText(props[keys.modelId]).trim() : ''
  if (!name && !url && !desc) return null
  return {
    name:
      name ||
      String(url || '').replace(/^https?:\/\/(?:www\.)?([^/]+).*$/, '$1'),
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

/** 平台名归一（作为 join 键）：去空白 + 小写，坏值 → '' */
function normalizePlatformKey(name) {
  return typeof name === 'string' ? name.trim().toLowerCase() : ''
}

/**
 * 平台名列表归一：数组或逗号/顿号分隔字符串 → trim、大小写不敏感去重，
 * 保留首次出现的展示值。与 normalizePlatformKey 的 join 口径一致。
 */
function normalizePlatformList(value) {
  const raw = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(/[,，、]/)
      : []
  const out = []
  const seen = new Set()
  for (const item of raw) {
    if (typeof item !== 'string') continue
    const name = item.trim()
    const key = normalizePlatformKey(name)
    if (!key || seen.has(key)) continue
    seen.add(key)
    out.push(name)
  }
  return out
}

function samePlatformSet(a, b) {
  const left = normalizePlatformList(a).map(normalizePlatformKey)
  const right = normalizePlatformList(b).map(normalizePlatformKey)
  if (left.length !== right.length) return false
  const rightSet = new Set(right)
  return left.every(name => rightSet.has(name))
}

/**
 * 选择模型行的平台归属事实来源。
 *
 * 正文渠道表解析出非空平台名时，以渠道表为准（覆盖旧 ext.platforms 的漏填/错填）；
 * 解析不到时才保留旧值。changed 仅用于提示旧字段存在但与渠道表漂移，
 * 比较口径忽略大小写、首尾空白与重复项；旧字段为空属于正常回填，不算漂移。
 *
 * @param {{channelPlatforms?: unknown, existingPlatforms?: unknown}} param0
 * @returns {{platforms: unknown, fromChannelTable: boolean, changed: boolean}}
 */
export function selectOfferPlatformOwnership({
  channelPlatforms,
  existingPlatforms
} = {}) {
  const fromChannel = normalizePlatformList(channelPlatforms)
  if (fromChannel.length === 0) {
    return {
      platforms: existingPlatforms,
      fromChannelTable: false,
      changed: false
    }
  }
  return {
    platforms: fromChannel,
    fromChannelTable: true,
    changed:
      normalizePlatformList(existingPlatforms).length > 0 &&
      !samePlatformSet(fromChannel, existingPlatforms)
  }
}

/** 渠道表回填只处理已发布的 Post 行（Draft/Invisible/其它 type 不参与统计）。 */
export function isPublishedPostPage(page) {
  return Boolean(
    page && page.type === 'Post' && page.status === 'Published' && page.id
  )
}

/**
 * 「平台档案」（type=Platform 的主库行，由 SiteDataApi 注入）→ join 用的强类型档案对象。
 * 兼容两种形状：
 *   - 归一化后：{ name, url, baseUrl, desc, intro, quota, guide, context, certifications }
 *   - 主库原始行：{ title, 网址, baseUrl, 供应商简介, 平台简介100字介绍, 免费额度, 接入说明, 上下文, 平台认证 }
 * 纯函数，坏值一律丢弃（不抛异常）。
 * @param {Array} list
 * @returns {Array<{name:string,url:string,baseUrl:string,desc:string,intro:string,quota:string,guide:string,context:number,certifications:string[]}>}
 */
export function normalizePlatformProfiles(list) {
  if (!Array.isArray(list)) return []
  const out = []
  for (const raw of list) {
    if (!raw || typeof raw !== 'object') continue
    const name = String(raw.name || raw.title || '').trim()
    if (!name) continue
    const url = String(raw.url || raw['网址'] || '').trim()
    const baseUrl = String(raw.baseUrl || raw['baseUrl'] || '').trim()
    const desc = String(raw.desc || raw['供应商简介'] || '').trim()
    const intro = String(raw.intro || raw['平台简介100字介绍'] || '').trim()
    const quota = String(raw.quota || raw['免费额度'] || '').trim()
    const guide = String(raw.guide || raw['接入说明'] || '').trim()
    const context = normalizeRowContext(
      Number(
        raw.context != null
          ? raw.context
          : raw['上下文'] != null
            ? raw['上下文']
            : 0
      )
    )
    // 「平台认证」多选标签：归一化对象用 certifications，主库原始行用中文键；
    // 兼容 select 被 getPageProperties 拆成的数组与多选逗号拼接的字符串。
    const certSource =
      raw.certifications != null ? raw.certifications : raw['平台认证']
    const certifications = normalizeStringList(certSource)
    out.push({
      name,
      url: /^https?:\/\//i.test(url) ? url : '',
      baseUrl: /^https?:\/\//i.test(baseUrl) ? baseUrl : '',
      desc,
      intro,
      quota,
      guide,
      context,
      certifications
    })
  }
  return out
}

/**
 * 方案A：平台/模型解耦的 join。
 *
 * 模型页内嵌明细表的一行只需写「平台名」（+ 可选模型 ID / 覆盖值）；
 * 平台级字段（网址 / base_url / 简介 / 免费额度 / 接入说明 / 上下文）录一次到
 * 「平台档案」（type=Platform 行），此处按平台名回填。
 *
 * 覆盖规则：行级值优先——某行自己填了 base_url 就不再被平台档案覆盖，
 * 因此老数据（每行重复写平台字段）行为完全不变，新数据可以只写平台名。
 * 纯函数，不修改入参。
 * @param {Array} rows collectOfferRows 输出
 * @param {Array} profiles normalizePlatformProfiles 输出（或主库原始行）
 * @returns {Array} 新的渠道行数组
 */
export function applyPlatformProfiles(rows, profiles) {
  const list = Array.isArray(rows)
    ? rows.filter(r => r && typeof r === 'object')
    : []
  if (list.length === 0) return []
  const dict = new Map()
  for (const p of normalizePlatformProfiles(profiles)) {
    const key = normalizePlatformKey(p.name)
    if (key && !dict.has(key)) dict.set(key, p)
  }
  if (dict.size === 0) return list.map(r => ({ ...r }))
  return list.map(row => {
    const profile = dict.get(normalizePlatformKey(row.name))
    if (!profile) return { ...row }
    const pick = (own, fallback) => {
      const s = typeof own === 'string' ? own.trim() : own
      if (s !== '' && s != null) return own
      return fallback
    }
    const merged = {
      ...row,
      url: pick(row.url, profile.url),
      baseUrl: pick(row.baseUrl, profile.baseUrl),
      desc: pick(row.desc, profile.desc),
      quota: pick(row.quota, profile.quota),
      guide: pick(row.guide, profile.guide),
      context: row.context > 0 ? row.context : profile.context,
      platformProfile: profile
    }
    merged.limits = merged.desc
    return merged
  })
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
      // 行 id 有两个来源，必须取并集（缺一不可）：
      //   1) view.page_sort —— 用户视图顺序，但它只是「已加载顺序」快照，会滞后/缺行。
      //      实测 DeepSeek V4 Flash / V4.1 Flash 的 Apinex 渠道行不在 page_sort 里，
      //      只出现在 collection_query.blockIds 中；早先「page_sort 非空就不再读查询结果」
      //      导致这些行被静默丢弃（平台统计少算：Apinex 实测 9 个模型只数到 7 个）。
      //   2) collection_query.blockIds —— 查询结果，是完整且权威的行清单。
      // 顺序上仍以 page_sort 为先（保住用户视图顺序），再用查询结果补齐其余行。
      // 查询顶层 key 通常是 collection id，内层 key 是 view id；优先按本视图精确匹配，
      // 再退到本 collection 的其它视图，最后才全表兜底（child_database 块 id 有时 ≠ collection id）。
      const idLists = []
      if (Array.isArray(view.page_sort) && view.page_sort.length) {
        idLists.push(view.page_sort)
      }
      const exact = queryBlockIds(queries[collectionId]?.[view.id])
      if (exact && exact.length) idLists.push(exact)
      if (idLists.length === 0) {
        const byCollection = queries[collectionId]
        if (byCollection && typeof byCollection === 'object') {
          for (const entry of Object.values(byCollection)) {
            const hit = queryBlockIds(entry)
            if (hit && hit.length) {
              idLists.push(hit)
              break
            }
          }
        }
      }
      if (idLists.length === 0) {
        for (const byView of Object.values(queries)) {
          if (!byView || typeof byView !== 'object') continue
          for (const entry of Object.values(byView)) {
            const hit = queryBlockIds(entry)
            if (hit && hit.length) {
              idLists.push(hit)
              break
            }
          }
          if (idLists.length) break
        }
      }
      // 并集（page_sort 先行），去重后按序处理
      const ids = []
      const idSeen = new Set()
      for (const list of idLists) {
        for (const id of list) {
          if (idSeen.has(id)) continue
          idSeen.add(id)
          ids.push(id)
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

/**
 * 平台名提取（首页统计用）：post.blockMap → 该模型内嵌渠道子表里的平台名去重数组。
 *
 * 与 collectOfferRows 同源同口径：同一份解析、同一个 join 键（名称列）。
 * 首页「平台收录 / 每平台模型数」必须由真实渠道子表派生，
 * 不能依赖主库 ext.platforms（手工维护时极易漏填，导致统计恒为 0）。
 *
 * 纯函数、零额外请求；坏值/无渠道表 → []。
 * @param {object} blockMap post.blockMap
 * @returns {string[]} 平台名（去空、去重，保持出现顺序）
 */
export function collectOfferPlatformNames(blockMap) {
  const names = []
  for (const row of collectOfferRows(blockMap)) {
    const name = typeof row?.name === 'string' ? row.name.trim() : ''
    if (name) names.push(name)
  }
  return normalizePlatformList(names)
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
  if (v1 && typeof v1 === 'object' && v1.value && typeof v1.value === 'object')
    return v1.value
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
      if (
        b &&
        Array.isArray(b.content) &&
        b.content.some(cid => removedIds.has(cid))
      ) {
        const filtered = b.content.filter(cid => !removedIds.has(cid))
        let nextEntry = entry
        if (entry?.value?.value && typeof entry.value.value === 'object') {
          nextEntry = {
            ...entry,
            value: {
              ...entry.value,
              value: { ...entry.value.value, content: filtered }
            }
          }
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
  return t.some(
    seg => Array.isArray(seg) && typeof seg[0] === 'string' && seg[0].trim()
  )
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
