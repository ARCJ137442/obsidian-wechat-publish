"""
Convert Obsidian series notes to WeChat-ready HTML using minimalist diary theme.
"""
import re, os, glob, html as html_mod, urllib.request, urllib.parse, base64, hashlib, json

SRC = r'H:\A137442\Document\life-series\series'
DST = r'C:\Users\56506\AppData\Local\Temp\series-html'
CACHE_DIR = r'C:\Users\56506\AppData\Local\Temp\latex-cache'
os.makedirs(DST, exist_ok=True)
os.makedirs(CACHE_DIR, exist_ok=True)

CSS = open(r'H:\A137442\Document\life-series\wechat-theme.css', 'r', encoding='utf-8').read()

HTML_TEMPLATE = '''<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{title}</title>
<style>
  * {{ margin: 0; padding: 0; box-sizing: border-box; }}
  body {{
    font-family: "PingFang SC", system-ui, -apple-system, sans-serif;
    background: #e8e8e8;
    display: flex;
    justify-content: center;
    padding: 20px 0;
  }}
  .page {{
    max-width: 780px;
    width: 100%;
    background: #fff;
    padding: 60px 64px 80px;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.06);
    margin: 0 16px;
  }}
  .phone-frame {{
    max-width: 420px;
    padding: 40px 28px 60px;
  }}
  .view-toggle {{
    display: flex;
    justify-content: center;
    gap: 8px;
    margin-bottom: 20px;
    position: sticky;
    top: 20px;
    z-index: 10;
  }}
  .view-btn {{
    padding: 8px 18px;
    border: 1px solid #ddd;
    border-radius: 8px;
    background: #fff;
    font-size: 13px;
    cursor: pointer;
    color: #666;
    box-shadow: 0 1px 2px rgba(0,0,0,0.04);
  }}
  .view-btn:hover {{ border-color: #aaa; }}
  .view-btn.active {{ background: #3a6fb5; color: #fff; border-color: #3a6fb5; }}
  .meta {{
    text-align: center;
    margin-bottom: 32px;
    padding-bottom: 16px;
    border-bottom: 1px solid #f0f0f0;
  }}
  .meta .title {{ font-size: 19px; font-weight: 600; color: #1a1a1a; margin-bottom: 6px; }}
  .meta .info {{ font-size: 12px; color: #bbb; letter-spacing: 0.5px; }}
  .nav {{
    display: flex;
    justify-content: center;
    gap: 12px;
    margin-bottom: 24px;
    flex-wrap: wrap;
  }}
  .nav a {{
    font-size: 12px;
    color: #999;
    text-decoration: none;
    padding: 4px 10px;
    border: 1px solid #eee;
    border-radius: 4px;
  }}
  .nav a:hover {{ border-color: #bbb; color: #555; }}
  .nav a.current {{ background: #f5f5f5; color: #333; font-weight: 600; }}
  {css}

  /* Dark mode: invert page chrome, keep article readable */
  @media (prefers-color-scheme: dark) {{
    body {{ background: #1a1a1a; }}
    .page {{ background: #222; box-shadow: 0 2px 8px rgba(0,0,0,0.3); }}
    .meta .title {{ color: #e0e0e0; }}
    .meta .info {{ color: #666; }}
    .meta {{ border-bottom-color: #333; }}
    .nav a {{ color: #888; border-color: #333; }}
    .nav a:hover {{ border-color: #666; color: #ccc; }}
    .nav a.current {{ background: #333; color: #ddd; }}
    .preview-label {{ color: #555; border-bottom-color: #333; }}
    /* Article text: light-on-dark */
    .wechat-content {{ color: rgba(255, 255, 255, 0.85); }}
    .wechat-content h1, .wechat-content h2, .wechat-content h3 {{ color: #e0e0e0; }}
    .wechat-content p {{ color: rgba(255, 255, 255, 0.85); }}
    .wechat-content blockquote {{ color: rgba(255, 255, 255, 0.5); border-left-color: #555; }}
    .wechat-content blockquote p {{ color: rgba(255, 255, 255, 0.5); }}
    .wechat-content code {{ background: #333; color: #ddd; }}
    .wechat-content pre {{ background: #2a2a2a; color: #ddd; }}
    .wechat-content pre code {{ color: #ddd; }}
    .wechat-content hr {{ border-top-color: #333; }}
    .wechat-content mark, .wechat-content .highlight {{ background: linear-gradient(180deg, transparent 60%, rgba(255,255,255,0.15) 60%); }}
    .wechat-content a {{ color: #7ea8d4; border-bottom-color: rgba(126, 168, 212, 0.3); }}
    .wechat-content th {{ background: #2a2a2a; color: #aaa; }}
    .wechat-content td {{ color: rgba(255,255,255,0.75); border-color: #333; }}
    .wechat-content .caption {{ color: rgba(255,255,255,0.3); }}
    .wechat-content .emoji-deco {{ color: rgba(255,255,255,0.25); }}
    /* SVG formulas: currentColor inherits light text */
    .wechat-content svg {{ color-scheme: only light; }}
  }}
</style>
</head>
<body>
<div style="position:fixed;top:0;left:0;right:0;background:rgba(232,232,232,0.92);backdrop-filter:blur(8px);padding:12px 20px;z-index:20;display:flex;align-items:center;justify-content:center;gap:16px;border-bottom:1px solid rgba(0,0,0,0.06);">
  <span style="font-size:13px;font-weight:600;color:#333;">{title_short}</span>
  <div class="view-toggle" style="margin:0;position:static;">
    <button class="view-btn active" onclick="switchView('desktop')">桌面</button>
    <button class="view-btn" onclick="switchView('mobile')">手机</button>
  </div>
</div>
<div style="height:56px;"></div>
<div class="page" id="pageFrame">
  <div class="meta">
    <div class="title">{title}</div>
    <div class="info">{date} · 简约日记风</div>
  </div>
  <div class="nav">
    {nav_links}
  </div>
  <div class="wechat-content">
{body}
  </div>
</div>
<script>
function switchView(mode) {{
  const frame = document.getElementById('pageFrame');
  const btns = document.querySelectorAll('.view-btn');
  btns.forEach(b => b.classList.remove('active'));
  if (mode === 'mobile') {{
    frame.classList.add('phone-frame');
    btns[1].classList.add('active');
  }} else {{
    frame.classList.remove('phone-frame');
    btns[0].classList.add('active');
  }}
}}
</script>
</body>
</html>'''


