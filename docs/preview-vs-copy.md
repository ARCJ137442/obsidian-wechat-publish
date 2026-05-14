# 预览版 vs 复制版

## 预览版 (Preview in Browser)

- **触发**：Obsidian `Ctrl+P` → `Preview in Browser`
- **输出**：完整 HTML 页面，包含 `<style>` 块，暗色模式 `@media (prefers-color-scheme: dark)`、手机/桌面切换、浅色/深色按钮
- **图片**：Base64 内嵌（本地 HTTP 服务可渲染）
- **公式**：通过 codecogs API 渲染为 SVG 图片
- **颜色**：`getRenderCSS()` 完整 CSS，`--callout-*` CSS 变量定义在 HTML 内联 style 中
- **目的**：发布前视觉验证——在浏览器里看效果好不好

## 复制版 (Copy to WeChat)

- **触发**：Obsidian `Ctrl+P` → `Copy to WeChat`
- **输出**：juice 内联 HTML（所有 CSS 转为 `style=""` 内联属性），通过 Electron 原生 Clipboard API 写入剪贴板
- **图片**：文本占位符 `【图片：path】`（Base64 会让微信编辑器卡死）
- **公式**：文本占位符 `【公式：LaTeX源码】`（微信预览会剥离 SVG）
- **颜色**：CSS 变量通过内联 style 传递（如 `--callout-title-color: #555`），`color` 声明被 `getCopyCSS()` 剥离以避免被微信 CSS 覆盖
- **WeChat CSS 覆盖问题**：微信 rich text editor 会注入 `.js_darkmode__2 { background: rgb(195,190,180) !important }` 等强制样式；解法是**内联 `style="background:transparent!important;padding:0!important"`** 直接写在元素上
- **目的**：生产发布——粘贴到微信公众号后台即可，无需额外处理

## 对比

| | 预览版 | 复制版 |
|------|--------|--------|
| CSS 方式 | `<style>` 块 + `@media` | juice 内联 `style=""` |
| 暗色模式 | `@media (prefers-color-scheme: dark)` + 手动按钮 | 微信自动管理（CSS 变量抗覆盖） |
| 图片 | Base64 渲染 | 文本占位符 |
| 公式 | SVG 渲染 | 文本占位符 |
| WeChat CSS 覆盖 | 不涉及 | 内联 `!important` 对抗 |
| 剪贴板 | 不涉及 | Electron 原生 API |

## 共享的渲染管线

两者共用 `processMarkdown()`——只有末尾岔开：

```
processMarkdown(md, path, forCopy?)
  │
  ├── forCopy=false → Preview
  │     ├── 图片：Base64
  │     ├── 公式：SVG
  │     └── CSS：getRenderCSS()
  │
  └── forCopy=true → Copy
        ├── 图片：占位符
        ├── 公式：占位符
        └── CSS：getCopyCSS()（剥离 color，内联 CSS 变量 + !important）
```

## WeChat 编辑器 CSS 覆盖的根因与解法

**根因**：微信 rich text editor 在粘贴后注入自己的 CSS 选择器（`.js_darkmode__2` 等），用 `!important` 强制覆盖背景和 padding。

**识别**：DevTools 检查元素的「样式」面板，看「计算源」下拉，找哪个文件/哪行/哪个选择器。

**解法优先级**：
1. 内联 `style="background:transparent!important;padding:0!important"` 写在目标元素上（唯一可靠手段）
2. CSS 类 `!important`（次选，但可能被微信 selector 覆盖）

**当前已内联的样式**：
- `.wechat-callout-title`：`padding:0!important;background:transparent!important`
