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

	it("不把未配对的货币金额识别为公式", () => {
		const result = renderWithFormulaProbe("预算为 $100，实际支出为 $200。");

		expect(result.diagnostics.formulaCount).toBe(0);
		expect(result.html).toContain("$100");
		expect(result.html).toContain("$200");
	});

	it("按 Obsidian 规则配对同一行中边界非空的美元符号", () => {
		const result = renderWithFormulaProbe("「$100」加上「100$」= $200");

		expect(result.diagnostics.formulaCount).toBe(1);
		expect(result.html).toContain('data-formula="100」加上「100"');
		expect(result.html).toContain("$200");
	});

	it("渲染成对的纯数字行内公式和纯数字行间公式", () => {
		const result = renderWithFormulaProbe(
			"行内：$1$、$2$、$234$、$88557731$、$a$；行间：$$123456789$$",
		);

		expect(result.diagnostics.formulaCount).toBe(6);
		expect(result.html).toContain('data-formula="1"');
		expect(result.html).toContain('data-formula="2"');
		expect(result.html).toContain('data-formula="234"');
		expect(result.html).toContain('data-formula="88557731"');
		expect(result.html).toContain('data-formula="a"');
		expect(result.html).toContain('data-formula="123456789"');
		expect(result.html).toContain('data-display="true"');
	});

	it("把成对的纯数字美元定界符当作公式，同时保留未闭合货币金额", () => {
		const result = renderWithFormulaProbe("成对数字：$100$；未闭合价格：$100");

		expect(result.diagnostics.formulaCount).toBe(1);
		expect(result.html).toContain('data-formula="100"');
		expect(result.html).toContain("未闭合价格：$100");
		expect(result.html).not.toContain("成对数字：$100$");
	});

	it("遵循 Obsidian 的行内美元空白边界", () => {
		const result = renderWithFormulaProbe(
			"孤立符号：$ $ $ $ $\n\n" +
				"空格开头：$ a + b = 没渲染 $\n\n" +
				"只贴一边：$ 2 + 4 = 不渲染，因为只贴一边$\n\n" +
				"引号边界：$「这个则会渲染，即便两边都是引号，破坏掉一边不紧挨美元，就会失效」$",
		);

		expect(result.diagnostics.formulaCount).toBe(1);
		expect(result.html).toContain(
			'data-formula="「这个则会渲染，即便两边都是引号，破坏掉一边不紧挨美元，就会失效」"',
		);
		expect(result.html).toContain("孤立符号：$ $ $ $ $");
		expect(result.html).toContain("空格开头：$ a + b = 没渲染 $");
		expect(result.html).toContain("只贴一边：$ 2 + 4 = 不渲染，因为只贴一边$");
	});

	it("对数字两可边界不猜测配对，并在歧义消失处继续渲染", () => {
		const ambiguous = renderWithFormulaProbe("1$2 3$4");
		expect(ambiguous.diagnostics.formulaCount).toBe(0);
		expect(ambiguous.html).toContain("1$2 3$4");

		const resolved = renderWithFormulaProbe("0$0 0$0 0$0 0$0 0$");
		expect(resolved.diagnostics.formulaCount).toBe(1);
		expect(resolved.html).toContain('data-formula="0 0"');
	});

	it("允许 display 公式跨行，但不把换行改写成行内公式", () => {
		const result = renderWithFormulaProbe("$$a\n- b\n= c\n$$");

		expect(result.diagnostics.formulaCount).toBe(1);
		expect(result.html).toContain('data-display="true"');
		expect(result.html).toContain('data-formula="a\n- b\n= c"');
	});

	it("行内单美元公式不跨行配对", () => {
		const result = renderWithFormulaProbe(
			"这行的$100\n不会跟下一行的$200",
		);

		expect(result.diagnostics.formulaCount).toBe(0);
		expect(result.html).toContain("这行的$100");
		expect(result.html).toContain("不会跟下一行的$200");
		expect(result.html).not.toContain("100\n不会跟下一行的");
	});

	it("遵循同一行中数字与美元符号的四种边界特例", () => {
		const noFormulaFromOpeningCurrency = renderWithFormulaProbe(
			"这行的$100不会跟后边的$200",
		);
		const formulaFromClosingCurrency = renderWithFormulaProbe(
			"这行的100$会跟后边的200$",
		);
		const formulaFromOpeningCurrency = renderWithFormulaProbe(
			"这行的$100则会跟后边的200$",
		);
		const noFormulaFromClosingCurrency = renderWithFormulaProbe(
			"这行的100$又不会跟后边的$200",
		);

		expect(noFormulaFromOpeningCurrency.diagnostics.formulaCount).toBe(0);
		expect(formulaFromClosingCurrency.diagnostics.formulaCount).toBe(1);
		expect(formulaFromClosingCurrency.html).toContain(
			'data-formula="会跟后边的200"',
		);
		expect(formulaFromOpeningCurrency.diagnostics.formulaCount).toBe(1);
		expect(formulaFromOpeningCurrency.html).toContain(
			'data-formula="100则会跟后边的200"',
		);
		expect(noFormulaFromClosingCurrency.diagnostics.formulaCount).toBe(0);
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
