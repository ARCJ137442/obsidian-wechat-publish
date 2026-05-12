/**
 * TDD: Template rename — fillTemplate function
 * Ported from series.template.md 模板填充()
 */
import { describe, it, expect } from 'vitest';
import { fillTemplate } from '../src/template-fill';

describe('fillTemplate — Python-style string formatting', () => {

	// ── Basic substitution ──

	it('replaces {key} with value', () => {
		expect(fillTemplate('{theme}', { theme: '行' })).toBe('行');
	});

	it('replaces multiple {key} placeholders', () => {
		expect(fillTemplate('{a} {b}', { a: 'hello', b: 'world' })).toBe('hello world');
	});

	it('leaves unmatched placeholders as-is', () => {
		expect(fillTemplate('{missing}', {})).toBe('{missing}');
	});

	// ── Type formatting ──

	it(':d formats as integer', () => {
		expect(fillTemplate('{n:d}', { n: 3.7 })).toBe('3');
	});

	it(':f formats as float with 2 decimal places', () => {
		expect(fillTemplate('{n:f}', { n: 3 })).toBe('3.00');
	});

	it(':x formats as hex', () => {
		expect(fillTemplate('{n:x}', { n: 255 })).toBe('ff');
	});

	// ── Width and alignment ──

	it(':03d zero-pads to 3 digits', () => {
		expect(fillTemplate('{n:03d}', { n: 16 })).toBe('016');
	});

	it(':03d does not truncate when value exceeds width', () => {
		expect(fillTemplate('{n:03d}', { n: 1000 })).toBe('1000');
	});

	it(':5 right-aligns with spaces (default)', () => {
		expect(fillTemplate('{n:5}', { n: 'ab' })).toBe('   ab');
	});

	it(':>5 right-aligns with spaces (explicit)', () => {
		expect(fillTemplate('{n:>5}', { n: 'ab' })).toBe('   ab');
	});

	it(':<5 left-aligns with spaces', () => {
		expect(fillTemplate('{n:<5}', { n: 'ab' })).toBe('ab   ');
	});

	// ── Real-world scenario ──

	it('fills the series title template correctly', () => {
		const template = '{serie-num:03d} {theme}｜{title}';
		const vars = { 'serie-num': 16, theme: '行', title: '适可而止' };
		expect(fillTemplate(template, vars)).toBe('016 行｜适可而止');
	});

	it('works when serie-num is a string (YAML parsed)', () => {
		const template = '{serie-num:03d} {theme}｜{title}';
		const vars = { 'serie-num': '16', theme: '行', title: '适可而止' };
		expect(fillTemplate(template, vars)).toBe('016 行｜适可而止');
	});

	it('handles single-digit serie-num with zero-padding', () => {
		const template = '{serie-num:03d} {theme}｜{title}';
		const vars = { 'serie-num': 1, theme: '启', title: '新的开始' };
		expect(fillTemplate(template, vars)).toBe('001 启｜新的开始');
	});

	// ── Edge cases ──

	it('handles empty template', () => {
		expect(fillTemplate('', {})).toBe('');
	});

	it('handles template with no placeholders', () => {
		expect(fillTemplate('plain text', { x: 'ignored' })).toBe('plain text');
	});

	it('returns value as-is for non-string values without format', () => {
		expect(fillTemplate('{n}', { n: 42 })).toBe('42');
	});
});
