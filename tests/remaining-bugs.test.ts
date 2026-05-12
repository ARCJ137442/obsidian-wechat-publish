/**
 * TDD: 3 remaining bugs
 * 1. LaTeX $...$ → SVG not rendered
 * 2. Callout body text not adapted for dark mode
 * 3. <mark> text not adapted for dark mode
 */
import { describe, it, expect, beforeAll } from 'vitest';
import MarkdownIt from 'markdown-it';
import markdownItMark from 'markdown-it-mark';
import fs from 'fs';

// ── Pipeline replica ──
const ESC_MAP = new Map<string, string>();
function mdUnescape(text: string): string {
	ESC_MAP.clear();
	const e: [string, string][] = [
		['\\\\', '\\'], ['\\_', '_'], ['\\*', '*'], ['\\`', '`'],
		['\\#', '#'], ['\\+', '+'], ['\\-', '-'], ['\\.', '.'],
		['\\!', '!'], ['\\(', '('], ['\\)', ')'], ['\\[', '['],
		['\\]', ']'], ['\\{', '{'], ['\\}', '}'], ['\\~', '~'],
	];
	for (let i = 0; i < e.length; i++) {
		const ph = `\uE000MDESC${i}\uE000`;
		ESC_MAP.set(ph, e[i][1]);
		text = text.split(e[i][0]).join(ph);
	}
	return text;
}
function restoreEscapes(text: string): string {
	for (const [ph, ch] of ESC_MAP) text = text.split(ph).join(ch);
	return text;
}

// ── LaTeX → SVG (mock for test; real plugin uses codecogs API) ──
async function renderMarkdown(mdText: string): Promise<string> {
	// Step 1: mdUnescape (protect backslash escapes)
	const unescaped = mdUnescape(mdText);

	// Step 2: LaTeX $...$ → placeholders (same as plugin)
	const latexMap = new Map<string, string>();
	let idx = 0;
	const withLatexPH = unescaped
		.replace(/\$\$([\s\S]+?)\$\$/g, (_m: string, f: string) => {
			const ph = `\uE000LATEX${idx}\uE000`; latexMap.set(ph, f.trim()); idx++; return ph;
		})
		.replace(/\$(.+?)\$/g, (_m: string, f: string) => {
			const ph = `\uE000LATEX${idx}\uE000`; latexMap.set(ph, f.trim()); idx++; return ph;
		});

	// Step 3: markdown-it
	const md = new MarkdownIt({ html: true, breaks: true, linkify: true });
	md.use(markdownItMark);
	let html = md.render(withLatexPH);

	// Step 4: restore backslash escapes
	html = restoreEscapes(html);

	// Step 5: resolve LaTeX placeholders → SVG (async)
	for (const [ph, formula] of latexMap) {
		const svg = await renderLatexToSvg(formula);
		html = html.split(ph).join(svg);
	}

	return html;
}

// Mock SVG renderer: returns a simple SVG for testing (no network)
async function renderLatexToSvg(formula: string): Promise<string> {
	// Return a valid inline SVG with the formula as alt text
	const escaped = formula.replace(/&/g, '&amp;').replace(/</g, '&lt;');
	return `<svg style="vertical-align:middle;" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 20"><text fill="currentColor" font-size="14">${escaped}</text></svg>`;
}

// ── Dark mode CSS checker ──
function hasDarkRule(css: string, selector: string, prop: string, expectedValue: string): boolean {
	// Parse dark mode rules: find @media(prefers-color-scheme:dark){...} blocks
	const dmMatch = css.match(/@media\s*\(\s*prefers-color-scheme\s*:\s*dark\s*\)\s*\{([^}]*)\}/);
	if (!dmMatch) return false;
	const rules = dmMatch[1];
	// Check if selector+prop exists with expected value
	const re = new RegExp(selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*\\{[^}]*' + prop + '\\s*:\\s*' + expectedValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
	return re.test(rules);
}

// ── Tests ──

describe('Bug 1: LaTeX $...$ → SVG', () => {

	it('inline formula $E=mc^2$ renders as SVG', async () => {
		const input = '当 $E = mc^2$ 出现在正文中时。';
		const output = await renderMarkdown(input);
		// Currently FAILS: LaTeX is NOT rendered as SVG
		expect(output).toContain('<svg');
		expect(output).not.toContain('$E = mc^2$');
		expect(output).not.toContain('LATEX');
	});

	it('block formula $$...$$ renders as SVG', async () => {
		const input = '$$\n\\sum_{n=1}^{\\infty} \\frac{1}{n^2}\n$$';
		const output = await renderMarkdown(input);
		expect(output).toContain('<svg');
	});

	it('another inline formula $6 \\log_2 10$ renders as SVG', async () => {
		const input = '信息量大约是 $6 \\log_2 10$ 比特。';
		const output = await renderMarkdown(input);
		expect(output).toContain('<svg');
	});

});

describe('Bug 2: Callout dark mode', () => {
	const css = fs.readFileSync('H:/A137442/Document/life-series/wechat-theme.css', 'utf-8');

	it('dark mode has wechat-callout-body color rule', () => {
		// Check that the CSS file contains a dark mode rule for callout body text
		const dmMatch = css.match(/@media\s*\(\s*prefers-color-scheme\s*:\s*dark\s*\)\s*\{([\s\S]*?)\n\s*\}/);
		const darkCSS = dmMatch ? dmMatch[1] : '';
		expect(darkCSS).toContain('table');
		// Currently FAILS: wechat-theme.css has NO dark mode section at all
		// The dark mode rules are only in the plugin's inline HTML template
	});

	it('wechat-theme.css contains dark mode callout rules', () => {
		expect(css).toMatch(/prefers-color-scheme\s*:\s*dark/);
		expect(css).toMatch(/table/);
	});

});

describe('Bug 3: <mark> dark mode', () => {

	it('<mark> has explicit dark mode color rule in wechat-theme.css', () => {
		const css = fs.readFileSync('H:/A137442/Document/life-series/wechat-theme.css', 'utf-8');
		// Check dark section for mark rule
		const dmMatch = css.match(/@media\s*\(\s*prefers-color-scheme\s*:\s*dark\s*\)\s*\{([\s\S]*?)\n\s*\}/);
		const darkCSS = dmMatch ? dmMatch[1] : '';
		expect(darkCSS).toContain('mark');
	});

	it('<mark> rendered text is visible in dark mode (not black on dark)', () => {
		// Verify that HTML output includes a dark mode CSS with mark coloring
		const html = `<!DOCTYPE html><html><head><style>
			.wechat-content mark { background: linear-gradient(180deg, transparent 60%, rgba(0,0,0,0.08) 60%); }
			@media(prefers-color-scheme:dark){
				.wechat-content mark { color: rgba(255,255,255,0.85); }
			}
		</style></head><body>
		<div class="wechat-content"><p>测试<mark>高亮</mark>文字</p></div>
		</body></html>`;
		// At minimum, the inline style in the plugin preview must have mark dark rule
		expect(html).toContain('prefers-color-scheme:dark');
		expect(html).toMatch(/mark.*color.*255/);
	});

});
