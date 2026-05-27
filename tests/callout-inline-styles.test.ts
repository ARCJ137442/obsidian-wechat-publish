/**
 * TDD: Callout Inline Styles — 验证 callout 内部的 markdown 语法能被正确解析
 *
 * 目标：验证以下问题是否解决
 * 1. 标题中的 markdown 语法（粗体、斜体、高亮等）能被正确解析
 * 2. 正文中的 markdown 语法（粗体、斜体、高亮、列表、代码等）能被正确解析
 */
import { describe, it, expect, beforeAll } from 'vitest';
import MarkdownIt from 'markdown-it';
import markdownItMark from 'markdown-it-mark';
import preprocessCallouts, {
    postprocessCallouts,
    getActiveThemes,
    buildMergedCalloutData,
    setupCalloutData,
} from '../src/callout-plugin';
import type { CalloutManagerJson } from '../src/callout-plugin';
import * as fs from 'fs';

// ── 加载真实 vault JSON ──
const VAULT_CM = JSON.parse(
    fs.readFileSync('H:/A137442/Document/life-series/.obsidian/plugins/callout-manager/data.json', 'utf-8')
) as CalloutManagerJson;

// ── 初始化：把合并后的数据注入插件状态 ──
const { themes, aliases } = buildMergedCalloutData(VAULT_CM);
setupCalloutData(themes, aliases);

// ── Pipeline replica ──
function renderCalloutMarkdown(mdText: string): string {
    const md = new MarkdownIt({ html: true, breaks: true, linkify: true });
    md.use(markdownItMark);

    const preprocessed = preprocessCallouts(mdText);
    let html = md.render(preprocessed);
    html = postprocessCallouts(html);

    return html;
}

// ── Tests ──

describe('Callout 标题 markdown 语法', () => {
    it('标题中的粗体 **text** 被正确解析', () => {
        const md = `> [!note] 这是**重要**提示\n> 正文内容`;
        const html = renderCalloutMarkdown(md);
        expect(html).toContain('<strong>重要</strong>');
        expect(html).toContain('wechat-callout-title');
    });

    it('标题中的斜体 *text* 被正确解析', () => {
        const md = `> [!note] 这是*强调*标题\n> 正文内容`;
        const html = renderCalloutMarkdown(md);
        expect(html).toContain('<em>强调</em>');
    });

    it('标题中的高亮 ==text== 被正确解析', () => {
        const md = `> [!note] 这是==高亮==标题\n> 正文内容`;
        const html = renderCalloutMarkdown(md);
        expect(html).toContain('<mark>高亮</mark>');
    });

    it('标题中的行内代码 `code` 被正确解析', () => {
        const md = `> [!note] 这是\`代码\`标题\n> 正文内容`;
        const html = renderCalloutMarkdown(md);
        expect(html).toContain('<code>代码</code>');
    });

    it('标题中的链接 [text](url) 被正确解析', () => {
        const md = `> [!note] 这是[链接](https://example.com)标题\n> 正文内容`;
        const html = renderCalloutMarkdown(md);
        expect(html).toContain('<a href="https://example.com">链接</a>');
    });
});

describe('Callout 正文 markdown 语法', () => {
    it('正文中的粗体 **text** 被正确解析', () => {
        const md = `> [!note] 标题\n> 正文包含**粗体**文字`;
        const html = renderCalloutMarkdown(md);
        expect(html).toContain('<strong>粗体</strong>');
        expect(html).toContain('wechat-callout-body');
    });

    it('正文中的斜体 *text* 被正确解析', () => {
        const md = `> [!note] 标题\n> 正文包含*斜体*文字`;
        const html = renderCalloutMarkdown(md);
        expect(html).toContain('<em>斜体</em>');
    });

    it('正文中的高亮 ==text== 被正确解析', () => {
        const md = `> [!note] 标题\n> 正文包含==高亮==文字`;
        const html = renderCalloutMarkdown(md);
        expect(html).toContain('<mark>高亮</mark>');
    });

    it('正文中的行内代码 `code` 被正确解析', () => {
        const md = `> [!note] 标题\n> 正文包含\`代码\`文字`;
        const html = renderCalloutMarkdown(md);
        expect(html).toContain('<code>代码</code>');
    });

    it('正文中的链接 [text](url) 被正确解析', () => {
        const md = `> [!note] 标题\n> 正文包含[链接](https://example.com)文字`;
        const html = renderCalloutMarkdown(md);
        expect(html).toContain('<a href="https://example.com">链接</a>');
    });
});

describe('Callout 块级元素', () => {
    it('正文中的列表被正确解析', () => {
        const md = `> [!note] 标题\n> - 列表项1\n> - 列表项2`;
        const html = renderCalloutMarkdown(md);
        expect(html).toContain('<ul>');
        expect(html).toContain('<li>列表项1</li>');
        expect(html).toContain('<li>列表项2</li>');
    });

    it('正文中的有序列表被正确解析', () => {
        const md = `> [!note] 标题\n> 1. 第一项\n> 2. 第二项`;
        const html = renderCalloutMarkdown(md);
        expect(html).toContain('<ol>');
        expect(html).toContain('<li>第一项</li>');
    });

    it('正文中的代码块被正确解析', () => {
        const md = `> [!note] 标题\n> \`\`\`javascript\n> const x = 1;\n> \`\`\``;
        const html = renderCalloutMarkdown(md);
        expect(html).toContain('<pre>');
        expect(html).toContain('<code');
    });
});

describe('Callout 结构完整性', () => {
    it('callout 被正确包装为 table 结构', () => {
        const md = `> [!note] 标题\n> 正文内容`;
        const html = renderCalloutMarkdown(md);
        expect(html).toContain('<table class="wechat-callout-table wechat-callout-note"');
        expect(html).toContain('wechat-callout-title');
        expect(html).toContain('wechat-callout-body');
    });

    it('callout 类型被正确识别', () => {
        const md = `> [!warning] 警告标题\n> 警告内容`;
        const html = renderCalloutMarkdown(md);
        expect(html).toContain('wechat-callout-warning');
    });

    it('空 callout body 被正确处理', () => {
        const md = `> [!note] 仅标题`;
        const html = renderCalloutMarkdown(md);
        expect(html).toContain('wechat-callout-title');
        expect(html).toContain('仅标题');
    });
});

describe('Callout 边界情况', () => {
    it('标题中的特殊字符被正确处理', () => {
        const md = `> [!note] 标题 with <special> & "chars"\n> 正文`;
        const html = renderCalloutMarkdown(md);
        expect(html).toContain('wechat-callout-title');
        expect(html).toContain('标题');
    });

    it('正文中混合多种 markdown 语法', () => {
        const md = `> [!note] 标题\n> **粗体** 和 *斜体* 和 ==高亮== 和 \`代码\``;
        const html = renderCalloutMarkdown(md);
        expect(html).toContain('<strong>粗体</strong>');
        expect(html).toContain('<em>斜体</em>');
        expect(html).toContain('<mark>高亮</mark>');
        expect(html).toContain('<code>代码</code>');
    });
});
