# obsidian-wechat-publish

Obsidian plugin for Markdown → WeChat Official Account publishing with "简约日记风" minimalist diary theme.

**Version**: v1.0.6 · **Tests**: 127 vitest (TDD-driven) · **License**: MIT

## Quick Start

```bash
npm install
npm run deploy -- <vault-root>    # e.g., npm run deploy -- H:/MyVault
npm run build                     # production build
```

## Architecture

```
Obsidian MD (.md)
  ↓ parseFrontmatter()       — strip YAML
  ↓ convertWikiLinks()       — ![[img]] → ![](img)
  ↓ mdUnescape()             — backslash escapes → placeholders
  ↓ LaTeX $...$              — placeholders
  ↓ preprocessCallouts()     — > [!TYPE] → <table> with lucide SVG icon
  ↓ markdown-it (+mark)       — MD → HTML
  ↓ restoreEscapes()          — placeholders → literal chars
  ↓ renderLatexSvg()         — LaTeX → SVG (Preview only)
  ↓
  ├── forCopy=true  → replaceImagesWithPlaceholders + LaTeX placeholder
  ├── forCopy=false → processImagesToBase64 + renderLatexSvg
  ↓
  ├── [Preview] → HTTP server → browser (dark mode @media preserved)
  └── [Copy]    → strip @media → juice inline → Electron clipboard
```

## Callout System

**内置类型**（8种，全部有 lucide SVG 图标）：
| 类型 | 图标 |
|------|------|
| note/info | lucide-info |
| tip | lucide-lightbulb |
| warning | lucide-alert-triangle |
| danger | lucide-flame |
| question | lucide-help-circle |
| example | lucide-flag |
| quote | lucide-quote |

**自定义类型**：从 `callout-manager` JSON 动态加载（color + lucide icon）

**CSS 调试经验**（详见 `~/.claude/skills/css-debugging/SKILL.md`）：
- 预览版和复制版**必须分别验证**
- WeChat 编辑器强制覆盖样式 → 用内联 `style="...!important"` 对抗
- regex 处理 CSS 时必须锚定到行首 `^\s*`

## Key Decisions

- **Copy path uses Electron native `clipboard.write({text, html})`** — Web Clipboard API caused WeChat editor hangs
- **Images/LaTeX use text placeholders in Copy mode** — `【图片：path】` / `【公式：formula】`
- **Callouts use `<table>` with inline styles** — WeChat strips `<div>` but preserves `<table>`
- **lucide icons via `import * as lucideStatic`** — runtime dynamic lookup, no hardcoded SVG map
- **WeChat CSS override: inline `!important`** — WeChat rich text editor injects `.js_darkmode__2 { background: rgb(...) !important }`; only inline style wins

## Testing

```bash
npx vitest run          # all tests
npx vitest run tests/   # specific test file
```

127 tests covering: callout rendering, alias resolution, dark mode CSS variables, lucide icon SVG output, CSS debugging, merge logic with real vault JSON.

## CSS Debugging Workflow

When reporting CSS issues, use this format:
```
【问题描述】[视觉描述]
【出问题的元素】[从 DevTools 复制的 HTML]
【异常样式的计算源】[哪个文件/哪行/哪个选择器]
【复现方式】预览版 / 复制版 / WeChat 编辑器
```
