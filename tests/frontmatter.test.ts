import { describe, expect, it } from "vitest";
import {
	getFrontmatterString,
	parseFrontmatter,
} from "../src/frontmatter";

describe("统一 frontmatter 解析", () => {
	it("支持 BOM、空行、CRLF、多行字段、数组和嵌套对象", () => {
		const result = parseFrontmatter(
			"\uFEFF\r\n---\r\ntitle: \"标题: 带冒号\"\r\nauthor: ARCJ137442\r\ntags:\r\n  - diary\r\n  - public\r\nsettings:\r\n  theme: simple\r\ndescription: |\r\n  第一行\r\n  ---\r\n  第三行\r\n---\r\n正文\r\n",
		);

		expect(getFrontmatterString(result.meta, "title")).toBe("标题: 带冒号");
		expect(result.meta.tags).toEqual(["diary", "public"]);
		expect(result.meta.settings).toEqual({ theme: "simple" });
		expect(result.meta.description).toContain("---");
		expect(result.body).toBe("正文");
		expect(result.error).toBeUndefined();
	});

	it("不会把正文中的水平线当作 frontmatter 结束符", () => {
		const result = parseFrontmatter("---\ntitle: 测试\n---\n正文\n---\n后续");
		expect(result.body).toBe("正文\n---\n后续");
	});

	it("支持 YAML 文档结束符和标量回退读取", () => {
		const result = parseFrontmatter("---\ndate: 2026-08-19\npublished: true\n...\n正文");
		expect(getFrontmatterString(result.meta, "date")).toBe("2026-08-19");
		expect(getFrontmatterString(result.meta, "published")).toBe("true");
		expect(getFrontmatterString(result.meta, "missing", "fallback")).toBe("fallback");
	});

	it("没有 frontmatter 时保留原文", () => {
		const source = "正文\n---\n不是开头的 frontmatter";
		expect(parseFrontmatter(source)).toEqual({ meta: {}, body: source });
	});

	it("YAML 无法解析时保留正文并返回错误信息", () => {
		const result = parseFrontmatter("---\ntitle: [broken\n---\n正文");
		expect(result.body).toBe("正文");
		expect(result.meta).toEqual({});
		expect(result.error).toBeTruthy();
	});
});
