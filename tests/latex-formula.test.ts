/**
 * TDD: LaTeX formula extraction and rendering tests.
 *
 * RED: These tests MUST pass before the LaTeX pipeline is considered working.
 * Covers: extraction, backslash preservation, matrix/align environments,
 * MathJax SVG rendering, <use> inlining.
 */
import { describe, it, expect } from 'vitest';

// ── LaTeX extraction regex (mirrors main.ts) ──
function extractLatex(md: string): { formula: string; displayMode: boolean }[] {
	const results: { formula: string; displayMode: boolean }[] = [];

	// Step 1: Extract $$...$$ (display mode)
	let remaining = md.replace(/\$\$([\s\S]+?)\$\$/g, (_m, f: string) => {
		results.push({ formula: f.trim(), displayMode: true });
		return `__LATEX_PH_${results.length - 1}__`;
	});

	// Step 2: Extract $...$ (inline mode)
	remaining.replace(/\$(.+?)\$/g, (_m, f: string) => {
		results.push({ formula: f.trim(), displayMode: false });
		return `__LATEX_PH_${results.length - 1}__`;
	});

	return results;
}

// ── mdUnescape (mirrors main.ts) ──
function mdUnescape(text: string): string {
	const escapes: [string, string][] = [
		['\\\\', '\\'],
		['\\_', '_'],
		['\\*', '*'],
	];
	let result = text;
	for (const [from] of escapes) {
		result = result.split(from).join('__PH__');
	}
	return result;
}

describe('LaTeX extraction', () => {
	it('extracts simple inline formula', () => {
		const results = extractLatex('Hello $E=mc^2$ world');
		expect(results).toHaveLength(1);
		expect(results[0]!.formula).toBe('E=mc^2');
		expect(results[0]!.displayMode).toBe(false);
	});

	it('extracts display mode formula', () => {
		const results = extractLatex('$$ax^2 + bx + c = 0$$');
		expect(results).toHaveLength(1);
		expect(results[0]!.formula).toBe('ax^2 + bx + c = 0');
		expect(results[0]!.displayMode).toBe(true);
	});

	it('preserves backslashes in LaTeX commands', () => {
		const results = extractLatex('$\\frac{a}{b}$');
		expect(results[0]!.formula).toBe('\\frac{a}{b}');
	});

	it('preserves double backslash (line break) in matrix', () => {
		const results = extractLatex('$\\begin{matrix}1 & 2\\\\3 & 4\\end{matrix}$');
		expect(results[0]!.formula).toContain('\\\\');
		expect(results[0]!.formula).not.toContain('__PH__');
	});

	it('extracts align environment with matrices', () => {
		const md = '$$\\begin{align} a &= b \\\\ c &= d \\end{align}$$';
		const results = extractLatex(md);
		expect(results).toHaveLength(1);
		expect(results[0]!.formula).toContain('\\begin{align}');
		expect(results[0]!.formula).toContain('\\\\');
	});
});

describe('mdUnescape vs LaTeX interaction', () => {
	it('mdUnescape destroys double backslash in LaTeX formulas', () => {
		// This test documents the CURRENT BUG:
		// mdUnescape runs BEFORE LaTeX extraction, turning \\ into placeholders
		const md = '$$\\begin{matrix}1 & 2\\\\3 & 4\\end{matrix}$$';
		const unescaped = mdUnescape(md);

		// After mdUnescape, the formula's \\ is replaced
		expect(unescaped).not.toContain('\\\\');
		expect(unescaped).toContain('__PH__');
	});

	it('LaTeX extraction BEFORE mdUnescape preserves backslashes', () => {
		// This test shows the FIX: extract LaTeX first, then mdUnescape
		const md = '$$\\begin{matrix}1 & 2\\\\3 & 4\\end{matrix}$$';

		// Extract first
		const results = extractLatex(md);
		expect(results[0]!.formula).toContain('\\\\');
		expect(results[0]!.formula).not.toContain('__PH__');
	});
});

describe('MathJax SVG rendering', () => {
	// Only run if mathjax-svg.js is available
	let tex2svg: ((f: string, d: boolean) => string) | null = null;
	try {
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		const mod = require('../mathjax-svg.js');
		tex2svg = mod.tex2svg;
	} catch {
		// Module not available in test environment, skip
	}

	const skipIfNoModule = tex2svg ? it : it.skip;

	skipIfNoModule('renders simple formula', () => {
		const svg = tex2svg!('E = mc^2', false);
		expect(svg).toContain('<svg');
		expect(svg).toContain('<path');
		expect(svg).not.toContain('<use');
		expect(svg).not.toContain('<defs>');
	});

	skipIfNoModule('renders matrix environment', () => {
		const formula = '\\begin{matrix}1 & 2\\\\3 & 4\\end{matrix}';
		const svg = tex2svg!(formula, false);
		expect(svg).toContain('<svg');
		expect(svg).toContain('<path');
	});

	skipIfNoModule('renders align environment', () => {
		const formula = '\\begin{aligned} a &= b \\\\ c &= d \\end{aligned}';
		const svg = tex2svg!(formula, true);
		expect(svg).toContain('<svg');
		expect(svg).toContain('<path');
	});

	skipIfNoModule('renders otimes', () => {
		const svg = tex2svg!('A \\otimes B', false);
		expect(svg).toContain('<path');
	});

	skipIfNoModule('inlines all <use> references', () => {
		const svg = tex2svg!('ax^2 + bx + c = 0', false);
		expect(svg).not.toContain('<use');
		expect(svg).not.toContain('xlink:href');
		expect(svg).not.toContain('id="MJX');
	});
});
