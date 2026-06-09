/**
 * Regression tests for Preview LaTeX rendering.
 *
 * The old Preview path extracted a KaTeX HTML fragment with a lazy regex and
 * truncated formulas such as $L^AT_EX$ to visible "LA". Preview and Copy now
 * share the MathJax SVG renderer; only images and CSS handling should diverge.
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const source = fs.readFileSync(path.resolve(__dirname, '../src/main.ts'), 'utf-8');

describe('Preview LaTeX regression', () => {
	it('uses the shared MathJax SVG renderer for LaTeX placeholders', () => {
		expect(source).toContain('this.renderLatexSvg(formula, displayMode)');
		expect(source).toContain('Resolve LaTeX placeholders → MathJax SVG');
	});

	it('does not reintroduce brittle KaTeX HTML fragment extraction', () => {
		expect(source).not.toContain('renderKatexFormula');
		expect(source).not.toContain('katex-html');
		expect(source).not.toMatch(/renderToString\s*\(/);
		expect(source).not.toMatch(/<span class="katex-html"[^`'"]*/);
	});

	it('does not branch formula rendering on copy mode', () => {
		const start = source.indexOf('// 7. Resolve LaTeX placeholders');
		const end = source.indexOf('// 8. Image');
		expect(start).toBeGreaterThan(-1);
		expect(end).toBeGreaterThan(start);

		const formulaBlock = source.slice(start, end);
		expect(formulaBlock).toContain('renderLatexSvg');
		expect(formulaBlock).not.toContain('forCopy');
	});
});
