/**
 * TDD: Callout Alias Resolution — 钉死 custom type alias 解析
 *
 * 架构原则：
 * - CALLOUT_ALIASES / CALLOUT_THEMES 只包含 Obsidian 内置类型
 * - custom 类型完全来自 buildMergedCalloutData(JSON) 动态注入
 * - buildMergedCalloutData 执行后：custom 类型 alias → 自己，theme 有颜色定义
 */
import { describe, it, expect } from 'vitest';
import { buildMergedCalloutData, getActiveAliases, getActiveThemes } from '../src/callout-plugin';
import type { CalloutManagerJson } from '../src/callout-plugin';

// 读取真实 vault 的 callout-manager JSON
import * as fs from 'fs';
const VAULT_CM = JSON.parse(
    fs.readFileSync('H:/A137442/Document/life-series/.obsidian/plugins/callout-manager/data.json', 'utf-8')
) as CalloutManagerJson;

describe('内置类型 alias（默认状态）', () => {
    it('todo → info（Obsidian 内置别名）', () => {
        expect(getActiveAliases()['todo']).toBe('info');
    });
    it('abstract → note（Obsidian 内置别名）', () => {
        expect(getActiveAliases()['abstract']).toBe('note');
    });
    it('tip → tip（自身）', () => {
        expect(getActiveAliases()['tip']).toBe('tip');
    });
    it('warning → warning（自身）', () => {
        expect(getActiveAliases()['warning']).toBe('warning');
    });
});

describe('buildMergedCalloutData 后：custom 类型动态注册', () => {
    const { themes, aliases } = buildMergedCalloutData(VAULT_CM);

    it('custom 列表中的类型 alias → 自己', () => {
        for (const type of VAULT_CM.callouts.custom) {
            expect(aliases[type]).toBe(type);
        }
    });

    it('custom 列表中的类型有 theme 定义（颜色来自 JSON）', () => {
        for (const type of VAULT_CM.callouts.custom) {
            expect(themes[type]).toBeDefined();
            expect(themes[type].border).toBeDefined();
        }
    });

    it('btw 是 custom 类型，alias → 自己，theme 有 icon', () => {
        expect(aliases['btw']).toBe('btw');
        expect(themes['btw']).toBeDefined();
        expect(themes['btw'].icon).toBe('lucide-git-branch');
        expect(themes['btw'].border).toMatch(/hsl/); // HSL 派生颜色
    });

    it('todo（custom）是独立类型，非 info', () => {
        // 在 callout-manager JSON 中，todo 是 custom 类型
        expect(aliases['todo']).toBe('todo');
        expect(aliases['todo']).not.toBe('info');
        expect(themes['todo']).toBeDefined();
    });

    it('内置类型未被 custom JSON 覆盖时保持原样', () => {
        expect(aliases['note']).toBe('note');
        expect(themes['note'].border).toBe('#888'); // 内置 HEX 颜色
    });
});
