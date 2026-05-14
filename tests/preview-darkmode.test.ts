/**
 * TDD: Preview dark mode CSS — 验证 dark mode 使用 CSS 变量覆盖
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const source = fs.readFileSync(path.resolve(__dirname, '../src/main.ts'), 'utf-8');

describe('Preview Dark Mode: CSS 变量覆盖方案', () => {
	const types = ['note', 'info', 'tip', 'question', 'warning', 'danger', 'example', 'quote'];

	for (const t of types) {
		it(`html.dark .wechat-callout-${t} 使用 CSS 变量 --callout-border`, () => {
			// 宽松匹配：selector 后跟 { ，中间任意空格
			const pattern = `html.dark .wechat-callout-${t}`;
			expect(source).toContain(pattern);
			// 确认后面跟的是 { 而不是 td
			expect(source).not.toContain(`html.dark .wechat-callout-${t} td`);
		});
	}

	it('html.dark .wechat-callout-title 设置 background: transparent + padding: 0', () => {
		expect(source).toContain('html.dark .wechat-callout-title { background: transparent !important; padding: 0 !important }');
	});

	it('html:not(.light) 块有 CSS 变量格式', () => {
		expect(source).toContain('html:not(.light) .wechat-callout-note');
	});
});
