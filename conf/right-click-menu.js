/**
 * 网页右键点击后是否弹出自定义菜单
 *
 * 默认值取舍依据本站实际信息架构：
 * 本站只有「模型库 / 平台一览」两个区块，没有博客式的内容分类与标签，
 * 菜单里出现「博客分类 / 博客标签」会指向空页面，属于无效入口；
 * 「主题切换」会在多个官方主题间随机跳转，与本站固定苹果风视觉冲突；
 * 「复制」依赖划选文本，而页面正文本身可以正常划选复制，菜单项冗余。
 * 因此这四项默认关闭（仍可用同名环境变量置 true 重新打开）。
 */
module.exports = {
  CUSTOM_RIGHT_CLICK_CONTEXT_MENU:
    process.env.NEXT_PUBLIC_CUSTOM_RIGHT_CLICK_CONTEXT_MENU || true, // 自定义右键菜单，覆盖系统菜单
  CUSTOM_RIGHT_CLICK_CONTEXT_MENU_THEME_SWITCH:
    process.env.NEXT_PUBLIC_CUSTOM_RIGHT_CLICK_CONTEXT_MENU_THEME_SWITCH ||
    false, // 是否显示切换主题
  CUSTOM_RIGHT_CLICK_CONTEXT_MENU_DARK_MODE:
    process.env.NEXT_PUBLIC_CUSTOM_RIGHT_CLICK_CONTEXT_MENU_DARK_MODE || true, // 是否显示深色模式
  CUSTOM_RIGHT_CLICK_CONTEXT_MENU_SHARE_LINK:
    process.env.NEXT_PUBLIC_CUSTOM_RIGHT_CLICK_CONTEXT_MENU_SHARE_LINK || true, // 是否显示分享链接
  CUSTOM_RIGHT_CLICK_CONTEXT_MENU_RANDOM_POST:
    process.env.NEXT_PUBLIC_CUSTOM_RIGHT_CLICK_CONTEXT_MENU_RANDOM_POST || true, // 是否显示随机博客
  CUSTOM_RIGHT_CLICK_CONTEXT_MENU_CATEGORY:
    process.env.NEXT_PUBLIC_CUSTOM_RIGHT_CLICK_CONTEXT_MENU_CATEGORY || false, // 是否显示分类
  CUSTOM_RIGHT_CLICK_CONTEXT_MENU_TAG:
    process.env.NEXT_PUBLIC_CUSTOM_RIGHT_CLICK_CONTEXT_MENU_THEME_TAG || false, // 是否显示标签
  // 单独开关：只控制右键菜单里的「复制」入口，与站点级 CAN_COPY（是否禁止复制）解耦。
  // 若复用 CAN_COPY 关闭，会连带渲染 <DisableCopy/> 把全站划选复制一起禁掉。
  CUSTOM_RIGHT_CLICK_CONTEXT_MENU_COPY:
    process.env.NEXT_PUBLIC_CUSTOM_RIGHT_CLICK_CONTEXT_MENU_COPY || false // 是否显示复制页面选中文本
}
