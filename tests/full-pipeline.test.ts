/**
 * TDD: Full pipeline test — .md file → HTML output
 * Tests the complete processMarkdown pipeline with real Obsidian content.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import MarkdownIt from 'markdown-it';
import markdownItMark from 'markdown-it-mark';
import fs from 'fs';
import path from 'path';

// ── Test data ──
const TEST_MD_PATH = path.resolve(__dirname, 'fixtures/样式测试 - 全元素覆盖.md');

function loadTestFile(): string {
	return fs.readFileSync(TEST_MD_PATH, 'utf-8');
}

// ── Callout preprocessor (from src/callout-plugin.ts) ──
const CALLOUT_THEMES: Record<string, { border: string; bg: string; titleColor: string }> = {
	note: { border: '#888', bg: '#fafafa', titleColor: '#555' },
	info: { border: '#7ba7bc', bg: '#f8fafb', titleColor: '#4a7585' },
	tip: { border: '#7ba37b', bg: '#f8faf8', titleColor: '#4a704a' },
	question: { border: '#b7a07b', bg: '#faf9f6', titleColor: '#7a684a' },
	warning: { border: '#bc9a7b', bg: '#faf7f4', titleColor: '#856a4a' },
	danger: { border: '#bc7b7b', bg: '#faf5f5', titleColor: '#854a4a' },
	example: { border: '#7baa99', bg: '#f6faf9', titleColor: '#4a7566' },
	quote: { border: '#999', bg: '#f8f8f8', titleColor: '#666' },
};
const CALLOUT_ALIASES: Record<string, string> = {
	note: 'note', abstract: 'note', summary: 'note', tldr: 'note',
	info: 'info', todo: 'info', tip: 'tip', hint: 'tip', important: 'tip', success: 'tip', check: 'tip', done: 'tip',
	question: 'question', help: 'question', faq: 'question',
	warning: 'warning', caution: 'warning', attention: 'warning',
	danger: 'danger', error: 'danger', bug: 'danger', failure: 'danger', fail: 'danger', missing: 'danger',
	example: 'example', quote: 'quote'
};
const CALLOUT_TITLES: Record<string, string> = { note: 'Note', info: 'Info', tip: 'Tip', question: 'Question', warning: 'Warning', danger: 'Danger', example: 'Example', quote: 'Quote' };
function preprocessCallouts(md: string): string {
	return md.replace(/^> \[!([a-zA-Z0-9_-]+)\]([+-])?[ \t]*([^\n]*)\n((?:> [^\n]*\n?)*)/gm, (_f: string, rt: string, _fl: string | undefined, title: string, bb: string) => {
		const ct = CALLOUT_ALIASES[rt.toLowerCase()] ?? 'note';
		const t = CALLOUT_THEMES[ct]!;
		const cTitle = title.trim() || CALLOUT_TITLES[ct] || 'Note';
		const body = bb.split('\n').filter(l => l.trim()).map(l => l.replace(/^>\s?/, '')).join('\n').trim();
		const bodyLines = body.split('\n').map(line => `<p style="margin:0 0 6px 0;color:rgba(0,0,0,0.7);font-size:15px;line-height:1.75">${line}</p>`).join('\n');
		return `<table style="width:100%;margin:20px 0;border-collapse:collapse;border-spacing:0"><tbody><tr><td style="border-left:3px solid ${t.border};background:${t.bg};padding:12px 16px;border-radius:4px">\n<p style="margin:0 0 8px 0;color:${t.titleColor};font-size:14px;font-weight:600;line-height:1.6">${cTitle}</p>\n${bodyLines}\n</td></tr></tbody></table>\n`;
	});
}

// ── Plugin helpers (extracted from plugin, no Obsidian deps) ──

function stripFrontmatter(text: string): string {
	if (text.startsWith('---')) {
		const end = text.indexOf('---', 3);
		if (end !== -1) return text.slice(end + 3).trim();
	}
	return text;
}

const ESC_MAP = new Map<string, string>();
function mdUnescape(text: string): string {
	ESC_MAP.clear();
	const escapes: [string, string][] = [
		['\\\\', '\\'], ['\\_', '_'], ['\\*', '*'], ['\\`', '`'],
		['\\#', '#'], ['\\+', '+'], ['\\-', '-'], ['\\.', '.'],
		['\\!', '!'], ['\\(', '('], ['\\)', ')'], ['\\[', '['],
		['\\]', ']'], ['\\{', '{'], ['\\}', '}'], ['\\~', '~'],
	];
	for (let i = 0; i < escapes.length; i++) {
		const ph = `\uE000MDESC${i}\uE000`;
		ESC_MAP.set(ph, escapes[i][1]);
		text = text.split(escapes[i][0]).join(ph);
	}
	return text;
}
function restoreEscapes(text: string): string {
	for (const [ph, ch] of ESC_MAP) text = text.split(ph).join(ch);
	return text;
}

// ── Callout preprocessor: MD source → MD source with callout HTML blocks ──
const CALLOUT_TYPES: Record<string, string> = {
	'note': 'note', 'abstract': 'note', 'summary': 'note', 'tldr': 'note',
	'info': 'info', 'todo': 'info',
	'tip': 'tip', 'hint': 'tip', 'important': 'tip', 'success': 'tip', 'check': 'tip', 'done': 'tip',
	'question': 'question', 'help': 'question', 'faq': 'question',
	'warning': 'warning', 'caution': 'warning', 'attention': 'warning',
	'danger': 'danger', 'error': 'danger', 'bug': 'danger', 'failure': 'danger', 'fail': 'danger', 'missing': 'danger',
	'example': 'example', 'quote': 'quote'
};
const TITLES: Record<string, string> = {
	'note': 'Note', 'info': 'Info', 'tip': 'Tip', 'question': 'Question',
	'warning': 'Warning', 'danger': 'Danger', 'example': 'Example', 'quote': 'Quote'
};
// ── Full pipeline ──
function processMarkdown(md: string): string {
	return mdUnescape(md);
}

function renderToHTML(mdText: string): string {
	const md = new MarkdownIt({ html: true, breaks: true, linkify: true });
	md.use(markdownItMark);
	const processed = processMarkdown(mdText);
	const preprocessed = preprocessCallouts(processed);
	const html = md.render(preprocessed);
	return restoreEscapes(html);
}

// ── Tests ──

let rawMd: string;
let htmlOutput: string;

describe('Full Pipeline: 样式测试 - 全元素覆盖.md', () => {

	beforeAll(() => {
		rawMd = loadTestFile();
		const body = stripFrontmatter(rawMd);
		const processed = processMarkdown(body);
		htmlOutput = renderToHTML(processed);
	});

	it('produces non-empty HTML', () => {
		expect(htmlOutput.length).toBeGreaterThan(100);
	});

	// ── Callouts ──
	describe('Obsidian Callouts', () => {
		const calloutTests = [
			{ type: 'note',    title: '笔记', body: '这是一条普通的笔记 Callout，用于补充说明或旁注。' },
			{ type: 'info',    title: '信息', body: '信息类 Callout 用淡青色调' },
			{ type: 'tip',     title: '提示', body: '提示类 Callout 用淡绿色调' },
			{ type: 'question',title: '问题', body: '问题类 Callout 用暖棕色' },
			{ type: 'warning', title: '警告', body: '警告类 Callout 用暖灰色调' },
			{ type: 'danger',  title: '危险', body: '危险类 Callout 用暖红色' },
			{ type: 'example', title: '示例', body: '示例类 Callout 用青绿色' },
		];

		for (const tc of calloutTests) {
			it(`renders ${tc.type} callout with title and body`, () => {
				expect(htmlOutput).toContain('border-left:3px solid');
				expect(htmlOutput).toContain(tc.title);
				expect(htmlOutput).toContain(tc.body);
			});
		}

		it('does not contain raw [! prefix in output', () => {
			expect(htmlOutput).not.toMatch(/\[!note\]/);
			expect(htmlOutput).not.toMatch(/\[!info\]/);
		});

		it('has correct callout DOM structure', () => {
			// Title div before body div
			const titleIdx = htmlOutput.indexOf('<td');
			const bodyIdx = htmlOutput.indexOf('这是一条普通的笔记 Callout');
			expect(titleIdx).toBeGreaterThan(0);
			expect(bodyIdx).toBeGreaterThan(titleIdx);
		});
	});

	// ── Regular blockquotes ──
	it('preserves regular blockquotes with <blockquote> tag', () => {
		expect(htmlOutput).toMatch(/<blockquote>/);
		expect(htmlOutput).toContain('加西亚·马尔克斯');
	});

	// ── Other elements ──
	it('renders headings', () => {
		expect(htmlOutput).toMatch(/<h1>/);
		expect(htmlOutput).toMatch(/<h2>/);
	});

	it('renders bold and highlight', () => {
		expect(htmlOutput).toMatch(/<strong>/);
		expect(htmlOutput).toMatch(/<mark>/);
	});

	it('renders code blocks and inline code', () => {
		expect(htmlOutput).toMatch(/<pre><code[ >]/);
		expect(htmlOutput).toMatch(/<code>/);
	});

	it('renders tables', () => {
		expect(htmlOutput).toMatch(/<table>/);
		expect(htmlOutput).toContain('011 念');
	});

	it('renders backslash escapes correctly', () => {
		// The shrug ¯\_(ツ)_/¯ should render correctly
		expect(htmlOutput).toContain('¯\\_(ツ)_/¯');
		// Escape placeholders should NOT leak
		expect(htmlOutput).not.toMatch(/MDESC\d/);
		expect(htmlOutput).not.toMatch(/\uE000MDESC/);
	});

	it('renders lists with nesting', () => {
		expect(htmlOutput).toMatch(/<ul>/);
		expect(htmlOutput).toMatch(/<ol>/);
		expect(htmlOutput).toContain('日子系列');
	});
});
