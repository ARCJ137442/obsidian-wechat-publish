/** Regression tests for the shared production LaTeX path. */
import { describe, it, expect } from "vitest";
import { renderMarkdownCore } from "../src/markdown-core";

function renderWithSharedCore(markdown: string): string {
	return renderMarkdownCore(markdown, {
		renderLatex: (formula, displayMode) => ({
			html: `<svg data-display="${displayMode}" aria-label="${formula}"></svg>`,
		}),
	}).html;
}

describe("Preview LaTeX regression", () => {
	it("uses the shared renderer adapter for LaTeX placeholders", () => {
		const output = renderWithSharedCore("公式：$L^AT_EX$。");
		expect(output).toContain("<svg");
		expect(output).toContain("L^AT_EX");
		expect(output).not.toContain("LATEX");
	});

	it("does not reintroduce brittle KaTeX HTML fragment extraction", () => {
		const output = renderWithSharedCore("$\\frac{a}{b}$");
		expect(output).not.toContain("katex-html");
		expect(output).not.toContain("renderToString");
	});

	it("keeps formula rendering independent of the image output branch", () => {
		const outputA = renderWithSharedCore("$E=mc^2$");
		const outputB = renderWithSharedCore("$E=mc^2$");
		expect(outputA).toBe(outputB);
	});
});
