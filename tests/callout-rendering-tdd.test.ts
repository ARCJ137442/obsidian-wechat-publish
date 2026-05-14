/**
 * TDD: Callout Rendering — 钉死实际 bug
 *
 * 目标：验证三个问题是否解决
 * 1. 标题 span 周围无 background 框（CSS 变量方案）
 * 2. 图标颜色使用 currentColor / CSS 变量
 * 3. 未找到图标时控制台警告
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import preprocessCallouts, { getIconSvg, getActiveThemes, buildMergedCalloutData, setupCalloutData } from '../src/callout-plugin';
import type { CalloutManagerJson } from '../src/callout-plugin';
import * as fs from 'fs';

// ── 加载真实 vault JSON ──
const VAULT_CM = JSON.parse(
    fs.readFileSync('H:/A137442/Document/life-series/.obsidian/plugins/callout-manager/data.json', 'utf-8')
) as CalloutManagerJson;

// ── 初始化：把合并后的数据注入插件状态 ──
const { themes, aliases } = buildMergedCalloutData(VAULT_CM);
setupCalloutData(themes, aliases);

// ── Setup: 捕获 console.warn ──
let warnings: string[] = [];
beforeEach(() => {
    warnings = [];
    vi.spyOn(console, 'warn').mockImplementation((msg: string) => { warnings.push(msg); });
});
afterEach(() => { vi.restoreAllMocks(); });

// ── 1. 标题 span 不应有 background 覆盖 ──
describe('BUG-1: 标题 span 周围无 background 框', () => {
    it('内置 note callout: 标题 <span> 无 background 内联样式', () => {
        const md = `> [!note] 笔记\n> 这是一条普通笔记。`;
        const html = preprocessCallouts(md);
        // 标题 span class="wechat-callout-title"，style 中不应有 background
        const titleSpanMatch = html.match(/<span[^>]*class="wechat-callout-title"[^>]*>/);
        expect(titleSpanMatch).not.toBeNull();
        const titleSpan = titleSpanMatch![0];
        const styleMatch = titleSpan.match(/style="([^"]*)"/);
        if (styleMatch) {
            expect(styleMatch[1]).not.toMatch(/background/);
        }
        // 标题文字颜色必须来自 CSS 变量
        expect(titleSpan).toMatch(/color:\s*var\(--callout-title-color\)/);
    });

    it('自定义 btw callout: 标题 span 无 background 内联样式', () => {
        const md = `> [!btw] 岔题\n> 这是一条岔题内容。`;
        const html = preprocessCallouts(md);
        const titleSpanMatch = html.match(/<span[^>]*class="wechat-callout-title"[^>]*>/);
        expect(titleSpanMatch).not.toBeNull();
        const titleSpan = titleSpanMatch![0];
        const styleMatch = titleSpan.match(/style="([^"]*)"/);
        if (styleMatch) {
            expect(styleMatch[1]).not.toMatch(/background/);
        }
    });

    it('table 上必须有 CSS 变量 --callout-title-bg 定义', () => {
        const md = `> [!note] 笔记\n> 内容`;
        const html = preprocessCallouts(md);
        expect(html).toMatch(/style="[^"]*--callout-title-bg/);
    });
});

// ── 2. 图标颜色使用 CSS 变量 currentColor ──
describe('BUG-2: 图标颜色', () => {
    it('内置 tip callout: 有 lightbulb 图标', () => {
        const md = `> [!tip] 提示\n> 这是一条提示。`;
        const html = preprocessCallouts(md);
        expect(html).toContain('wechat-callout-icon');
        expect(html).toContain('lucide-lightbulb');
    });

    it('自定义 btw callout（有 icon）: 图标 span 使用 CSS 变量 color:var(--callout-title-color)', () => {
        const md = `> [!btw] 岔题\n> 内容`;
        const html = preprocessCallouts(md);
        expect(html).toContain('wechat-callout-icon');
        expect(html).toMatch(/class="wechat-callout-icon"[^>]*style="[^"]*color:\s*var\(--callout-title-color\)/);
    });

    it('getIconSvg 返回的 SVG 使用 stroke="currentColor"', () => {
        const svg = getIconSvg('lucide-list-todo');
        expect(svg).toContain('stroke="currentColor"');
    });

    it('lucide-list-todo 能被动态找到（vitest 加载了 lucide-static）', () => {
        const svg = getIconSvg('lucide-list-todo');
        expect(svg).not.toBe('');
        expect(svg).toContain('<svg');
        expect(svg).toContain('stroke="currentColor"');
    });

    it('不存在的图标: 返回空字符串并报告 console.warn', () => {
        const svg = getIconSvg('lucide-xyz-nonexistent-icon-12345');
        expect(svg).toBe('');
        expect(warnings.some(w => w.includes('lucide-xyz-nonexistent-icon-12345'))).toBe(true);
    });
});

// ── 3. CSS 变量必须在 table style 上正确定义 ──
describe('BUG-3: CSS 变量完整性', () => {
    it('note callout table 包含全部 4 个 CSS 变量', () => {
        const md = `> [!note] 笔记\n> 内容`;
        const html = preprocessCallouts(md);
        expect(html).toMatch(/--callout-border/);
        expect(html).toMatch(/--callout-bg/);
        expect(html).toMatch(/--callout-title-color/);
        expect(html).toMatch(/--callout-title-bg/);
    });

    it('自定义 btw callout 也有 CSS 变量', () => {
        const md = `> [!btw] 岔题\n> 内容`;
        const html = preprocessCallouts(md);
        expect(html).toMatch(/--callout-border/);
        expect(html).toMatch(/--callout-bg/);
    });
});

// ── 3b. 内置类型默认图标（Obsidian 官方映射） ──
describe('BUG-2b: 内置类型默认 lucide 图标', () => {
    it('note callout 输出包含 lucide-info 图标', () => {
        const md = `> [!note] 笔记\n> 这是一条普通笔记。`;
        const html = preprocessCallouts(md);
        expect(html).toContain('wechat-callout-icon');
        expect(html).toContain('lucide-info');
    });

    it('tip callout 输出包含 lucide-lightbulb 图标', () => {
        const md = `> [!tip] 提示\n> 这是一条提示。`;
        const html = preprocessCallouts(md);
        expect(html).toContain('wechat-callout-icon');
        expect(html).toContain('lucide-lightbulb');
    });

    it('warning callout 输出包含 lucide-triangle-alert 图标', () => {
        const md = `> [!warning] 警告\n> 这是一条警告。`;
        const html = preprocessCallouts(md);
        expect(html).toContain('wechat-callout-icon');
        expect(html).toContain('lucide-triangle-alert');
    });

    it('danger callout 输出包含 lucide-flame 图标', () => {
        const md = `> [!danger] 危险\n> 这是一条危险提示。`;
        const html = preprocessCallouts(md);
        expect(html).toContain('wechat-callout-icon');
        expect(html).toContain('lucide-flame');
    });

    it('example callout 输出包含 lucide-flag 图标', () => {
        const md = `> [!example] 示例\n> 这是一个示例。`;
        const html = preprocessCallouts(md);
        expect(html).toContain('wechat-callout-icon');
        expect(html).toContain('lucide-flag');
    });

    it('quote callout 输出包含 lucide-quote 图标', () => {
        const md = `> [!quote] 引用\n> 这是一段引用。`;
        const html = preprocessCallouts(md);
        expect(html).toContain('wechat-callout-icon');
        expect(html).toContain('lucide-quote');
    });

    it('question callout 输出包含 lucide-circle-question-mark 图标', () => {
        const md = `> [!question] 问题\n> 这是一个问题。`;
        const html = preprocessCallouts(md);
        expect(html).toContain('wechat-callout-icon');
        expect(html).toContain('lucide-circle-question-mark');
    });
});

// ── 4. 预览 HTML 生成（集成测试） ──
describe('预览 HTML 生成', () => {
    it('生成完整可预览的 HTML 文档（内置 note）', () => {
        const md = `> [!note] 笔记\n> 这是一条普通笔记。`;
        const processed = preprocessCallouts(md);
        expect(processed).toContain('wechat-callout-note');
        expect(processed).toMatch(/background:\s*var\(--callout-bg\)/);
    });

    it('生成带图标的 callout HTML（btw → btw 自定义类型）', () => {
        const md = `> [!btw] 岔题\n> 内容`;
        const processed = preprocessCallouts(md);
        expect(processed).toContain('wechat-callout-btw');
        expect(processed).toContain('lucide-git-branch');
    });

    it('生成带 todo 图标的 callout HTML（todo → todo 自定义类型）', () => {
        const md = `> [!todo] 待办\n> 这是一条待办`;
        const processed = preprocessCallouts(md);
        expect(processed).toContain('wechat-callout-todo');
        expect(processed).toContain('lucide-list-todo');
        expect(processed).toContain('wechat-callout-icon');
    });
});
