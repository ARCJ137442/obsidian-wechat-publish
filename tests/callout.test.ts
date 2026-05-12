/**
 * TDD: Callout rendering tests
 * Tests markdown-it → transformCallouts pipeline directly
 */
import { describe, it, expect } from 'vitest';
import MarkdownIt from 'markdown-it';
import markdownItMark from 'markdown-it-mark';
import { DOMParser } from 'linkedom';

// ── Replicated plugin functions (no Obsidian API dependency) ──

function getFirstLineText(paragraph: Element): string {
	let firstLine = '';
	for (const node of Array.from(paragraph.childNodes)) {
		if (node.nodeType === 1 /* ELEMENT_NODE */ && (node as Element).tagName === 'BR') {
			break;
		}
		firstLine += node.textContent ?? '';
	}
	return firstLine;
}

const CALLOUT_TYPE_MAP: Record<string, string> = {
	'note': 'note', 'abstract': 'note', 'summary': 'note', 'tldr': 'note',
	'info': 'info', 'todo': 'info',
	'tip': 'tip', 'hint': 'tip', 'important': 'tip', 'success': 'tip', 'check': 'tip', 'done': 'tip',
	'question': 'question', 'help': 'question', 'faq': 'question',
	'warning': 'warning', 'caution': 'warning', 'attention': 'warning',
	'failure': 'danger', 'fail': 'danger', 'missing': 'danger', 'danger': 'danger', 'error': 'danger', 'bug': 'danger',
	'example': 'example',
	'quote': 'quote'
};

function getCalloutDefaultTitle(type: string): string {
	const titles: Record<string, string> = {
		'note': 'Note', 'info': 'Info', 'tip': 'Tip', 'question': 'Question',
		'warning': 'Warning', 'danger': 'Danger', 'example': 'Example', 'quote': 'Quote'
	};
	return titles[type] ?? 'Note';
}

const HEADER_REGEX = /^\[!([a-zA-Z0-9_-]+)\]([+-])?\s*(.*)$/;

function transformCallouts(html: string): string {
	const parser = new DOMParser();
	// Wrap in proper HTML structure so linkedom behaves like a real browser
	const doc = parser.parseFromString(`<!DOCTYPE html><html><body>${html}</body></html>`, 'text/html');
	const blockquotes = Array.from(doc.querySelectorAll('blockquote'));

	for (const blockquote of blockquotes) {
		const firstParagraph = blockquote.querySelector('p');
		if (!firstParagraph) continue;

		const firstLineText = getFirstLineText(firstParagraph).trim();
		const match = firstLineText.match(HEADER_REGEX);
		if (!match) continue;

		const rawType = (match[1] ?? 'note').toLowerCase();
		const customTitle = (match[3] ?? '').trim();
		const calloutType = CALLOUT_TYPE_MAP[rawType] ?? 'note';
		const calloutTitle = customTitle || getCalloutDefaultTitle(calloutType);

		// Build showcase-style callout
		const calloutDiv = doc.createElement('div');
		calloutDiv.setAttribute('class', `wechat-callout wechat-callout-${calloutType}`);

		const titleDiv = doc.createElement('div');
		titleDiv.setAttribute('class', 'wechat-callout-title');
		titleDiv.textContent = calloutTitle;
		calloutDiv.appendChild(titleDiv);

		// Body: Strategy A (<br> detection) + Strategy B (textContent slice fallback)
		const bodyDiv = doc.createElement('div');
		bodyDiv.setAttribute('class', 'wechat-callout-body');

		let foundBr = false;
		let bodyText = '';
		for (const node of Array.from(firstParagraph.childNodes)) {
			if (foundBr) {
				bodyText += node.textContent ?? '';
			} else if (node.nodeType === 1 /* ELEMENT_NODE */ && (node as Element).tagName === 'BR') {
				foundBr = true;
			}
		}
		bodyText = bodyText.trim();
		if (!bodyText) {
			const fullText = firstParagraph.textContent ?? '';
			bodyText = fullText.slice(firstLineText.length).trim();
		}
		if (bodyText) {
			while (firstParagraph.firstChild) firstParagraph.removeChild(firstParagraph.firstChild);
			firstParagraph.appendChild(doc.createTextNode(bodyText));
			bodyDiv.appendChild(firstParagraph);
		}

		const allParas = Array.from(blockquote.querySelectorAll('p'));
		for (const para of allParas) {
			if (para !== firstParagraph) {
				bodyDiv.appendChild(para);
			}
		}
		calloutDiv.appendChild(bodyDiv);
		blockquote.parentNode?.insertBefore(calloutDiv, blockquote); blockquote.remove();
	}

	return doc.body.innerHTML;
}

// ── Tests ──

const md = new MarkdownIt({ html: true, breaks: true, linkify: true });
md.use(markdownItMark);

describe('Callout Rendering', () => {

	it('renders note callout with body text (single para, <br> separator)', () => {
		const input = '> [!note] 笔记\n> 这是一条普通的笔记 Callout，用于补充说明或旁注。';
		const html = md.render(input);
		const result = transformCallouts(html);

		expect(result).toContain('wechat-callout');
		expect(result).toContain('wechat-callout-note');
		expect(result).toContain('wechat-callout-title');
		expect(result).toContain('wechat-callout-body');
		expect(result).toContain('笔记');
		expect(result).toContain('这是一条普通的笔记 Callout，用于补充说明或旁注。');
		expect(result).not.toContain('[!note]');
	});

	it('renders callout without custom title (uses default)', () => {
		const input = '> [!tip]\n> 这是一个没有自定义标题的提示。';
		const html = md.render(input);
		const result = transformCallouts(html);

		expect(result).toContain('wechat-callout-tip');
		expect(result).toContain('Tip');
		expect(result).toContain('这是一个没有自定义标题的提示。');
	});

	it('renders info callout correctly', () => {
		const input = '> [!info] 信息\n> 信息类 Callout 用淡青色调，区别于主文本但不过度饱和。';
		const html = md.render(input);
		const result = transformCallouts(html);

		expect(result).toContain('wechat-callout-info');
		expect(result).toContain('信息');
		expect(result).toContain('信息类 Callout 用淡青色调');
	});

	it('renders callout with multi-line body', () => {
		const input = '> [!warning] 警告\n> 第一行警告内容。\n> 第二行警告内容。';
		const html = md.render(input);
		const result = transformCallouts(html);

		expect(result).toContain('第一行警告内容');
		expect(result).toContain('第二行警告内容');
	});

	it('leaves regular blockquotes unchanged', () => {
		const input = '> 这不是一个 callout，只是普通引用。';
		const html = md.render(input);
		const result = transformCallouts(html);

		expect(result).toContain('<blockquote>');
		expect(result).not.toContain('wechat-callout');
	});

	it('handles all 7 callout types from test file', () => {
		const types = ['note', 'info', 'tip', 'question', 'warning', 'danger', 'example'];
		for (const type of types) {
			const input = `> [!${type}] 标题\n> ${type} 类型的 body 内容。`;
			const html = md.render(input);
			const result = transformCallouts(html);

			expect(result, `${type}: should contain callout class`).toContain(`wechat-callout-${type}`);
			expect(result, `${type}: should contain body`).toContain(`${type} 类型的 body 内容`);
		}
	});

	it('callout body appears AFTER title div, not before', () => {
		const input = '> [!note] 笔记\n> Body text here.';
		const html = md.render(input);
		const result = transformCallouts(html);

		const titleIdx = result.indexOf('wechat-callout-title');
		const bodyIdx = result.indexOf('wechat-callout-body');
		expect(titleIdx).toBeLessThan(bodyIdx);
	});

});
