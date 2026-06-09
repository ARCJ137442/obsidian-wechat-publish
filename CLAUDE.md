# obsidian-wechat-publish

Obsidian plugin for Markdown → WeChat Official Account publishing with "简约日记风" minimalist diary theme.

**Version**: v1.0.6 · **Tests**: vitest suite (TDD-driven) · **License**: MIT

## Quick Start

```bash
npm install
npm run deploy -- <vault-root>    # e.g., npm run deploy -- H:/MyVault
npm run build                     # production build
```

## Development Rules

### Deploy only after testing

**先测试，后部署。** 部署到 Obsidian vault 之前，目标功能必须先在本地验证通过：

1. `npx vitest run` — 单元测试全通过
2. 目标功能在 Node.js 环境中实际运行（如 `node -e "const {tex2svg} = require('./mathjax-svg.js'); console.log(tex2svg('E=mc^2'))"`）
3. 确认输出格式正确后，再 `npm run deploy`

**Why:** 部署后发现问题是最高成本的调试路径（需要重载 Obsidian + 手动操作验证），而在 Node.js 中验证只需要几秒钟。

### Build pipeline

项目使用混合构建：
- **esbuild**: 主插件 `src/main.ts` → `main.js`（排除 `mathjax-full`）
- **rollup**: MathJax SVG 模块 `src/mathjax-svg.ts` → `mathjax-svg.js`（需要 `commonjs()` 插件保留 MathJax 全局状态）
- **@rollup/plugin-replace**: 替换 `PACKAGE_VERSION` 防止 MathJax 的 `eval('require')` 在 Electron 环境中执行

修改 MathJax 相关代码后，需要验证 rollup 构建：
```bash
node scripts/build-mathjax-svg.mjs  # 单独构建 mathjax-svg.js
node -e "const {tex2svg} = require('./mathjax-svg.js'); console.log(tex2svg('x^2').includes('<path>'))"
```

### Module loading

`mathjax-svg.js` 是独立文件，运行时通过 `require(absolutePath)` 动态加载（不能用相对路径，Electron 的 `__dirname` 指向 Obsidian 安装目录而非插件目录）。

## Architecture

```
Obsidian MD (.md)
  ↓ parseFrontmatter()       — strip YAML
  ↓ convertWikiLinks()       — ![[img]] → ![](img)
  ↓ LaTeX $...$              — placeholders
  ↓ mdUnescape()             — backslash escapes → placeholders
  ↓ preprocessCallouts()     — > [!TYPE] → <!--CALLOUT_START:type--> + markdown
  ↓ markdown-it (+mark)       — MD → HTML (callout body parsed)
  ↓ postprocessCallouts()    — <!--CALLOUT_START--> → <table> with lucide SVG icon
  ↓ restoreEscapes()          — placeholders → literal chars
  ↓ MathJax SVG              — shared Preview/Copy formula renderer
  ↓
  ├── [Preview] → processImagesToBase64 → HTTP server → browser
  └── [Copy]    → replaceImagesWithPlaceholders → strip @media → juice inline → Electron clipboard
```

## Callout System

**内置类型**（8种，全部有 lucide SVG 图标）：
| 类型 | 图标 |
|------|------|
| note/info | lucide-pencil / lucide-info |
| tip | lucide-flame |
| warning | lucide-alert-triangle |
| danger | lucide-zap |
| question | lucide-help-circle |
| example | lucide-list |
| quote | lucide-quote |

**自定义类型**：从 `callout-manager` JSON 动态加载（color + lucide icon）

**Callout 内部 Markdown 支持**：
- 行内语法：粗体、斜体、高亮、行内代码、链接
- 块级语法：列表、表格、代码块
- 标题中的 markdown 语法也被支持

**CSS 调试经验**（详见 `~/.claude/skills/css-debugging/SKILL.md`）：
- 预览版和复制版**必须分别验证**
- WeChat 编辑器强制覆盖样式 → 用内联 `style="...!important"` 对抗
- regex 处理 CSS 时必须锚定到行首 `^\s*`

## Key Decisions

- **Copy path uses Electron native `clipboard.write({text, html})`** — Web Clipboard API caused WeChat editor hangs
- **Images use text placeholders in Copy mode** — `【图片：path】`（Base64 导致微信编辑器卡死）
- **LaTeX uses shared MathJax SVG in Preview and Copy** — rollup 打包 mathjax-full，输出 `<path>` 元素的自包含 SVG；`forCopy` 只决定图片和 CSS 管线
- **Callouts use `<table>` with inline styles** — WeChat strips `<div>` but preserves `<table>`
- **lucide icons via `import * as lucideStatic`** — runtime dynamic lookup, no hardcoded SVG map
- **WeChat CSS override: inline `!important`** — only inline style wins against `.js_darkmode__2`

## Testing

```bash
npx vitest run          # all tests
npx vitest run tests/   # specific test file
```

The vitest suite covers: callout rendering, callout inline styles (bold/italic/highlight/lists/code), alias resolution, dark mode CSS variables, lucide icon SVG output, LaTeX SVG regressions, CSS debugging, merge logic with real vault JSON.

## CSS Debugging Workflow

When reporting CSS issues, use this format:
```
【问题描述】[视觉描述]
【出问题的元素】[从 DevTools 复制的 HTML]
【异常样式的计算源】[哪个文件/哪行/哪个选择器]
【复现方式】预览版 / 复制版 / WeChat 编辑器
```
