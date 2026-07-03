import { describe, expect, it, vi } from "vitest";
import MarkdownIt from "markdown-it";
import markdownItMark from "markdown-it-mark";
import {
	normalizeWechatHighlightTags,
	renderLatexHtml,
	replaceLatexPlaceholderHtml,
} from "../src/latex-rendering";

describe("LaTeX HTML rendering helpers", () => {
	let realTex2svg: ((formula: string, displayMode: boolean) => string) | null = null;
	try {
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		realTex2svg = require("../mathjax-svg.js").tex2svg;
	} catch {
		realTex2svg = null;
	}

	it("wraps display formulas in a centered block", () => {
		const html = renderLatexHtml("a+b", true, () => '<svg><path d="M0 0"/></svg>');

		expect(html).toContain('class="wechat-latex-display"');
		expect(html).toContain("text-align:center");
		expect(html).toContain("<svg><path");
	});

	it("keeps inline formulas inline", () => {
		const html = renderLatexHtml("a+b", false, () => '<svg><path d="M0 0"/></svg>');

		expect(html).toContain('class="wechat-latex-inline"');
		expect(html).not.toContain('class="wechat-latex-display"');
	});

	it("keeps Chinese formula text inside one normalized SVG", () => {
		const formula =
			"两个对象 a,b \\in \\mathbb Z，如果a \\le b，则有态射a \\overset{\\le}{\\to} b";
		const tex2svg = vi.fn(
			() =>
				'<svg><text font-family="serif">两个对象</text><path /></svg>',
		);

		const html = renderLatexHtml(formula, false, tex2svg);

		expect(countOccurrences(html, "<svg")).toBe(1);
		expect(html).toContain("<svg");
		expect(html).toContain('<text font-family="inherit">两个对象</text>');
		expect(html).toContain("<path");
		expect(html).not.toContain('class="wechat-latex-text"');
		expect(tex2svg).toHaveBeenCalledWith(formula, false);
		expect(tex2svg).toHaveBeenCalledTimes(1);
	});

	it("does not synthesize an HTML table for Chinese cases formulas", () => {
		const formula =
			"\\text{Hom}_{\\mathcal{C}}(a, b) = \\begin{cases} \\{\\bullet_{a,b}\\}, & 当 a \\le b \\\\ 空集, & 当 a \\not\\le b \\end{cases}";
		const tex2svg = vi.fn(
			() =>
				'<svg><g data-mml-node="mtable"><text>当</text><text>空集</text></g></svg>',
		);

		const html = renderLatexHtml(formula, true, tex2svg);

		expect(countOccurrences(html, "<svg")).toBe(1);
		expect(html).toContain('data-mml-node="mtable"');
		expect(html).toContain("当");
		expect(html).toContain("空集");
		expect(html).not.toContain("<table");
		expect(html).not.toContain("<td");
		expect(html).not.toContain("begincases");
		expect(tex2svg).toHaveBeenCalledWith(formula, true);
		expect(tex2svg).toHaveBeenCalledTimes(1);
	});

	(realTex2svg ? it : it.skip)(
		"normalizes real MathJax Chinese fallback text for WeChat copy",
		() => {
			const formula = "两个对象 a,b \\in \\mathbb Z, 如果a \\le b，则有态射a \\overset{\\le}{\\to} b";
			const rawSvg = realTex2svg!(formula, false);
			const html = renderLatexHtml(formula, false, realTex2svg!);

			expect(rawSvg).toContain("<text");
			expect(countOccurrences(html, "<svg")).toBe(1);
			expect(svgTextContent(html)).toContain("两个对象");
			expect(svgTextContent(html)).toContain("如果");
			expect(svgTextContent(html)).toContain("则有态射");
			expect(html).toContain("<svg");
			expect(html).toContain("<path");
			expect(html).toContain("<text");
			expect(html).toContain('font-family="inherit"');
			expect(html).not.toContain('class="wechat-latex-text"');
		},
	);

	(realTex2svg ? it : it.skip)(
		"keeps cases formulas with Chinese text structured instead of plain-text fallback",
		() => {
			const formula = "\\text{Hom}_{\\mathcal{C}}(a, b) = \\begin{cases} \\{\\bullet_{a,b}\\}, & 当 a \\le b \\\\ 空集, & 当 a \\not\\le b \\end{cases}";
			const rawSvg = realTex2svg!(formula, true);
			const html = renderLatexHtml(formula, true, realTex2svg!);

			expect(rawSvg).toContain("<text");
			expect(html).toContain('class="wechat-latex-display"');
			expect(countOccurrences(html, "<svg")).toBe(1);
			expect(html).toContain('data-mml-node="mtable"');
			expect(svgTextContent(html)).toContain("当");
			expect(svgTextContent(html)).toContain("空集");
			expect(html).toContain("<svg");
			expect(html).toContain("<path");
			expect(html).toContain("<text");
			expect(html).toContain('font-family="inherit"');
			expect(html).not.toContain("<table");
			expect(html).not.toContain("<td");
			expect(html).not.toContain("begincases");
			expect(html).not.toContain("Hom_mathcalC");
		},
	);

	(realTex2svg ? it : it.skip)(
		"keeps irregular Chinese align formulas as one structured SVG",
		() => {
			const formula =
				"\\begin{align} 123a 这是第一行, \\\\ 第二行第一列 & 第二行第二列 \\\\ 12 & ab \\\\ 0 & 第四行第二列 \\end{align}";
			const html = renderLatexHtml(formula, true, realTex2svg!);
			const text = svgTextContent(html);

			expect(html).toContain('class="wechat-latex-display"');
			expect(countOccurrences(html, "<svg")).toBe(1);
			expect(html).toContain('data-mml-node="mtable"');
			expect(text).toContain("这是第一行");
			expect(text).toContain("第二行第一列");
			expect(text).toContain("第二行第二列");
			expect(text).toContain("第四行第二列");
			expect(html).toContain("<path");
			expect(html).toContain("<text");
			expect(html).not.toContain("<table");
			expect(html).not.toContain("<td");
			expect(html).not.toContain("beginalign");
			expect(html).not.toContain("endalign");
		},
	);

	it("replaces standalone display placeholder without leaving an invalid paragraph wrapper", () => {
		const html = replaceLatexPlaceholderHtml(
			"<p>\uE000LATEX0\uE000</p>\n<p>next</p>",
			"\uE000LATEX0\uE000",
			'<section class="wechat-latex-display">svg</section>',
			true,
		);

		expect(html).toBe('<section class="wechat-latex-display">svg</section>\n<p>next</p>');
	});
});

