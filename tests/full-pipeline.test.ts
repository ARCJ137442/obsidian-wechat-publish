/** Contract test for the production Markdown → HTML core. */
import { describe, it, expect, beforeAll } from "vitest";
import fs from "fs";
import path from "path";
import { renderMarkdownCore } from "../src/markdown-core";

const TEST_MD_PATH = path.resolve(__dirname, "fixtures/样式测试 - 全元素覆盖.md");

function loadTestFile(): string {
	return fs.readFileSync(TEST_MD_PATH, "utf-8");
}

function stripFixtureFrontmatter(markdown: string): string {
	return markdown.replace(/^---\r?\n[\s\S]*?^---\r?\n/m, "");
}

function renderFixture(markdown: string): string {
	return renderMarkdownCore(markdown, {
		currentPath: "tests/fixtures/样式测试 - 全元素覆盖.md",
		resolveWikiLink: () => null,
		renderLatex: (formula, displayMode) => ({
			html: `<svg data-display="${displayMode}" aria-label="${formula}"></svg>`,
		}),
	}).html;
}

let htmlOutput: string;

describe("Full Pipeline: 样式测试 - 全元素覆盖.md", () => {
	beforeAll(() => {
		htmlOutput = renderFixture(stripFixtureFrontmatter(loadTestFile()));
	});

	it("uses the production renderer and produces non-empty HTML", () => {
		expect(htmlOutput.length).toBeGreaterThan(100);
	});

	describe("Obsidian Callouts", () => {
		const calloutTests = [
			{ type: "note", title: "笔记", body: "这是一条普通的笔记 Callout，用于补充说明或旁注。" },
			{ type: "info", title: "信息", body: "信息类 Callout 用淡青色调" },
			{ type: "tip", title: "提示", body: "提示类 Callout 用淡绿色调" },
			{ type: "question", title: "问题", body: "问题类 Callout 用暖棕色" },
			{ type: "warning", title: "警告", body: "警告类 Callout 用暖灰色调" },
			{ type: "danger", title: "危险", body: "危险类 Callout 用暖红色" },
			{ type: "example", title: "示例", body: "示例类 Callout 用青绿色" },
		];

		for (const tc of calloutTests) {
			it(`renders ${tc.type} callout with title and body`, () => {
				expect(htmlOutput).toContain("border-left");
				expect(htmlOutput).toContain(tc.title);
				expect(htmlOutput).toContain(tc.body);
			});
		}

		it("does not contain raw [! prefix in output", () => {
			expect(htmlOutput).not.toMatch(/\[!note\]/);
			expect(htmlOutput).not.toMatch(/\[!info\]/);
		});

		it("has the table-based callout DOM structure", () => {
			const titleIdx = htmlOutput.indexOf("<table");
			const bodyIdx = htmlOutput.indexOf("这是一条普通的笔记 Callout");
			expect(titleIdx).toBeGreaterThan(0);
			expect(bodyIdx).toBeGreaterThan(titleIdx);
		});
	});

	it("preserves regular blockquotes with <blockquote> tag", () => {
		expect(htmlOutput).toMatch(/<blockquote>/);
		expect(htmlOutput).toContain("加西亚·马尔克斯");
	});

	it("renders headings", () => {
		expect(htmlOutput).toMatch(/<h2>/);
		expect(htmlOutput).toMatch(/<h3>/);
	});

	it("renders bold and highlight", () => {
		expect(htmlOutput).toMatch(/<strong>/);
		expect(htmlOutput).toMatch(/<mark>/);
	});

	it("renders formulas through the injected production adapter", () => {
		expect(htmlOutput).toMatch(/<svg data-display=/);
		expect(htmlOutput).not.toContain("LATEX");
	});

	it("converts embedded wikilink images into image nodes", () => {
		expect(htmlOutput).toContain("<img");
		expect(htmlOutput).toContain("Pasted%20image");
	});

	it("renders code blocks and inline code", () => {
		expect(htmlOutput).toMatch(/<pre><code[ >]/);
		expect(htmlOutput).toMatch(/<code>/);
	});

	it("renders tables", () => {
		expect(htmlOutput).toMatch(/<table>/);
		expect(htmlOutput).toContain("011 念");
	});

	it("renders backslash escapes correctly", () => {
		expect(htmlOutput).toContain("¯\\_(ツ)_/¯");
		expect(htmlOutput).not.toMatch(/MDESC\d/);
		expect(htmlOutput).not.toMatch(/\uE000MDESC/);
	});

	it("renders lists with nesting", () => {
		expect(htmlOutput).toMatch(/<ul>/);
		expect(htmlOutput).toMatch(/<ol>/);
		expect(htmlOutput).toContain("日子系列");
	});
});
