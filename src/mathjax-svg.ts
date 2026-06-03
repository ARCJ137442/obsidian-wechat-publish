/**
 * MathJax SVG Renderer
 *
 * Standalone module that converts LaTeX to self-contained SVG with <path> elements.
 * Built separately with rollup (not esbuild) to preserve MathJax's global state.
 *
 * Output: SVG HTML string where each glyph is a <path> — no font dependency.
 */
import { mathjax } from "mathjax-full/js/mathjax";
import { TeX } from "mathjax-full/js/input/tex.js";
import { SVG } from "mathjax-full/js/output/svg.js";
import {
	LiteAdaptor,
	liteAdaptor,
} from "mathjax-full/js/adaptors/liteAdaptor.js";
import { RegisterHTMLHandler } from "mathjax-full/js/handlers/html.js";
import { AllPackages } from "mathjax-full/js/input/tex/AllPackages.js";

let adaptor: LiteAdaptor;
let htmlDoc: ReturnType<typeof mathjax.document>;

function ensureInit() {
	if (adaptor) return;

	adaptor = liteAdaptor();
	RegisterHTMLHandler(adaptor);

	const input = new TeX({ packages: AllPackages });
	const output = new SVG({ fontCache: "local" });

	htmlDoc = mathjax.document("", {
		InputJax: input,
		OutputJax: output,
	});
}

/**
 * Render a LaTeX formula to a self-contained SVG string.
 *
 * @param formula  LaTeX source (e.g. "E = mc^2")
 * @param display  true = block display, false = inline
 * @returns SVG outerHTML string with <path> glyphs
 */
export function tex2svg(formula: string, display = false): string {
	ensureInit();

	const node = htmlDoc.convert(formula, { display });
	const svgHtml = adaptor.innerHTML(node);

	return svgHtml;
}
