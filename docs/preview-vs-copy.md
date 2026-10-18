# 预览版 vs 复制版

## 预览版 (Preview in Browser)

- **触发**：Obsidian `Ctrl+P` → `Preview in Browser`
- **输出**：完整 HTML 页面，包含 `<style>` 块，暗色模式 `@media (prefers-color-scheme: dark)`、手机/桌面切换、浅色/深色按钮
- **图片**：Base64 内嵌（本地 HTTP 服务可渲染）
- **公式**：MathJax SVG（`<path>` 字形，rollup 打包 mathjax-full，无字体依赖）
- **颜色**：`getRenderCSS()` 完整 CSS，`--callout-*` CSS 变量定义在 HTML 内联 style 中
- **目的**：发布前视觉验证——在浏览器里看效果好不好

## 复制版 (Copy to WeChat)

- **触发**：Obsidian `Ctrl+P` → `Copy to WeChat`
- **输出**：juice 内联 HTML（所有 CSS 转为 `style=""` 内联属性）；桌面优先通过 Electron 原生 Clipboard API 写入，移动端或原生 API 不可用时使用 Web Clipboard API，同时写入 `text/html` 与 `text/plain`。默认直接复制；移动端若因用户激活限制直写失败，会自动打开统计模态框供按钮重试，也可主动开启“复制前弹窗预览”。
- **图片**：本地图片输出文件名行 `【图片：path】`；有 Obsidian 图注时在下一行保留图注（Base64 会让微信编辑器卡死）
- **公式**：MathJax SVG（`<path>` 字形，rollup 打包 mathjax-full，无字体依赖）
- **颜色**：CSS 变量通过内联 style 传递（如 `--callout-title-color: #555`），`color` 声明被 `getCopyCSS()` 剥离以避免被微信 CSS 覆盖
- **WeChat CSS 覆盖问题**：微信 rich text editor 会注入 `.js_darkmode__2 { background: rgb(195,190,180) !important }` 等强制样式；解法是**内联 `style="background:transparent!important;padding:0!important"`** 直接写在元素上
- **目的**：生产发布——粘贴到微信公众号后台即可，无需额外处理

### 复制 HTML 纯文本 (Copy HTML as Plain Text)

- **触发**：`Ctrl+P` → `Copy HTML as Plain Text (复制 HTML 纯文本)`
- **输出**：与复制版富文本相同的 juice 内联 HTML 片段，但通过纯文本剪贴板写入；默认直接复制，开启“复制前弹窗预览”后由统计模态框按钮触发；不复制去掉标签后的可读文本
- **目的**：跨平台访问复制版 HTML，粘贴到文本编辑器后保存为 `.html`

### 复制前弹窗预览

- 设置项：`Preview before copying (复制前弹窗预览)`，默认关闭，同时作用于上述两个复制命令。
- 开启后只显示统计信息：正文总字数、要复制的内容类型、HTML 字符数与 UTF-8 大小；富文本和 HTML 纯文本使用同一统计结构。
- 关闭时不增加确认步骤，直接执行复制；移动端 WebView 若因异步用户激活拒绝直复制，会自动进入按钮重试路径。

## 对比

| | 预览版 | 复制版 |
|------|--------|--------|
| CSS 方式 | `<style>` 块 + `@media` | juice 内联 `style=""`，仅移除 `prefers-color-scheme` media |
| 暗色模式 | `@media (prefers-color-scheme: dark)` + 手动按钮 | 微信自动管理（CSS 变量抗覆盖） |
| 图片 | Base64 渲染 | 文件名占位符 + 可选图注 |
| 公式 | MathJax SVG (`<path>` 字形) | MathJax SVG (`<path>` 字形) |
| WeChat CSS 覆盖 | 不涉及 | 内联 `!important` 对抗 |
| 剪贴板 | 不涉及 | Electron 原生 API |

## 共享的渲染管线

两者共用 `processMarkdown()`——只有末尾岔开：

```
processMarkdown(md, path, forCopy?)
  │
  ├── forCopy=false → Preview
  │     ├── 图片：Base64
  │     ├── 公式：MathJax SVG（<path> 字形，无字体依赖）
  │     └── CSS：getRenderCSS()
  │
  └── forCopy=true → Copy
        ├── 图片：占位符
        ├── 公式：MathJax SVG（<path> 字形，无字体依赖）
        └── CSS：getCopyCSS()（剥离 color，内联 CSS 变量 + !important）
```

公式渲染必须保持在共享管线里：`forCopy` 只决定图片处理和 CSS/剪贴板管线，不再决定公式引擎。旧 Preview 路径曾用正则截取 KaTeX 的 `.katex-html` 片段，会在嵌套 `<span>` 中提前停止，导致 `$L^AT_EX$` 只显示 `LA`。

## WeChat 编辑器 CSS 覆盖的根因与解法

**根因**：微信 rich text editor 在粘贴后注入自己的 CSS 选择器（`.js_darkmode__2` 等），用 `!important` 强制覆盖背景和 padding。

**识别**：DevTools 检查元素的「样式」面板，看「计算源」下拉，找哪个文件/哪行/哪个选择器。

**解法优先级**：
1. 内联 `style="background:transparent!important;padding:0!important"` 写在目标元素上（唯一可靠手段）
2. CSS 类 `!important`（次选，但可能被微信 selector 覆盖）

**当前已内联的样式**：
- `.wechat-callout-title`：`padding:0!important;background:transparent!important`
