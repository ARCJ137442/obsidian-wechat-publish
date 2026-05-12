/**
 * convert_series.js — Node.js port of convert_series.py
 * Obsidian MD → WeChat HTML with minimalist diary theme.
 * Phase 1: equivalance verification vs Python output.
 */
const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');

const SRC = 'H:/A137442/Document/life-series/series';
const DST = 'C:/Users/56506/AppData/Local/Temp/series-html-js';
const CACHE_DIR = 'C:/Users/56506/AppData/Local/Temp/latex-cache';
const CSS_PATH = 'H:/A137442/Document/life-series/wechat-theme.css';

if (!fs.existsSync(DST)) fs.mkdirSync(DST, { recursive: true });
if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });

const CSS = fs.readFileSync(CSS_PATH, 'utf-8');

// ─── HTML Template ───
function htmlTemplate({ title, titleShort, date, body, navLinks }) {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: "PingFang SC", system-ui, -apple-system, sans-serif;
    background: #e8e8e8;
    display: flex;
    justify-content: center;
    padding: 20px 0;
  }
  .page {
    max-width: 780px;
    width: 100%;
    background: #fff;
    padding: 60px 64px 80px;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.06);
    margin: 0 16px;
  }
  .phone-frame {
    max-width: 420px;
    padding: 40px 28px 60px;
  }
  .view-toggle {
    display: flex;
    justify-content: center;
    gap: 8px;
    margin-bottom: 20px;
    position: sticky;
    top: 20px;
    z-index: 10;
  }
  .view-btn {
    padding: 8px 18px;
    border: 1px solid #ddd;
    border-radius: 8px;
    background: #fff;
    font-size: 13px;
    cursor: pointer;
    color: #666;
    box-shadow: 0 1px 2px rgba(0,0,0,0.04);
  }
  .view-btn:hover { border-color: #aaa; }
  .view-btn.active { background: #3a6fb5; color: #fff; border-color: #3a6fb5; }
  .meta {
    text-align: center;
    margin-bottom: 32px;
    padding-bottom: 16px;
    border-bottom: 1px solid #f0f0f0;
  }
  .meta .title { font-size: 19px; font-weight: 600; color: #1a1a1a; margin-bottom: 6px; }
  .meta .info { font-size: 12px; color: #bbb; letter-spacing: 0.5px; }
  .nav {
    display: flex;
    justify-content: center;
    gap: 12px;
    margin-bottom: 24px;
    flex-wrap: wrap;
  }
  .nav a {
    font-size: 12px;
    color: #999;
    text-decoration: none;
    padding: 4px 10px;
    border: 1px solid #eee;
    border-radius: 4px;
  }
  .nav a:hover { border-color: #bbb; color: #555; }
  .nav a.current { background: #f5f5f5; color: #333; font-weight: 600; }
  ${CSS}

  @media (prefers-color-scheme: dark) {
    body { background: #1a1a1a; }
    .page { background: #222; box-shadow: 0 2px 8px rgba(0,0,0,0.3); }
    .meta .title { color: #e0e0e0; }
    .meta .info { color: #666; }
    .meta { border-bottom-color: #333; }
    .nav a { color: #888; border-color: #333; }
    .nav a:hover { border-color: #666; color: #ccc; }
    .nav a.current { background: #333; color: #ddd; }
    .wechat-content { color: rgba(255, 255, 255, 0.85); }
    .wechat-content h1, .wechat-content h2, .wechat-content h3 { color: #e0e0e0; }
    .wechat-content p { color: rgba(255, 255, 255, 0.85); }
    .wechat-content blockquote { color: rgba(255, 255, 255, 0.5); border-left-color: #555; }
    .wechat-content blockquote p { color: rgba(255, 255, 255, 0.5); }
    .wechat-content code { background: #333; color: #ddd; }
    .wechat-content pre { background: #2a2a2a; color: #ddd; }
    .wechat-content pre code { color: #ddd; }
    .wechat-content hr { border-top-color: #333; }
    .wechat-content mark, .wechat-content .highlight { background: linear-gradient(180deg, transparent 60%, rgba(255,255,255,0.15) 60%); }
    .wechat-content a { color: #7ea8d4; border-bottom-color: rgba(126, 168, 212, 0.3); }
    .wechat-content th { background: #2a2a2a; color: #aaa; }
    .wechat-content td { color: rgba(255,255,255,0.75); border-color: #333; }
    .wechat-content .caption { color: rgba(255,255,255,0.3); }
    .wechat-content .emoji-deco { color: rgba(255,255,255,0.25); }
    .wechat-content svg { color-scheme: only light; }
  }
</style>
</head>
<body>
<div style="position:fixed;top:0;left:0;right:0;background:rgba(232,232,232,0.92);backdrop-filter:blur(8px);padding:12px 20px;z-index:20;display:flex;align-items:center;justify-content:center;gap:16px;border-bottom:1px solid rgba(0,0,0,0.06);">
  <span style="font-size:13px;font-weight:600;color:#333;">${titleShort}</span>
  <div class="view-toggle" style="margin:0;position:static;">
    <button class="view-btn active" onclick="switchView('desktop')">桌面</button>
    <button class="view-btn" onclick="switchView('mobile')">手机</button>
  </div>
</div>
<div style="height:56px;"></div>
<div class="page" id="pageFrame">
  <div class="meta">
    <div class="title">${title}</div>
    <div class="info">${date} · 简约日记风</div>
  </div>
  <div class="nav">
    ${navLinks}
  </div>
  <div class="wechat-content">
${body}
  </div>
</div>
<script>
function switchView(mode) {
  const frame = document.getElementById('pageFrame');
  const btns = document.querySelectorAll('.view-btn');
  btns.forEach(b => b.classList.remove('active'));
  if (mode === 'mobile') {
    frame.classList.add('phone-frame');
    btns[1].classList.add('active');
  } else {
    frame.classList.remove('phone-frame');
    btns[0].classList.add('active');
  }
}
</script>
</body>
</html>`;
}

// ─── Frontmatter ───
function parseFrontmatter(text) {
  const meta = {};
  let body = text;
  if (text.startsWith('---')) {
    const end = text.indexOf('---', 3);
    if (end !== -1) {
      const fm = text.slice(3, end).trim();
      body = text.slice(end + 3).trim();
      for (const line of fm.split('\n')) {
        const colonIdx = line.indexOf(':');
        if (colonIdx > 0) {
          const key = line.slice(0, colonIdx).trim();
          let val = line.slice(colonIdx + 1).trim();
          val = val.replace(/^["']|["']$/g, '');
          meta[key] = val;
        }
      }
    }
  }
  return { meta, body };
}

// ─── SVG Cleaning ───
function cleanWechatSvg(svg) {
  svg = svg.replace(/<\?xml[^?]*\?>\s*/g, '');
  svg = svg.replace(/<!--[^>]*-->\s*/g, '');
  svg = svg.replace(/\s*xmlns:xlink=['"][^"']*['"]/g, '');
  svg = svg.replace(/\s*version=['"][\d.]+['"]/g, '');
  svg = svg.replace(/xlink:href/g, 'href');
  const wMatch = svg.match(/width='([\d.]+)pt'/);
  const wPt = wMatch ? wMatch[1] : null;
  svg = svg.replace(/\s*width='[\d.]+pt'/g, '');
  svg = svg.replace(/\s*height='[\d.]+pt'/g, '');
  let attrs = 'style="vertical-align:middle;"';
  if (wPt) attrs += ` width="${wPt}pt"`;
  svg = svg.replace('<svg ', `<svg ${attrs} `);
  svg = svg.replace(/<g /g, '<g fill="currentColor" ');
  svg = svg.replace(/<use /g, '<use fill="currentColor" ');
  return svg.trim();
}

// ─── LaTeX → SVG ───
async function renderLatexSvg(formula) {
  const cacheKey = crypto.createHash('md5').update(formula).digest('hex');
  const cachePath = path.join(CACHE_DIR, cacheKey + '.svg');
  if (fs.existsSync(cachePath)) {
    return fs.readFileSync(cachePath, 'utf-8');
  }

  const encoded = encodeURIComponent(formula);
  const url = `https://latex.codecogs.com/svg.latex?\\color{black}%20${encoded}`;

  return new Promise((resolve) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const cleaned = cleanWechatSvg(data);
        fs.writeFileSync(cachePath, cleaned, 'utf-8');
        resolve(cleaned);
      });
    }).on('error', () => {
      resolve(`<code>${escapeHtml(formula)}</code>`);
    });
  });
}

// ─── HTML Escape ───
function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ─── Backslash Unescape ───
const ESC_MAP = new Map();
let escCounter = 0;

function mdUnescape(text) {
  ESC_MAP.clear();
  escCounter = 0;
  const escapes = [
    ['\\\\', '\\'],   // backslash (must be first)
    ['\\_', '_'],
    ['\\*', '*'],
    ['\\`', '`'],
    ['\\#', '#'],
    ['\\+', '+'],
    ['\\-', '-'],
    ['\\.', '.'],
    ['\\!', '!'],
    ['\\(', '('],
    ['\\)', ')'],
    ['\\[', '['],
    ['\\]', ']'],
    ['\\{', '{'],
    ['\\}', '}'],
    ['\\~', '~'],
  ];
  for (const [pat, repl] of escapes) {
    const placeholder = `\x00MDESC${escCounter}\x00`;
    ESC_MAP.set(placeholder, repl);
    text = text.split(pat).join(placeholder);
    escCounter++;
  }
  return text;
}

function restoreEscapes(text) {
  for (const [placeholder, char] of ESC_MAP) {
    text = text.split(placeholder).join(char);
  }
  return text;
}

// ─── Inline Markdown → HTML ───
function mdInline(text) {
  // 0. LaTeX $...$ → placeholder
  const latexMap = new Map();
  let latexIdx = 0;
  text = text.replace(/\$\$(.+?)\$\$/g, (_, f) => {
    const ph = `\x00LATEX${latexIdx}\x00`;
    latexMap.set(ph, { formula: f.trim(), block: true });
    latexIdx++;
    return ph;
  });
  text = text.replace(/\$(.+?)\$/g, (_, f) => {
    const ph = `\x00LATEX${latexIdx}\x00`;
    latexMap.set(ph, { formula: f.trim(), block: false });
    latexIdx++;
    return ph;
  });

  // 1. Backslash unescape → placeholders
  text = mdUnescape(text);

  // 2. HTML escape
  text = escapeHtml(text);

  // 3. Markdown inline patterns
  text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">');
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/__(.+?)__/g, '<strong>$1</strong>');
  text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
  text = text.replace(/~~(.+?)~~/g, '<s>$1</s>');
  text = text.replace(/==(.+?)==/g, '<mark>$1</mark>');
  text = text.replace(/`([^`]+)`/g, '<code>$1</code>');

  // 4. Restore backslash escapes
  text = restoreEscapes(text);

  // 5. Restore LaTeX (will be resolved async later)
  // For now, store in a global map for async resolution
  if (!mdInline._latexMap) mdInline._latexMap = new Map();
  for (const [ph, info] of latexMap) {
    mdInline._latexMap.set(ph, info);
  }

  return text;
}

// ─── Block Markdown → HTML ───
function mdToHtml(text) {
  const lines = text.split('\n');
  const out = [];
  let i = 0;
  let inCodeBlock = false;
  let codeLines = [];
  let inList = null;
  let listItems = [];
  const paraLines = [];

  function flushList() {
    if (listItems.length) {
      const tag = inList === 'ol' ? 'ol' : 'ul';
      const items = listItems.map(item => `<li>${mdInline(item)}</li>`).join('');
      out.push(`<${tag}>${items}</${tag}>`);
      listItems = [];
    }
  }

  function flushParagraph() {
    if (paraLines.length) {
      const content = paraLines.map(ln => mdInline(ln)).join('<br>');
      out.push(`<p>${content}</p>`);
      paraLines.length = 0;
    }
  }

  function emitBlock(name, content, extra = '') {
    flushParagraph();
    flushList();
    out.push(`<${name}${extra}>${content}</${name}>`);
  }

  while (i < lines.length) {
    const line = lines[i];
    const stripped = line.trim();

    // Code block
    if (stripped.startsWith('```')) {
      if (inCodeBlock) {
        emitBlock('pre', `<code>${escapeHtml(codeLines.join('\n'))}</code>`);
        codeLines = [];
        inCodeBlock = false;
      } else {
        flushParagraph();
        flushList();
        inCodeBlock = true;
      }
      i++;
      continue;
    }
    if (inCodeBlock) {
      codeLines.push(line);
      i++;
      continue;
    }

    // HR
    if (['---', '***', '___', '- - -', '* * *'].includes(stripped)) {
      emitBlock('hr', '');
      i++;
      continue;
    }

    // Table
    if (stripped.includes('|') && stripped.startsWith('|')) {
      const tableRows = [];
      while (i < lines.length && lines[i].trim().includes('|')) {
        const row = lines[i].trim();
        if (!/^\|[\s\-:|]+\|$/.test(row)) {
          tableRows.push(row);
        }
        i++;
      }
      if (tableRows.length) {
        let rowsHtml = '';
        for (let ri = 0; ri < tableRows.length; ri++) {
          let cells = tableRows[ri].split('|');
          cells = cells.filter(c => c.trim());
          const tag = ri === 0 ? 'th' : 'td';
          rowsHtml += '<tr>' + cells.map(c => `<${tag}>${mdInline(c.trim())}</${tag}>`).join('') + '</tr>';
        }
        emitBlock('table', rowsHtml);
      }
      continue;
    }

    // Blockquote
    if (stripped.startsWith('>')) {
      const bqLines = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        bqLines.push(lines[i].replace(/^>\s?/, ''));
        i++;
      }
      const bqText = bqLines.join('\n');
      const bqHtml = mdToHtml(bqText);
      emitBlock('blockquote', bqHtml);
      continue;
    }

    // Unordered list
    const ulMatch = line.match(/^(\s*)[-*+]\s+(.*)/);
    if (ulMatch) {
      if (inList !== 'ul') { flushList(); inList = 'ul'; }
      listItems.push(ulMatch[2]);
      i++;
      continue;
    } else if (inList === 'ul') { flushList(); inList = null; }

    // Ordered list
    const olMatch = line.match(/^(\s*)\d+\.\s+(.*)/);
    if (olMatch) {
      if (inList !== 'ol') { flushList(); inList = 'ol'; }
      listItems.push(olMatch[2]);
      i++;
      continue;
    } else if (inList === 'ol') { flushList(); inList = null; }

    // Heading
    const hMatch = line.match(/^(#{1,6})\s+(.*)/);
    if (hMatch) {
      flushList();
      const level = hMatch[1].length;
      emitBlock(`h${level}`, mdInline(hMatch[2]));
      i++;
      continue;
    }

    // Blank line = paragraph boundary
    if (!stripped) {
      flushParagraph();
      flushList();
      i++;
      continue;
    }

    // Regular text line
    flushList();
    paraLines.push(stripped);
    i++;
  }

  if (inCodeBlock) {
    out.push(`<pre><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`);
  }
  flushParagraph();
  flushList();

  return out.join('\n');
}

// ─── Main ───
async function main() {
  const files = fs.readdirSync(SRC)
    .filter(f => f.endsWith('.md'))
    .sort();

  // Build nav links once
  const navEntries = files.map(f => ({
    name: f.replace('.md', ''),
    html: f.replace('.md', '.html'),
  }));

  const results = [];

  for (const fname of files) {
    const fpath = path.join(SRC, fname);
    const raw = fs.readFileSync(fpath, 'utf-8');
    const { meta, body } = parseFrontmatter(raw);

    const title = meta.title || fname.replace('.md', '');
    const date = meta.date || '';
    const theme = meta.theme || '';
    const num = meta['serie-num'] || '';
    const fullTitle = num && theme ? `${num} ${theme} | ${title}` : title;
    const titleShort = num && theme ? `${num} ${theme}` : title;

    // Reset LaTeX map before each file
    mdInline._latexMap = new Map();
    let bodyHtml = mdToHtml(body);

    // Resolve LaTeX placeholders asynchronously
    const latexEntries = Array.from(mdInline._latexMap.entries());
    for (const [ph, info] of latexEntries) {
      const svg = await renderLatexSvg(info.formula);
      bodyHtml = bodyHtml.split(ph).join(svg);
    }

    const navLinks = navEntries.map(e => {
      const cls = e.html === fname.replace('.md', '.html') ? ' class="current"' : '';
      return `<a href="${e.html}"${cls}>${e.name}</a>`;
    }).join('\n    ');

    const html = htmlTemplate({
      title: fullTitle,
      titleShort,
      date,
      body: bodyHtml,
      navLinks,
    });

    const outName = fname.replace('.md', '.html');
    const outPath = path.join(DST, outName);
    fs.writeFileSync(outPath, html, 'utf-8');
    results.push({ fname, outPath, meta });
    console.log(`OK: ${fname}`);
  }

  console.log(`\nDone. ${results.length} files in ${DST}`);
  for (const r of results) {
    console.log(`  ${r.meta['serie-num'] || '?'} ${r.meta.theme || '?'} | ${r.meta.title || '?'}  [${r.meta.date || '?'}]`);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
