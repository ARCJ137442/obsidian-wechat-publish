/**
 * MathJax SVG Renderer
 *
 * Standalone module that converts LaTeX to self-contained SVG with <path> elements.
 * Built separately with rollup (not esbuild) to preserve MathJax's global state.
 *
 * Output: SVG HTML string where each glyph is a <path> — no font dependency.
 * Post-processed to inline all <use> references (WeChat strips xlink:href).
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
 * Inline all <use xlink:href="#id"> in an SVG string.
 *
 * WeChat rich text editor strips `id` from <path> and `xlink:href` from <use>,
 * so all glyph references break. This function resolves them by replacing
 * each <use> with the actual <path> element it references.
 */
function inlineSvgUses(svgHtml: string): string {
	// 1. Build id → path content map from <defs>
	const pathMap = new Map<string, string>();
	const pathRegex = /<path\s+id="([^"]+)"([^>]*)>/g;
	let match: RegExpExecArray | null;
	while ((match = pathRegex.exec(svgHtml)) !== null) {
		const id = match[1] as string;
		const attrs = match[2] as string;
		pathMap.set(id, `<path${attrs}>`);
	}

	if (pathMap.size === 0) return svgHtml;

	// 2. Replace each <use xlink:href="#id" ...> with the referenced <path>
	let result = svgHtml;
	for (const [id, pathReplacement] of pathMap) {
		// Match <use ... xlink:href="#id" ...> or <use ... href="#id" ...>
		const useRegex = new RegExp(
			`<use[^>]*(?:xlink:)?href="#${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*>`,
			'g',
		);
		result = result.replace(useRegex, pathReplacement);
	}

	// 3. Remove <defs> block (no longer needed after inlining)
	result = result.replace(/<defs>[\s\S]*?<\/defs>/, '');

	return result;
}

/**
 * Render a LaTeX formula to a self-contained SVG string.
 *
 * @param formula  LaTeX source (e.g. "E = mc^2")
 * @param display  true = block display, false = inline
 * @returns SVG outerHTML string with inlined <path> glyphs
 */
export function tex2svg(formula: string, display = false): string {
	ensureInit();

	const node = htmlDoc.convert(formula, { display });
	const svgHtml = adaptor.innerHTML(node);

	return inlineSvgUses(svgHtml);
}
