# obsidian-wechat-publish

Obsidian plugin for Markdown → WeChat Official Account publishing with "简约日记风" minimalist diary theme.

**Version**: v0.3 · **Tests**: 24 vitest · **License**: MIT (forked from tinyking/obsidian-wechat-publish)

## Quick Start

```bash
npm install
npm run deploy -- <vault-path>   # e.g., npm run deploy -- H:/MyVault
npm run deploy                    # defaults to life-series vault
```

## Complementary: WeDown + Custom CSS

For users who don't need LaTeX / callout / highlight support, a lighter alternative exists:
- `C:\Users\56506\我们的样式（准备对齐WeDown）.css` — paste into WeDown settings
- WeDown handles Markdown → HTML rendering; we only provide the CSS theme
- Both schemes (plugin + WeDown) are maintained in parallel

## Architecture

```
Obsidian MD (.md)
  ↓ parseFrontmatter()       — strip YAML
  ↓ convertWikiLinks()       — ![[img]] → ![](img)
  ↓ mdUnescape()             — backslash escapes → placeholders
  ↓ LaTeX $...$              → placeholders  
  ↓ preprocessCallouts()     — > [!TYPE] → table structure
  ↓ markdown-it (+mark)      — MD → HTML
  ↓ restoreEscapes()         — placeholders → literal chars
  ↓ renderLatexSvg()         — LaTeX → SVG (codecogs, Preview only)
  ↓
  ├── forCopy=true  → replaceImagesWithPlaceholders + LaTeX placeholder
  ├── forCopy=false → processImagesToBase64 + renderLatexSvg
  ↓
  ├── [Preview] → HTTP server → browser (dark mode @media preserved)
  └── [Copy]    → strip @media → juice inline → Electron clipboard
```

## Key Decisions

- **Copy path uses Electron native `clipboard.write({text, html})`** — Web Clipboard API caused WeChat editor hangs
- **Images/LaTeX use text placeholders in Copy mode** — `【图片：path】` / `【公式：formula】`
  Base64 images caused RESULT_CODE_HUNG; the hung state pollutes browser cookies/cache permanently
- **Callouts use `<table>` with inline styles** — WeChat strips `<div>` but preserves `<table>`
- **WeDown scheme is complementary, not replacement** — plugin handles LaTeX/Callout/Highlight that WeDown cannot

## Testing

```bash
npx vitest run
```

24 tests covering: callout (8 types), LaTeX SVG, backslash escapes, code blocks, tables, lists, blockquotes, dark mode, mark/highlight.
