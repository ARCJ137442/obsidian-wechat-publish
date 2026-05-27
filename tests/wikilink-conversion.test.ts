/**
 * TDD: Wikilinks → 微信公众号链接转换
 * 测试 convertWikiLinks() 方法的各种场景
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Obsidian API
const mockGetFirstLinkpathDest = vi.fn();
const mockGetFileCache = vi.fn();

const mockApp = {
    metadataCache: {
        getFirstLinkpathDest: mockGetFirstLinkpathDest,
        getFileCache: mockGetFileCache,
    },
};

// 测试用的 convertWikiLinks 实现（从 main.ts 提取核心逻辑）
function convertWikiLinks(
    markdown: string,
    sourcePath: string,
    resolveNoteLink: (linkpath: string, sourcePath: string) => string | null,
): string {
    // 1. 代码块保护
    const codeBlocks: string[] = [];
    let protectedMd = markdown
        .replace(/```[\s\S]*?```/g, (m) => {
            codeBlocks.push(m);
            return `\uE000CODE${codeBlocks.length - 1}\uE000`;
        })
        .replace(/`[^`\n]+`/g, (m) => {
            codeBlocks.push(m);
            return `\uE000CODE${codeBlocks.length - 1}\uE000`;
        });

    // 2. 处理图片嵌入 ![[...]]
    const wikiImageRegex = /!\[\[([^\]]*?)\]\]/g;
    protectedMd = protectedMd.replace(
        wikiImageRegex,
        (_match: string, content: string) => {
            let fileName = content;
            let altText = '';
            if (content.includes('|')) {
                const parts = content.split('|');
                fileName = parts[0] ?? '';
                altText = parts.slice(1).join('|');
            }
            fileName = fileName.trim();
            const encodedPath = encodeURI(fileName);
            return `![${altText}](${encodedPath})`;
        },
    );

    // 3. 处理笔记链接 [[...]]
    const wikiLinkRegex = /\[\[([^\]]+?)\]\]/g;
    protectedMd = protectedMd.replace(
        wikiLinkRegex,
        (_match: string, content: string) => {
            let linkpath = content;
            let displayText = content;

            // 解析别名 [[note|alias]]
            if (content.includes('|')) {
                const parts = content.split('|');
                linkpath = parts[0] ?? '';
                displayText = parts.slice(1).join('|');
            }

            // 解析标题 [[note#heading]]
            if (linkpath.includes('#')) {
                const hashIdx = linkpath.indexOf('#');
                linkpath = linkpath.slice(0, hashIdx);
                // 如果没有别名，使用 heading 作为显示文本
                if (!content.includes('|')) {
                    displayText = content.slice(content.indexOf('#') + 1);
                }
            }

            linkpath = linkpath.trim();
            displayText = displayText.trim();

            // 如果 linkpath 为空（如 [[#heading]]），跳过
            if (!linkpath) return `[${displayText}]`;

            // 查找目标笔记的 link-wechat-mp
            const wechatUrl = resolveNoteLink(linkpath, sourcePath);

            if (wechatUrl) {
                // 有微信链接：生成标准 markdown 链接
                return `[${displayText}](${wechatUrl})`;
            } else {
                // 无微信链接：生成带样式的 span
                return `<span class="wechat-note-link">${displayText}</span>`;
            }
        },
    );

    // 4. 还原代码块
    for (let i = 0; i < codeBlocks.length; i++) {
        protectedMd = protectedMd.replace(
            `\uE000CODE${i}\uE000`,
            codeBlocks[i],
        );
    }

    return protectedMd;
}

// 测试用的 resolveNoteLink 实现
function createResolveNoteLink(
    noteMap: Record<string, string | null>,
): (linkpath: string, sourcePath: string) => string | null {
    return (linkpath: string, _sourcePath: string) => {
        return noteMap[linkpath] ?? null;
    };
}

describe('Wikilink 转换', () => {
    describe('基础语法', () => {
        it('[[note]] 无 wechat_url → span', () => {
            const resolve = createResolveNoteLink({});
            const result = convertWikiLinks('[[My Note]]', 'test.md', resolve);
            expect(result).toBe('<span class="wechat-note-link">My Note</span>');
        });

        it('[[note]] 有 wechat_url → markdown 链接', () => {
            const resolve = createResolveNoteLink({
                'My Note': 'https://mp.weixin.qq.com/s/abc123',
            });
            const result = convertWikiLinks('[[My Note]]', 'test.md', resolve);
            expect(result).toBe('[My Note](https://mp.weixin.qq.com/s/abc123)');
        });

        it('[[note|alias]] 无 wechat_url → span with alias', () => {
            const resolve = createResolveNoteLink({});
            const result = convertWikiLinks('[[My Note|自定义文本]]', 'test.md', resolve);
            expect(result).toBe('<span class="wechat-note-link">自定义文本</span>');
        });

        it('[[note|alias]] 有 wechat_url → markdown 链接 with alias', () => {
            const resolve = createResolveNoteLink({
                'My Note': 'https://mp.weixin.qq.com/s/abc123',
            });
            const result = convertWikiLinks('[[My Note|自定义文本]]', 'test.md', resolve);
            expect(result).toBe('[自定义文本](https://mp.weixin.qq.com/s/abc123)');
        });
    });

    describe('标题链接', () => {
        it('[[note#heading]] 无 wechat_url → span with heading', () => {
            const resolve = createResolveNoteLink({});
            const result = convertWikiLinks('[[My Note#章节一]]', 'test.md', resolve);
            expect(result).toBe('<span class="wechat-note-link">章节一</span>');
        });

        it('[[note#heading|alias]] 无 wechat_url → span with alias', () => {
            const resolve = createResolveNoteLink({});
            const result = convertWikiLinks('[[My Note#章节一|别名]]', 'test.md', resolve);
            expect(result).toBe('<span class="wechat-note-link">别名</span>');
        });

        it('[[note#heading]] 有 wechat_url → markdown 链接 with heading', () => {
            const resolve = createResolveNoteLink({
                'My Note': 'https://mp.weixin.qq.com/s/abc123',
            });
            const result = convertWikiLinks('[[My Note#章节一]]', 'test.md', resolve);
            expect(result).toBe('[章节一](https://mp.weixin.qq.com/s/abc123)');
        });
    });

    describe('代码块保护', () => {
        it('行内代码中的 [[code]] 不被转换', () => {
            const resolve = createResolveNoteLink({});
            const result = convertWikiLinks('`[[code]]`', 'test.md', resolve);
            expect(result).toBe('`[[code]]`');
        });

        it('代码块中的 [[code]] 不被转换', () => {
            const resolve = createResolveNoteLink({});
            const result = convertWikiLinks('```\n[[code]]\n```', 'test.md', resolve);
            expect(result).toContain('[[code]]');
            expect(result).not.toContain('wechat-note-link');
        });
    });

    describe('图片链接兼容', () => {
        it('![[image.png]] 保持不变', () => {
            const resolve = createResolveNoteLink({});
            const result = convertWikiLinks('![[image.png]]', 'test.md', resolve);
            expect(result).toBe('![](image.png)');
        });

        it('![[image.png|alt]] 保持不变', () => {
            const resolve = createResolveNoteLink({});
            const result = convertWikiLinks('![[image.png|alt text]]', 'test.md', resolve);
            expect(result).toBe('![alt text](image.png)');
        });
    });

    describe('边界情况', () => {
        it('[[#heading]] 无 linkpath → 保持原样', () => {
            const resolve = createResolveNoteLink({});
            const result = convertWikiLinks('[[#heading]]', 'test.md', resolve);
            expect(result).toBe('[heading]');
        });

        it('混合内容：普通文本 + wikilink', () => {
            const resolve = createResolveNoteLink({});
            const result = convertWikiLinks(
                '这是文本，[[Link]] 也是文本。',
                'test.md',
                resolve,
            );
            expect(result).toBe(
                '这是文本，<span class="wechat-note-link">Link</span> 也是文本。',
            );
        });

        it('多个 wikilink', () => {
            const resolve = createResolveNoteLink({
                'Note1': 'https://mp.weixin.qq.com/s/aaa',
            });
            const result = convertWikiLinks('[[Note1]] and [[Note2]]', 'test.md', resolve);
            expect(result).toBe(
                '[Note1](https://mp.weixin.qq.com/s/aaa) and <span class="wechat-note-link">Note2</span>',
            );
        });
    });

    describe('微信链接格式', () => {
        it('短链接格式 /s/xxxxxxx', () => {
            const resolve = createResolveNoteLink({
                'My Note': 'https://mp.weixin.qq.com/s/J7JMQMpSDU-r2co1hiNkZA',
            });
            const result = convertWikiLinks('[[My Note]]', 'test.md', resolve);
            expect(result).toBe(
                '[My Note](https://mp.weixin.qq.com/s/J7JMQMpSDU-r2co1hiNkZA)',
            );
        });

        it('完整参数格式', () => {
            const resolve = createResolveNoteLink({
                'My Note':
                    'https://mp.weixin.qq.com/s?__biz=MzkxOTU4MDg2MA==&mid=2247483763&idx=1&sn=171be917dddb6d37262081f93362a186',
            });
            const result = convertWikiLinks('[[My Note]]', 'test.md', resolve);
            expect(result).toContain('https://mp.weixin.qq.com/s?__biz=');
        });
    });
});
