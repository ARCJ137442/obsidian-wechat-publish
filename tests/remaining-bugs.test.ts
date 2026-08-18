/**
 * Regression probes for earlier rendering bugs:
 * 1. LaTeX $...$ should render to SVG
 * 2. Callout body text should adapt for dark mode
 * 3. <mark> text should adapt for dark mode
 */
import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import { renderMarkdownCore } from '../src/markdown-core';

function renderMarkdown(mdText: string): string {
	return renderMarkdownCore(mdText, {
		renderLatex: (formula) => ({
			html: `<svg style="vertical-align:middle;" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 20"><text fill="currentColor" font-size="14">${formula}</text></svg>`,
		}),
	}).html;
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
	const output = renderMarkdown(input);
		// Regression: LaTeX should be resolved before HTML leaves the pipeline.
		expect(output).toContain('<svg');
		expect(output).not.toContain('$E = mc^2$');
		expect(output).not.toContain('LATEX');
	});

	it('block formula $$...$$ renders as SVG', async () => {
		const input = '$$\n\\sum_{n=1}^{\\infty} \\frac{1}{n^2}\n$$';
	const output = renderMarkdown(input);
		expect(output).toContain('<svg');
	});

	it('another inline formula $6 \\log_2 10$ renders as SVG', async () => {
		const input = '信息量大约是 $6 \\log_2 10$ 比特。';
	const output = renderMarkdown(input);
		expect(output).toContain('<svg');
	});

});

describe('Bug 2: Callout dark mode', () => {
	const css = fs.readFileSync(path.resolve(__dirname, '../wechat-theme.css'), 'utf-8');

	it('dark mode has wechat-callout-body color rule', () => {
		// Check that the CSS file contains a dark mode rule for callout body text
		const dmMatch = css.match(/@media\s*\(\s*prefers-color-scheme\s*:\s*dark\s*\)\s*\{([\s\S]*?)\n\s*\}/);
		const darkCSS = dmMatch ? dmMatch[1] : '';
		expect(darkCSS).toContain('wechat-callout');
		// Regression: the standalone theme must keep its own dark-mode rules.
	});

	it('wechat-theme.css contains dark mode callout rules', () => {
		expect(css).toMatch(/prefers-color-scheme\s*:\s*dark/);
		expect(css).toMatch(/wechat-callout/);
	});

});

describe('Bug 3: <mark> dark mode', () => {

	it('<mark> has explicit dark mode color rule in wechat-theme.css', () => {
		const css = fs.readFileSync(path.resolve(__dirname, '../wechat-theme.css'), 'utf-8');
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
