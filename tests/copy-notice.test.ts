import { describe, expect, it } from "vitest";
import {
	buildCopyNotice,
	countHtmlParagraphs,
	countImagePlaceholders,
} from "../src/copy-notice";

describe("复制结果摘要", () => {
	it("基础提示包含段落和公式数量", () => {
		const notice = buildCopyNotice({
			paragraphCount: 12,
			formulaCount: 8,
			imagePlaceholderCount: 0,
			latexFallbackCount: 0,
			unresolvedWikilinkCount: 0,
		});

		expect(notice).toBe("✅ 已复制到剪贴板：12 个段落，8 个公式。");
	});

	it("仅在发生时报告图片、公式回退和未解析链接", () => {
		const notice = buildCopyNotice({
			paragraphCount: 3,
			formulaCount: 2,
			imagePlaceholderCount: 3,
			latexFallbackCount: 1,
			unresolvedWikilinkCount: 2,
		});

		expect(notice).toContain("本地图片已替换为 3 个占位符，需要手动上传。");
		expect(notice).toContain("1 个公式使用了文本回退。");
		expect(notice).toContain("2 个公众号链接未配置，已保留为普通文本。");
	});

	it("统计 HTML 段落和本地图片占位符", () => {
		const html =
			'<p>第一段</p><p>第二段</p><p>【图片：images/a.png】</p><p>【图片：images/b.png】</p>';

		expect(countHtmlParagraphs(html)).toBe(4);
		expect(countImagePlaceholders(html)).toBe(2);
	});

	it("不会把外部图片或普通文本误报为本地图片占位符", () => {
		const html =
			'<img src="https://example.com/a.png"><p>图片：a.png</p><p>【图片：images/a.png】</p>';

		expect(countImagePlaceholders(html)).toBe(1);
	});
});
