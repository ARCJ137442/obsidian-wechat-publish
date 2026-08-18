import { describe, expect, it } from "vitest";
import { renderMarkdownCore } from "../src/markdown-core";

function renderWithFormulaProbe(markdown: string) {
	return renderMarkdownCore(markdown, {
		renderLatex: (formula, displayMode) => ({
			html: `<svg data-formula="${formula}" data-display="${displayMode}"></svg>`,
		}),
	});
}

function renderWithFormulaProbeAndWikilinks(markdown: string) {
	return renderMarkdownCore(markdown, {
		resolveWikiLink: () => null,
		renderLatex: (formula, displayMode) => ({
			html: `<svg data-formula="${formula}" data-display="${displayMode}"></svg>`,
		}),
	});
}

describe("LaTeX 输入边界", () => {
	it("不把 fenced code 中的美元文本识别为公式", () => {
		const result = renderWithFormulaProbe(
			"```text\n$not a formula$\n```\n\n正文 $x$",
		);

		expect(result.diagnostics.formulaCount).toBe(1);
		expect(result.html).toContain("$not a formula$");
		expect(result.html).toContain('data-formula="x"');
	});

	it("不把 CRLF fenced code 中的美元文本识别为公式", () => {
		const result = renderWithFormulaProbe(
			[
				"```Python\r\n",
				"print('代码块中的美元符号 $ a + b = c $')\r\n",
				"\r\n",
				"x = '$$ 不应该被解析成换行公式 $$'\r\n",
				"a = x + 1 # 正常代码\r\n",
				"\r\n",
				"Markdown示例 = '**粗体** *斜体* ==高亮== `代码` ```代码块```'\r\n",
				"```\r\n",
				"\r\n",
				"正文 $z$",
			].join(""),
		);
		expect(result.diagnostics.formulaCount).toBe(1);
		expect(result.html).toContain("language-Python");
		expect(result.html).toContain("$ a + b = c $");
		expect(result.html).toContain("$$ 不应该被解析成换行公式 $$");
		expect(result.html).toContain("```代码块```");
		expect(result.html).toContain('data-formula="z"');
	});

	it("不把 CRLF fenced code 中的可识别公式样式文本识别为公式", () => {
		const result = renderWithFormulaProbe(
			"```Python\r\nprint('$x$')\r\nvalue = '$$y$$'\r\n```\r\n\n正文 $z$",
		);

		expect(result.diagnostics.formulaCount).toBe(1);
		expect(result.html).toContain("print('$x$')");
		expect(result.html).toContain("value = '$$y$$'");
		expect(result.html).toContain('data-formula="z"');
	});

	it("Wikilink 转换后仍保护含行内三反引号的 fenced code", () => {
		const markdown = [
			"```Python\n",
			"print('代码块中的美元符号 $x$')\n",
			"x = '$$ 不应该被解析成换行公式 $$'\n",
			"Markdown示例 = '**粗体** *斜体* ==高亮== `代码` ```代码块```'\n",
			"```\n",
			"\n正文 $z$",
		].join("");
		const result = renderWithFormulaProbeAndWikilinks(markdown);

		expect(result.diagnostics.formulaCount).toBe(1);
		expect(result.html).toContain("print('代码块中的美元符号 $x$')");
		expect(result.html).toContain("$$ 不应该被解析成换行公式 $$");
		expect(result.html).toContain("```代码块```");
		expect(result.html).toContain('data-formula="z"');
	});

	it("不把 inline code 中的美元文本识别为公式", () => {
		const result = renderWithFormulaProbe("行内代码 `$not a formula$`，正文 $y$");

		expect(result.diagnostics.formulaCount).toBe(1);
		expect(result.html).toContain("<code>$not a formula$</code>");
		expect(result.html).toContain('data-formula="y"');
	});

	it("不把 HTML 标签属性和 HTML 文本中的美元符号识别为公式", () => {
		const result = renderWithFormulaProbe(
			'<span data-price="$100">价格：$50</span>，正文 $z$',
		);

		expect(result.diagnostics.formulaCount).toBe(1);
		expect(result.html).toContain('data-price="$100"');
		expect(result.html).toContain("价格：$50");
		expect(result.html).toContain('data-formula="z"');
	});

	it("不把成对的货币金额识别为公式", () => {
		const result = renderWithFormulaProbe("预算为 $100，实际支出为 $200。");

		expect(result.diagnostics.formulaCount).toBe(0);
		expect(result.html).toContain("$100");
		expect(result.html).toContain("$200");
	});

	it("不让被拒绝的数字片段跨越后续美元符号形成巨型公式", () => {
		const result = renderWithFormulaProbe(
			"从$1$到$4$最多有$1 \\to 2 \\to 3 \\to 4$。",
		);

		expect(result.diagnostics.formulaCount).toBe(1);
		expect(result.html).toContain('data-formula="1 \\to 2 \\to 3 \\to 4"');
		expect(result.html).toContain("从$1$到$4$最多有");
	});

	it("保留转义美元符号，不识别为公式", () => {
		const result = renderWithFormulaProbe("字面量：\\$not a formula\\$。");

		expect(result.diagnostics.formulaCount).toBe(0);
		expect(result.html).toContain("$not a formula$");
	});

	it("保留跨行 display 公式，并支持连续 inline 公式", () => {
		const result = renderWithFormulaProbe(
			"$$\n\\begin{aligned}a &= b \\\\\n+c &= d\\end{aligned}\n$$\n\n$x$ 和 $y$",
		);

		expect(result.diagnostics.formulaCount).toBe(3);
		expect(result.html).toContain('data-formula="\\begin{aligned}a &= b \\\\\n+c &= d\\end{aligned}"');
		expect(result.html).toContain('data-formula="x"');
		expect(result.html).toContain('data-formula="y"');
	});
});
