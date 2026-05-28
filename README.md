# obsidian-wechat-publish

[![Obsidian Plugin](https://img.shields.io/badge/Obsidian-Plugin-9654b5)](https://obsidian.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-purple.svg)](https://opensource.org/licenses/MIT)

One-click copy Markdown from Obsidian to WeChat Official Account with **"简约日记风"** minimalist diary theme.

---

## Features

- **One-click copy** — `Ctrl+P` → `Copy to WeChat` → paste in WeChat editor
- **8 built-in callout types** with lucide SVG icons (note, tip, warning, danger, question, example, quote, info)
- **Custom callout types** via `callout-manager.json` with custom colors and icons
- **Callout inline markdown** — bold, italic, highlight, lists, code blocks, tables inside callouts
- **Math rendering** — LaTeX rendered as SVG in preview; placeholder text in copy mode
- **Dark mode** — respects `prefers-color-scheme`, manual toggle in preview
- **WeChat-safe copy** — CSS inlined via juice; transparent backgrounds and `!important` padding对抗微信编辑器 CSS 覆盖

## Theme: 简约日记风

Design philosophy: let the text speak. No decorative colors on headings, just whitespace and typography.

| Parameter | Value |
|-----------|-------|
| Body font | PingFang SC, 17px, line-height 1.75 |
| Text color | rgba(0,0,0,0.9) |
| H1/H2 | 22px / 19px, font-weight 600, no color decoration |
| Blockquote | 15px, left 3px #dbdbdb, semi-transparent |
| Images | Full-width, centered, no border/radius/shadow |

## Architecture

```
Obsidian MD
  ↓ parseFrontmatter()       — strip YAML
  ↓ convertWikiLinks()        — ![[img]] → ![](img)
  ↓ mdUnescape()              — backslash escapes → placeholders
  ↓ LaTeX $...$              — placeholders
  ↓ preprocessCallouts()      — > [!TYPE] → <!--CALLOUT_START:type--> + markdown
  ↓ markdown-it (+mark)       — MD → HTML (callout body 内的 markdown 被解析)
  ↓ postprocessCallouts()     — <!--CALLOUT_START--> → <table> with lucide SVG icon
  ↓ restoreEscapes()          — placeholders → literal chars
  ↓ renderLatexSvg()          — LaTeX → SVG (Preview only)
  ↓
  ├── forCopy=true  → replaceImages + LaTeX placeholder + juice inline
  └── forCopy=false → Base64 images + SVG LaTeX + <style> block
```

## Install

### Manual

1. `npm install`
2. `npm run build`
3. Copy `main.js`, `manifest.json`, `styles.css` to vault `.obsidian/plugins/obsidian-wechat-publish/`
4. Reload Obsidian and enable plugin

### Deploy to vault

```bash
npm run deploy -- <vault-root>
```

Example: `npm run deploy -- H:/MyVault`

## Commands

| Command | Description |
|---------|-------------|
| `Preview in Browser` | Open rendered HTML in browser for visual verification |
| `Copy to WeChat` | Copy WeChat-safe HTML to clipboard, ready to paste |

## CSS Debugging

WeChat rich text editor injects `.js_darkmode__2 { background: rgb(195,190,180) !important }` that overrides callout backgrounds. The copy mode handles this via **inline `style="background:transparent!important;padding:0!important"`** on callout title elements.

When reporting CSS issues, use DevTools to inspect the element → check Styles/Computed → trace the computed source → send the HTML snippet + CSS rule to an agent.

See `docs/preview-vs-copy.md` for the full comparison of preview vs copy rendering pipelines.

## Tests

```bash
npx vitest run          # all 161 tests
npx vitest run tests/   # specific file
```

## Tech Stack

- [TypeScript](https://www.typescriptlang.org/) + [vitest](https://vitest.dev/)
- [markdown-it](https://github.com/markdown-it/markdown-it) + [markdown-it-mark](https://github.com/markdown-it/markdown-it-mark)
- [juice](https://github.com/Automattic/juice) — CSS inlining
- [lucide-static](https://github.com/lucide-icons/lucide) — SVG icons

## License

[MIT](LICENSE)
