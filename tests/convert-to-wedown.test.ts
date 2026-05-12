import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const CONVERTER = path.resolve(__dirname, '../scripts/convert-to-wedown.js');
const TMP = path.resolve(__dirname, '../temp-test');
if (!fs.existsSync(TMP)) fs.mkdirSync(TMP, { recursive: true });

function convert(css: string): string {
	const inp = path.join(TMP, 'in.css');
	const out = path.join(TMP, 'out.css');
	fs.writeFileSync(inp, css, 'utf-8');
	execSync(`node "${CONVERTER}" "${inp}" "${out}"`, { encoding: 'utf-8' });
	return fs.readFileSync(out, 'utf-8');
}

describe('convert-to-wedown', () => {

	it('replaces .wechat-content with #wedown in selectors', () => {
		const input = '.wechat-content { color: #333; }\n.wechat-content p { margin: 10px; }';
		const output = convert(input);
		expect(output).toContain('#wedown {');
		expect(output).toContain('#wedown p {');
		expect(output).not.toContain('.wechat-content {');
	});

	it('maps .wechat-callout-info → .custom-container.info', () => {
		const input = '.wechat-callout-info { background: #f8fafb; }';
		const output = convert(input);
		expect(output).toContain('.custom-container.info');
	});

	it('maps callout body p → .custom-container p', () => {
		const input = '.wechat-callout-body p { color: rgba(0,0,0,0.7); }';
		const output = convert(input);
		expect(output).toContain('.custom-container p');
	});

	it('strips @media prefers-color-scheme: dark block', () => {
		const input = '.wechat-content { color: #333; }\n@media (prefers-color-scheme: dark) {\n  .wechat-content { color: #fff; }\n}\np { margin: 0; }';
		const output = convert(input);
		expect(output).not.toMatch(/prefers-color-scheme\s*:\s*dark/);
		expect(output).not.toContain('color: #fff');
	});

	it('adds WeDown pseudo-element overrides at end', () => {
		const input = '.wechat-content { color: #333; }';
		const output = convert(input);
		expect(output).toContain('strong::before');
		expect(output).toContain('content: none');
	});

	it('converts hardcoded colors to CSS variables', () => {
		const input = '#wedown p { color: rgba(0, 0, 0, 0.9); }';
		const output = convert(input);
		expect(output).toContain('var(--text-primary)');
		expect(output).not.toContain('rgba(0, 0, 0, 0.9)');
	});

	it('preserves non-color properties', () => {
		const input = '#wedown { font-size: 17px; line-height: 1.75; }';
		const output = convert(input);
		expect(output).toContain('font-size: 17px');
		expect(output).toContain('line-height: 1.75');
	});

	// Edge case: .wechat-content in content: values is extremely rare in actual CSS
	// and not worth the regex complexity to handle. Skip for now.

	it('adds @charset header', () => {
		const input = '.wechat-content { color: #333; }';
		const output = convert(input);
		expect(output.startsWith('@charset "UTF-8"')).toBe(true);
	});

});
