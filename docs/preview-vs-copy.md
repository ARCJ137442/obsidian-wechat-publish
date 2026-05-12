# 预览版 vs 复制版

## 预览版 (Preview in Browser)

- **触发**：Obsidian `Ctrl+P` → `Preview in Browser`
- **输出**：完整 HTML 页面，包含 `<style>` 块、暗色模式 `@media`、手机/桌面切换、浅色/深色按钮
- **图片**：Base64 内嵌（本地 HTTP 服务可渲染）
- **公式**：通过 codecogs API 渲染为 SVG 图片
- **颜色**：`getRenderCSS()` 完整 CSS，带 `@media (prefers-color-scheme: dark)` 暗色规则
- **目的**：发布前视觉验证——在浏览器里看效果好不好

## 复制版 (Copy to WeChat)

- **触发**：Obsidian `Ctrl+P` → `Copy to WeChat`
- **输出**：juice 内联 HTML（所有 CSS 转为 `style=""` 内联属性），通过 Electron 原生 Clipboard API 写入剪贴板
- **图片**：文本占位符 `【图片：path】`（Base64 会让微信编辑器卡死）
- **公式**：文本占位符 `【公式：LaTeX源码】`（微信预览会剥离 SVG，图片粘贴不可行）
- **颜色**：`getCopyCSS()` 剥离所有 `color:` 属性，让微信自己管理文字颜色（浅色/暗色自动适配）
- **目的**：生产发布——粘贴到微信公众号后台即可，无需额外处理

## 对比

| | 预览版 | 复制版 |
|------|--------|--------|
| CSS 方式 | `<style>` 块 + `@media` | juice 内联 `style=""` |
| 暗色模式 | 手动按钮 + 系统检测 | 微信自动管理 |
| 图片 | Base64 渲染 | 文本占位符 |
| 公式 | SVG 渲染 | 文本占位符 |
| 文字颜色 | CSS 规则 | 剥离→微信接管 |
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
        └── CSS：getCopyCSS()（剥离 color）
```
