/** Contract tests for the production wikilink adapter. */
import { describe, it, expect } from "vitest";
import { convertWikiLinks } from "../src/wiki-links";

function createResolveNoteLink(
	noteMap: Record<string, string | null>,
): (linkpath: string, sourcePath: string) => string | null {
	return (linkpath: string, _sourcePath: string) => noteMap[linkpath] ?? null;
}

describe("Wikilink 转换", () => {
	it("[[note]] 无 wechat_url → span", () => {
		expect(convertWikiLinks("[[My Note]]", "test.md", createResolveNoteLink({}))).toBe(
			'<span class="wechat-note-link">My Note</span>',
		);
	});

	it("[[note]] 有 wechat_url → markdown 链接", () => {
		expect(
			convertWikiLinks(
				"[[My Note]]",
				"test.md",
				createResolveNoteLink({ "My Note": "https://mp.weixin.qq.com/s/abc123" }),
			),
		).toBe("[My Note](https://mp.weixin.qq.com/s/abc123)");
	});

	it("别名和标题链接使用正确的显示文本", () => {
		const resolve = createResolveNoteLink({});
		expect(convertWikiLinks("[[My Note|自定义文本]]", "test.md", resolve)).toBe(
			'<span class="wechat-note-link">自定义文本</span>',
		);
		expect(convertWikiLinks("[[My Note#章节一]]", "test.md", resolve)).toBe(
			'<span class="wechat-note-link">章节一</span>',
		);
		expect(convertWikiLinks("[[My Note#章节一|别名]]", "test.md", resolve)).toBe(
			'<span class="wechat-note-link">别名</span>',
		);
	});

	it("标题链接有公众号地址时生成 Markdown 链接", () => {
		const resolve = createResolveNoteLink({
			"My Note": "https://mp.weixin.qq.com/s/abc123",
		});
		expect(convertWikiLinks("[[My Note#章节一]]", "test.md", resolve)).toBe(
			"[章节一](https://mp.weixin.qq.com/s/abc123)",
		);
	});

	it("不转换行内代码和代码块中的 wikilink", () => {
		const resolve = createResolveNoteLink({});
		expect(convertWikiLinks("`[[code]]`", "test.md", resolve)).toBe("`[[code]]`");
		const result = convertWikiLinks("```\n[[code]]\n```", "test.md", resolve);
		expect(result).toContain("[[code]]");
		expect(result).not.toContain("wechat-note-link");
	});

	it("恢复代码块时保留美元符号和行内三反引号", () => {
		const markdown = [
			"```Python\n",
			"print('代码块中的美元符号 $x$')\n",
			"x = '$$ 不应该被解析成换行公式 $$'\n",
			"Markdown示例 = '**粗体** `代码` ```代码块```'\n",
			"```\n",
		].join("");

		expect(convertWikiLinks(markdown, "test.md", createResolveNoteLink({}))).toBe(
			markdown,
		);
	});

	it("将嵌入图片转换为普通 Markdown 图片", () => {
		const resolve = createResolveNoteLink({});
		expect(convertWikiLinks("![[image.png]]", "test.md", resolve)).toBe(
			"![](image.png)",
		);
		expect(convertWikiLinks("![[image.png|alt text]]", "test.md", resolve)).toBe(
			"![alt text](image.png)",
		);
	});

	it("处理空 linkpath、混合内容和多个 wikilink", () => {
		const resolve = createResolveNoteLink({ Note1: "https://mp.weixin.qq.com/s/aaa" });
		expect(convertWikiLinks("[[#heading]]", "test.md", resolve)).toBe("[heading]");
		expect(
			convertWikiLinks("这是文本，[[Link]] 也是文本。", "test.md", resolve),
		).toBe('这是文本，<span class="wechat-note-link">Link</span> 也是文本。');
		expect(convertWikiLinks("[[Note1]] and [[Note2]]", "test.md", resolve)).toBe(
			'[Note1](https://mp.weixin.qq.com/s/aaa) and <span class="wechat-note-link">Note2</span>',
		);
	});

	it("保留公众号短链接和完整参数", () => {
		const short = createResolveNoteLink({
			"My Note": "https://mp.weixin.qq.com/s/J7JMQMpSDU-r2co1hiNkZA",
		});
		expect(convertWikiLinks("[[My Note]]", "test.md", short)).toContain("/s/J7JMQMpSDU-r2co1hiNkZA");

		const complete = createResolveNoteLink({
			"My Note":
				"https://mp.weixin.qq.com/s?__biz=MzkxOTU4MDg2MA==&mid=2247483763&idx=1&sn=171be917dddb6d37262081f93362a186",
		});
		expect(convertWikiLinks("[[My Note]]", "test.md", complete)).toContain("__biz=");
	});
});