function countOccurrences(source: string, needle: string): number {
	return source.split(needle).length - 1;
}

function svgTextContent(html: string): string {
	return [...html.matchAll(/<text\b[^>]*>([^<]*)<\/text>/gi)]
		.map((match) => match[1])
		.join("");
}

describe("WeChat highlight compatibility", () => {
	it("renders nested bold highlight inside blockquotes without raw markers", () => {
		const markdown = new MarkdownIt({ html: true, breaks: true, linkify: true });
		markdown.use(markdownItMark);
		const rendered = markdown.render("> ==**编排**Agent跟人的有效交互==");
		const copyHtml = normalizeWechatHighlightTags(rendered);

		expect(copyHtml).toContain("<blockquote>");
		expect(copyHtml).toContain("<strong>编排</strong>Agent跟人的有效交互");
		expect(copyHtml).toContain("color:inherit");
		expect(copyHtml).not.toContain('class="highlight"');
		expect(copyHtml).not.toContain("<mark");
		expect(copyHtml).not.toContain("==");
	});

	it("converts mark tags to styled spans for copy HTML", () => {
		const html = normalizeWechatHighlightTags(
			"<blockquote><p><mark><strong>编排</strong>Agent跟人的有效交互</mark></p></blockquote>",
		);

		expect(html).toContain("<span");
		expect(html).toContain("background-color");
		expect(html).toContain("color:inherit");
		expect(html).toContain("<strong>编排</strong>Agent跟人的有效交互");
		expect(html).not.toContain('class="highlight"');
		expect(html).not.toContain("<mark");
		expect(html).not.toContain("==");
	});
});
