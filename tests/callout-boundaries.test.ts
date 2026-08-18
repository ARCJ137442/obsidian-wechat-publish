import { describe, expect, it, beforeAll } from "vitest";
import { renderMarkdownCore } from "../src/markdown-core";
import {
	buildMergedCalloutData,
	setupCalloutData,
} from "../src/callout-plugin";
import { CALLOUT_MANAGER_FIXTURE } from "./fixtures/callout-manager";

beforeAll(() => {
	const { themes, aliases } = buildMergedCalloutData(CALLOUT_MANAGER_FIXTURE);
	setupCalloutData(themes, aliases);
});

function renderCallout(markdown: string): string {
	return renderMarkdownCore(markdown).html;
}

describe("Callout 输入边界", () => {
	it("保留正文空行带来的段落边界，并继续识别后续列表", () => {
		const html = renderCallout(
			"> [!note] 标题\n> 第一段\n>\n> 第二段\n>\n> - 列表一\n> - 列表二",
		);

		expect(html).toContain("<p>第一段</p>");
		expect(html).toContain("<p>第二段</p>");
		expect(html).toContain("<ul>");
		expect(html).toContain("<li>列表一</li>");
	});

	it("保留嵌套列表和列表项中的 Markdown", () => {
		const html = renderCallout(
			"> [!note] 标题\n> - **外层**\n>   - *内层*\n>     - ==高亮内层==",
		);

		expect(html).toContain("<strong>外层</strong>");
		expect(html).toContain("<em>内层</em>");
		expect(html).toContain("<mark>高亮内层</mark>");
		expect(html.match(/<ul>/g)).toHaveLength(3);
	});

	it("折叠标记只影响输入语义，不改变公众号的普通 Callout 输出", () => {
		const collapsed = renderCallout("> [!tip]- 可折叠标题\n> 折叠正文");
		const expanded = renderCallout("> [!tip]+ 展开标题\n> 展开正文");

		expect(collapsed).toContain("wechat-callout-tip");
		expect(collapsed).toContain("可折叠标题");
		expect(collapsed).toContain("折叠正文");
		expect(expanded).toContain("wechat-callout-tip");
		expect(expanded).toContain("展开标题");
		expect(expanded).toContain("展开正文");
	});

	it("未知类型回退到 note 主题，同时保留原始类型 class 便于定制", () => {
		const html = renderCallout("> [!mystery] 未知类型\n> 仍然需要被发布");

		expect(html).toContain("wechat-callout-mystery");
		expect(html).toContain("未知类型");
		expect(html).toContain("仍然需要被发布");
		expect(html).toContain("--callout-border:#086ddd");
	});

	it("无标题、无正文的 Callout 使用默认主题标题且不泄漏原始标记", () => {
		const html = renderCallout("> [!note]");

		expect(html).toContain("wechat-callout-note");
		expect(html).toContain(">Note</span>");
		expect(html).not.toContain("[!note]");
	});
});
