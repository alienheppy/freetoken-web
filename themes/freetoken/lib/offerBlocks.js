/**
 * 渠道解析器（主题侧薄封装）。
 *
 * 实现已上移到共享契约层 `@/lib/freetoken/offerBlocks`：
 * 站点数据装配（首页平台统计）与主题渲染必须消费同一份解析逻辑，
 * 否则「平台卡片模型数」与「详情页渠道清单」会各算各的、对不上。
 * 此处仅 re-export，保持主题内既有引用路径（'../lib/offerBlocks'）不变。
 */

export {
  normalizePlatformProfiles,
  applyPlatformProfiles,
  collectOfferRows,
  collectOfferPlatformNames,
  stripEmbeddedTables,
  hasRenderableBody
} from '@/lib/freetoken/offerBlocks'
