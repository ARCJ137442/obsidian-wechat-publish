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

	it("renders Chinese formula text outside SVG text nodes", () => {
		const tex2svg = vi.fn((formula: string) => {
			if (formula.includes("两个对象")) {
				return "<svg><text>两</text><path /></svg>";
			}
			return "<svg><path /></svg>";
		});

		const html = renderLatexHtml(
			"两个对象 a,b \\in \\mathbb Z，如果a \\le b，则有态射a \\overset{\\le}{\\to} b",
			false,
			tex2svg,
		);

		expect(html).toContain("两个对象");
		expect(html).toContain("如果");
		expect(html).toContain("则有态射");
		expect(html).toContain("<svg");
		expect(html).toContain("<path");
		expect(html).not.toContain("<text");
		expect(tex2svg).toHaveBeenCalledWith("a,b \\in \\mathbb Z", false);
	});

	it("splits Chinese cases formulas even when MathJax returns path-based fallback glyphs", () => {
		const formula =
			"\\text{Hom}_{\\mathcal{C}}(a, b) = \\begin{cases} \\{\\bullet_{a,b}\\}, & 当 a \\le b \\\\ 空集, & 当 a \\not\\le b \\end{cases}";
		const tex2svg = vi.fn((segment: string) => {
			if (segment.includes("当") || segment.includes("空集")) {
				return '<svg><path data-c="3F"/></svg>';
			}
			return '<svg><path data-c="2219"/></svg>';
		});

		const html = renderLatexHtml(formula, true, tex2svg);

		expect(html).toContain('class="wechat-latex-cases"');
		expect(html).toContain("当");
		expect(html).toContain("空集");
		expect(html).not.toContain('data-c="3F"');
		expect(tex2svg).not.toHaveBeenCalledTimes(1);
	});

	(realTex2svg ? it : it.skip)(
		"normalizes real MathJax Chinese fallback text for WeChat copy",
		() => {
			const formula = "两个对象 a,b \\in \\mathbb Z, 如果a \\le b，则有态射a \\overset{\\le}{\\to} b";
			const rawSvg = realTex2svg!(formula, false);
			const html = renderLatexHtml(formula, false, realTex2svg!);

			expect(rawSvg).toContain("<text");
			expect(html).toContain("两个对象");
			expect(html).toContain("如果");
			expect(html).toContain("则有态射");
			expect(html).toContain("<svg");
			expect(html).toContain("<path");
			expect(html).not.toContain("<text");
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
			expect(html).toContain('class="wechat-latex-cases"');
			expect(html).toContain("当");
			expect(html).toContain("空集");
			expect(html).toContain("<svg");
			expect(html).toContain("<path");
			expect(html).not.toContain("<text");
			expect(html).not.toContain("begincases");
			expect(html).not.toContain("Hom_mathcalC");
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

describe("WeChat highlight compatibility", () => {
	it("renders nested bold highlight inside blockquotes without raw markers", () => {
		const markdown = new MarkdownIt({ html: true, breaks: true, linkify: true });
		markdown.use(markdownItMark);
		const rendered = markdown.render("> ==**编排**Agent跟人的有效交互==");
		const copyHtml = normalizeWechatHighlightTags(rendered);

		expect(copyHtml).toContain("<blockquote>");
		expect(copyHtml).toContain("<strong>编排</strong>Agent跟人的有效交互");
		expect(copyHtml).toContain('class="highlight"');
		expect(copyHtml).not.toContain("<mark");
		expect(copyHtml).not.toContain("==");
	});

	it("converts mark tags to styled spans for copy HTML", () => {
		const html = normalizeWechatHighlightTags(
			"<blockquote><p><mark><strong>编排</strong>Agent跟人的有效交互</mark></p></blockquote>",
		);

		expect(html).toContain("<span");
		expect(html).toContain("background-color");
		expect(html).toContain("<strong>编排</strong>Agent跟人的有效交互");
		expect(html).not.toContain("<mark");
		expect(html).not.toContain("==");
	});
});
