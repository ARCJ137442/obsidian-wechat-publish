# obsidian-wechat-publish

Obsidian plugin for one-click Markdown → WeChat Official Account publishing with minimalist diary theme.

## Quick Start

```bash
npm install
npm run build
# Copy main.js, manifest.json, styles.css to .obsidian/plugins/obsidian-wechat-publish/
```

## Project Structure

```
src/
  main.ts              — Plugin entry: commands, processMarkdown, processAndPreview/Copy
  callout-plugin.ts    — Markdown preprocessor: > [!NOTE] → <div class="wechat-callout">
tests/
  full-pipeline.test.ts    — E2E test: .md file → full HTML output
  remaining-bugs.test.ts   — Regression tests for LaTeX, dark mode
  callout.test.ts          — Callout-specific tests
  callout-plugin.js        — Compiled callout plugin (for Node.js testing)
  *.test.ts                — Vitest test files
wechat-theme.css      — Standalone CSS (used by Python/JS converters)
convert_series.py     — Python standalone converter (batch mode)
convert_series.js     — Node.js standalone converter (batch mode)
docs/                 — Documentation
```

## Architecture

```
Obsidian MD (.md)
  ↓ parseFrontmatter()     — strip YAML
  ↓ convertWikiLinks()     — ![[img]] → ![](img)
  ↓ mdUnescape()           — backslash escapes → placeholders
  ↓ LaTeX $...$            → placeholders
  ↓ preprocessCallouts()   — > [!TYPE] → <div class="wechat-callout">
  ↓ markdown-it            — MD → HTML
  ↓ restoreEscapes()       — placeholders → literal chars
  ↓ renderLatexSvg()       — LaTeX placeholders → SVG (codecogs API)
  ↓ processImagesToBase64()— local images → data: URLs
  ↓
  ├── [Preview] → HTTP server → browser
  └── [Copy]    → juice CSS inline → clipboard
```

## Commands

- `Preview in Browser`: Full HTML with dark mode CSS, served via local HTTP
- `Copy to WeChat`: Juice-inlined HTML → clipboard → paste into WeChat editor

## Testing

```bash
npx vitest run
```

24 tests covering: callout rendering (7 types), LaTeX SVG, backslash escapes, code blocks, tables, lists, blockquotes, dark mode, mark/highlight dark mode.
