#!/usr/bin/env node
/**
 * Convert wechat-theme.css (`.wechat-content` based) to WeDown CSS (`#wedown` based).
 *
 * Transforms:
 *   1. `.wechat-content` → `#wedown` (scope)
 *   2. Callout classes → `.custom-container` variants
 *   3. Hardcoded colors → CSS variables
 *   4. Strips `@media` dark mode block
 *   5. Adds pseudo-element overrides for WeDown defaults
 *   6. Adds CSS variable palette
 *
 * Usage: node convert-to-wedown.js <input.css> [output.css]
 */

const fs = require('fs');

const inputPath = process.argv[2];
const outputPath = process.argv[3];

if (!inputPath) {
	console.error('Usage: node scripts/convert-to-wedown.js <input.css> [output.css]');
	process.exit(1);
}

let css = fs.readFileSync(inputPath, 'utf-8');

// ── Step 1: Strip dark mode @media block (must come first) ──
css = css.replace(/@media\s*\(prefers-color-scheme\s*:\s*dark\)\s*\{[\s\S]*?\n\}/g, '');

// ── Step 2: Replace scope selector ──
// Only match at CSS selector positions (not inside strings or comments)
css = css.replace(/\.wechat-content(?=\s*[,{:\s>+~\]])/g, '#wedown');

// ── Step 3: Callout sub-element mapping ──
css = css.replace(/\.wechat-callout-title(?=\s*[,{:\s>+~\]])/g, '.custom-container-title');

// .wechat-callout-body p → .custom-container p
css = css.replace(/\.wechat-callout-body\s+p(?=\s*[,{:\s>+~\]])/g, '.custom-container p');

// .wechat-callout-body → .custom-container (standalone)
css = css.replace(/\.wechat-callout-body(?=\s*[,{:\s>+~\]])/g, '.custom-container');

// ── Step 4: Callout type mapping ──
const calloutTypes = {
	'\.wechat-callout-note':     '.custom-container',
	'\.wechat-callout-info':     '.custom-container.info',
	'\.wechat-callout-tip':      '.custom-container.success, .custom-container.tip',
	'\.wechat-callout-question': '.custom-container.question',
	'\.wechat-callout-warning':  '.custom-container.warning',
	'\.wechat-callout-danger':   '.custom-container.danger',
	'\.wechat-callout-example':  '.custom-container.example',
	'\.wechat-callout-quote':    '.custom-container.quote',
};

for (const [old, replacement] of Object.entries(calloutTypes)) {
	const re = new RegExp(old + '(?=\\s*[,{:\\s>+~\\]])', 'g');
	css = css.replace(re, replacement);
}

// ── Step 5: Replace hardcoded values with CSS variables (before palette insertion) ──
const valueReplacements = [
	[/color:\s*rgba\(0,\s*0,\s*0,\s*0\.9\)/g,  'color: var(--text-primary)'],
	[/color:\s*#1a1a1a(?=\s*[;}!])/g,           'color: var(--text-heading)'],
	[/color:\s*#333(?=\s*[;}!])/g,               'color: var(--text-subheading)'],
	[/color:\s*rgba\(0,\s*0,\s*0,\s*0\.5\)/g,   'color: var(--text-muted)'],
	[/color:\s*rgba\(0,\s*0,\s*0,\s*0\.4\)/g,   'color: var(--text-caption)'],
	[/color:\s*#444(?=\s*[;}!])/g,               'color: var(--text-code)'],
	[/border-top:\s*1px solid #eee/g,            'border-top: 1px solid var(--border-light)'],
	[/border-left:\s*3px solid #dbdbdb/g,        'border-left: 3px solid var(--border-default)'],
	[/border:\s*1px solid #e8e8e8/g,             'border: 1px solid var(--border-table)'],
	[/background:\s*#f7f7f7(?=\s*[;}!])/g,       'background: var(--bg-code)'],
	[/background:\s*#f3f3f3(?=\s*[;}!])/g,       'background: var(--bg-code-inline)'],
	[/background:\s*#fafafa(?=\s*[;}!])/g,       'background: var(--bg-th)'],
	[/color:\s*#576b95(?=\s*[;}!])/g,            'color: var(--link-color)'],
	[/rgba\(87,\s*107,\s*149,\s*0\.3\)/g,        'var(--link-border)'],
	[/rgba\(0,\s*0,\s*0,\s*0\.08\)/g,            'var(--highlight-bg)'],
	[/background-color:\s*#f3f3f3(?=\s*[;}!])/g, 'background-color: var(--bg-code-inline)'],
	[/background-color:\s*#f7f7f7(?=\s*[;}!])/g, 'background-color: var(--bg-code)'],
];

for (const [regex, replacement] of valueReplacements) {
	css = css.replace(regex, replacement);
}

// ── Step 6: Insert CSS variable palette after first #wedown { ──
const palette = `
  /* ── 调色板 ── */
  --text-primary: rgba(0, 0, 0, 0.9);
  --text-heading: #1a1a1a;
  --text-subheading: #333;
  --text-muted: rgba(0, 0, 0, 0.5);
  --text-caption: rgba(0, 0, 0, 0.4);
  --text-code: #444;
  --border-light: #eee;
  --border-default: #dbdbdb;
  --border-table: #e8e8e8;
  --bg-code: #f7f7f7;
  --bg-code-inline: #f3f3f3;
  --bg-th: #fafafa;
  --link-color: #576b95;
  --link-border: rgba(87, 107, 149, 0.3);
  --highlight-bg: rgba(0, 0, 0, 0.08);
`;

const wedownIdx = css.indexOf('#wedown {');
if (wedownIdx >= 0) {
	const openBrace = css.indexOf('{', wedownIdx) + 1;
	css = css.slice(0, openBrace) + palette + css.slice(openBrace);
}

// ── Step 7: Append WeDown pseudo-element overrides ──
const overrides = `
/* ── 覆盖 WeDown 默认装饰 ── */
#wedown strong::before,
#wedown strong::after { content: none; }
#wedown blockquote::before,
#wedown blockquote::after { content: none; }
#wedown pre::before { content: none; }
#wedown figcaption::before { content: none; }
`;

css += overrides;

// ── Output ──
const result = '@charset "UTF-8";\n\n' + css.trim() + '\n';

if (outputPath) {
	fs.writeFileSync(outputPath, result, 'utf-8');
	console.log(`Written to ${outputPath}`);
} else {
	console.log(result);
}
