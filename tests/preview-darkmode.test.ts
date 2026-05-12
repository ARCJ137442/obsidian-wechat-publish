/**
 * TDD: Preview dark mode — callout <td> background matching.
 *
 * Bug: .wechat-callout-note { background: ... } targets <table>,
 *      but inline style is on <td>. TD background occludes table background.
 *
 * Fix: change selector to .wechat-callout-note td { background: ... !important }
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

// Read the ACTUAL source code to verify CSS selectors
const source = fs.readFileSync(path.resolve(__dirname, '../src/main.ts'), 'utf-8');

describe('Preview Dark Mode: Callout TD Background (source check)', () => {

	const types = ['note', 'info', 'tip', 'question', 'warning', 'danger', 'example', 'quote'];

	for (const t of types) {
		it(`html.dark .wechat-callout-${t} targets <td> element`, () => {
			// Find the dark mode callout rule for this type
			const pattern = new RegExp(`html\\.dark\\s+\\.wechat-callout-${t}\\s+td\\s*\\{`);
			expect(source).toMatch(pattern);
		});

		it(`html.dark .wechat-callout-${t} does NOT set background on table directly`, () => {
			// There should be NO rule like ".wechat-callout-note { background" (without td)
			const badPattern = new RegExp(`html\\.dark\\s+\\.wechat-callout-${t}\\s*\\{[^}]*background`);
			expect(badPattern.test(source)).toBe(false);
		});
	}

});