def parse_frontmatter(text):
    meta = {}
    body = text
    if text.startswith('---'):
        end = text.find('---', 3)
        if end != -1:
            fm = text[3:end].strip()
            body = text[end+3:].strip()
            for line in fm.split('\n'):
                line = line.strip()
                if ':' in line:
                    key, _, val = line.partition(':')
                    meta[key.strip()] = val.strip().strip('"').strip("'")
    return meta, body


# Placeholder registry for md_unescape → restore cycle
_ESC_PLACEHOLDERS = {}  # placeholder → literal char

# ──────── LaTeX → WeChat SVG ────────

def clean_wechat_svg(svg):
    """Strip xlink/pixel units, add currentColor for dark mode support."""
    svg = re.sub(r'<\?xml[^?]*\?>\s*', '', svg)
    svg = re.sub(r'<!--[^>]*-->\s*', '', svg)
    svg = re.sub(r"""\s*xmlns:xlink=['"][^"']*['"]""", '', svg)
    svg = re.sub(r"""\s*version=['"][\d.]+['"]""", '', svg)
    svg = svg.replace('xlink:href', 'href')
    # Use pt width (font-relative), drop fixed height
    w_match = re.search(r"width='([\d.]+)pt'", svg)
    w_pt = w_match.group(1) if w_match else None
    svg = re.sub(r"\s*width='[\d.]+pt'", '', svg)
    svg = re.sub(r"\s*height='[\d.]+pt'", '', svg)
    attrs = 'style="vertical-align:middle;"'
    if w_pt:
        attrs += f' width="{w_pt}pt"'
    svg = svg.replace('<svg ', f'<svg {attrs} ')
    # Inject currentColor on <g> and <use> so formula inherits text color (dark mode safe)
    svg = svg.replace('<g ', '<g fill="currentColor" ')
    svg = svg.replace('<use ', '<use fill="currentColor" ')
    return svg.strip()


def render_latex_svg(formula, inline=True):
    """Render LaTeX formula to WeChat-compatible inline SVG via codecogs API.
    Results are cached by formula hash to avoid repeated network calls.
    """
    cache_key = hashlib.md5(formula.encode()).hexdigest()
    cache_path = os.path.join(CACHE_DIR, cache_key + '.svg')
    if os.path.exists(cache_path):
        with open(cache_path, 'r', encoding='utf-8') as f:
            return f.read()

    try:
        encoded = urllib.parse.quote(formula)
        url = f'https://latex.codecogs.com/svg.latex?\\color{{black}}%20{encoded}'
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        resp = urllib.request.urlopen(req, timeout=8)
        svg_raw = resp.read().decode('utf-8')
        svg_clean = clean_wechat_svg(svg_raw)
        with open(cache_path, 'w', encoding='utf-8') as f:
            f.write(svg_clean)
        return svg_clean
    except Exception as e:
        # Fallback: render as plain text
        return f'<code>{html_mod.escape(formula)}</code>'


def md_unescape(text):
    """Convert Markdown backslash escapes to placeholder tokens.
    Placeholders are inert to markdown regex patterns and HTML escaping.
    Restored after all other processing via restore_escapes().
    """
    global _ESC_PLACEHOLDERS
    _ESC_PLACEHOLDERS.clear()
    # Order matters: \\ must go first
    escapes = [
        ('\\\\', '\\'),   # backslash
        ('\\_', '_'),     # underscore
        ('\\*', '*'),     # asterisk
        ('\\`', '`'),     # backtick
        ('\\#', '#'),     # hash
        ('\\+', '+'),     # plus
        ('\\-', '-'),     # minus
        ('\\.', '.'),     # dot
        ('\\!', '!'),     # exclamation
        ('\\(', '('),     # left paren
        ('\\)', ')'),     # right paren
        ('\\[', '['),     # left bracket
        ('\\]', ']'),     # right bracket
        ('\\{', '{'),     # left brace
        ('\\}', '}'),     # right brace
        ('\\~', '~'),     # tilde
    ]
    for i, (pat, repl) in enumerate(escapes):
        placeholder = f'\x00MDESC{i}\x00'
        _ESC_PLACEHOLDERS[placeholder] = repl
        text = text.replace(pat, placeholder)
    return text

def restore_escapes(text):
    """Restore placeholder tokens back to literal characters."""
    for placeholder, char in _ESC_PLACEHOLDERS.items():
        text = text.replace(placeholder, char)
    return text


def md_inline(text):
    # 0. LaTeX $...$ → placeholders (preserve raw formula text for API)
    latex_map = {}
    def save_latex(m):
        ph = f'\x00LATEX{len(latex_map)}\x00'
        latex_map[ph] = render_latex_svg(m.group(1).strip())
        return ph
    text = re.sub(r'\$\$(.+?)\$\$', save_latex, text)
    text = re.sub(r'\$(.+?)\$', save_latex, text)

    text = md_unescape(text)          # 1. backslash escapes → placeholders
    text = html_mod.escape(text)      # 2. HTML-escape &<>"'
    text = re.sub(r'!\[([^\]]*)\]\(([^)]+)\)', r'<img src="\2" alt="\1">', text)
    text = re.sub(r'\[([^\]]+)\]\(([^)]+)\)', r'<a href="\2">\1</a>', text)
    text = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', text)
    text = re.sub(r'__(.+?)__', r'<strong>\1</strong>', text)
    text = re.sub(r'\*(.+?)\*', r'<em>\1</em>', text)
    text = re.sub(r'~~(.+?)~~', r'<s>\1</s>', text)
    text = re.sub(r'==(.+?)==', r'<mark>\1</mark>', text)
    text = re.sub(r'`([^`]+)`', r'<code>\1</code>', text)
    text = restore_escapes(text)      # 3. placeholders → literal chars

    # 4. Restore LaTeX SVGs (raw HTML, must be last to avoid escaping)
    for ph, svg in latex_map.items():
        text = text.replace(ph, svg)

    return text


def md_to_html(text):
    """Convert Markdown to HTML.

    Paragraph grouping follows Obsidian writing convention:
    - Single newline = intra-paragraph soft break (<br>)
    - Double newline (blank line) = inter-paragraph boundary (<p> margin)
    """
    lines = text.split('\n')
    out = []
    i = 0
    in_code_block = False
    code_lines = []
    in_list = None
    list_items = []

    def flush_list():
        nonlocal list_items
        if list_items:
            tag = 'ol' if in_list == 'ol' else 'ul'
            items = ''.join(f'<li>{md_inline(item)}</li>' for item in list_items)
            out.append(f'<{tag}>{items}</{tag}>')
            list_items = []

    # --- Paragraph grouping helpers ---
    para_lines = []  # accumulates lines for the current paragraph

    def flush_paragraph():
        nonlocal para_lines
        if para_lines:
            content = '<br>'.join(md_inline(ln) for ln in para_lines)
            out.append(f'<p>{content}</p>')
            para_lines = []

    def emit_block(name, content, extra=''):
        """Emit a block-level element, flushing any pending paragraph first."""
        flush_paragraph()
        flush_list()
        if extra:
            out.append(f'<{name}{extra}>{content}</{name}>')
        else:
            out.append(f'<{name}>{content}</{name}>')

    while i < len(lines):
        line = lines[i]
        stripped = line.strip()

        # ── Code block ──
        if stripped.startswith('```'):
            if in_code_block:
                emit_block('pre', f'<code>{html_mod.escape(chr(10).join(code_lines))}</code>')
                code_lines = []
                in_code_block = False
            else:
                flush_paragraph()
                flush_list()
                in_code_block = True
            i += 1
            continue
        if in_code_block:
            code_lines.append(line)
            i += 1
            continue

        # ── Horizontal rule ──
        if stripped in ('---', '***', '___', '- - -', '* * *'):
            emit_block('hr', '')
            i += 1
            continue

        # ── Table ──
        if '|' in stripped and stripped.startswith('|'):
            # Gather consecutive table lines
            table_rows = []
            while i < len(lines) and '|' in lines[i].strip():
                row = lines[i].strip()
                if not re.match(r'^\|[\s\-:|]+\|$', row):  # skip separator
                    table_rows.append(row)
                i += 1
            if table_rows:
                rows_html = ''
                for ri, row in enumerate(table_rows):
                    cells = [c.strip() for c in row.split('|')]
                    cells = [c for c in cells if c]
                    tag = 'th' if ri == 0 else 'td'
                    rows_html += '<tr>' + ''.join(f'<{tag}>{md_inline(c)}</{tag}>' for c in cells) + '</tr>'
                emit_block('table', rows_html)
            continue

        # ── Blockquote ──
        if stripped.startswith('>'):
            bq_lines = []
            while i < len(lines) and lines[i].strip().startswith('>'):
                bq_lines.append(re.sub(r'^>\s?', '', lines[i]))
                i += 1
            # Process blockquote content recursively
            bq_text = '\n'.join(bq_lines)
            bq_html = md_to_html(bq_text)  # recurse for nested md
            emit_block('blockquote', bq_html)
            continue

        # ── Unordered list ──
        ul_match = re.match(r'^(\s*)[-*+]\s+(.*)', line)
        if ul_match:
            if in_list != 'ul':
                flush_list()
                in_list = 'ul'
            list_items.append(ul_match.group(2))
            i += 1
            continue
        elif in_list == 'ul':
            flush_list()
            in_list = None

        # ── Ordered list ──
        ol_match = re.match(r'^(\s*)\d+\.\s+(.*)', line)
        if ol_match:
            if in_list != 'ol':
                flush_list()
                in_list = 'ol'
            list_items.append(ol_match.group(2))
            i += 1
            continue
        elif in_list == 'ol':
            flush_list()
            in_list = None

        # ── Heading ──
        h_match = re.match(r'^(#{1,6})\s+(.*)', line)
        if h_match:
            flush_list()
            level = len(h_match.group(1))
            emit_block(f'h{level}', md_inline(h_match.group(2)))
            i += 1
            continue

        # ── Blank line = paragraph boundary ──
        if not stripped:
            flush_paragraph()
            flush_list()
            i += 1
            continue

        # ── Regular text line = accumulate into paragraph ──
        flush_list()
        para_lines.append(stripped)
        i += 1

    # Flush remaining
    if in_code_block:
        out.append(f'<pre><code>{html_mod.escape(chr(10).join(code_lines))}</code></pre>')
    flush_paragraph()
    flush_list()

    return '\n'.join(out)


# Main
md_files = sorted(glob.glob(os.path.join(SRC, '*.md')))
results = []

for fpath in md_files:
    fname = os.path.basename(fpath)
    with open(fpath, 'r', encoding='utf-8') as f:
        raw = f.read()

    meta, body = parse_frontmatter(raw)
    title = meta.get('title', fname.replace('.md', ''))
    date = meta.get('date', '')
    theme = meta.get('theme', '')
    num = meta.get('serie-num', '')
    full_title = f'{num} {theme} | {title}' if num and theme else title
    title_short = f'{num} {theme}' if num and theme else title

    body_html = md_to_html(body)

    nav_parts = []
    for other_f in md_files:
        other_name = os.path.basename(other_f)
        other_base = other_name.replace('.md', '')
        other_html_name = other_name.replace('.md', '.html')
        cls = ' class="current"' if other_f == fpath else ''
        nav_parts.append(f'<a href="{other_html_name}"{cls}>{other_base}</a>')
    nav_links = '\n    '.join(nav_parts)

    html = HTML_TEMPLATE.format(
        title=full_title,
        title_short=title_short,
        date=date,
        body=body_html,
        nav_links=nav_links,
        css=CSS,
    )

    out_name = fname.replace('.md', '.html')
    out_path = os.path.join(DST, out_name)
    with open(out_path, 'w', encoding='utf-8') as f:
        f.write(html)
    results.append((fname, out_path, meta))
    print(f'OK: {fname}')

print(f'\nDone. {len(results)} files in {DST}')
for fname, out_path, meta in results:
    print(f'  {meta.get("serie-num","?")} {meta.get("theme","?")} | {meta.get("title","?")}  [{meta.get("date","?")}]')
