export type LatexSvgRenderer = (formula: string, displayMode: boolean) => string;

const DISPLAY_STYLE = "text-align:center;margin:1em 0;line-height:1.4";
const INLINE_STYLE = "display:inline-block;vertical-align:middle;line-height:1.4";
const SVG_TEXT_FONT_FAMILY = "inherit";
const HIGHLIGHT_STYLE = "background-color:rgba(0,0,0,0.15);padding:0 2px";

export function renderLatexHtml(
	formula: string,
	displayMode: boolean,
	tex2svg: LatexSvgRenderer,
): string {
	const svg = normalizeSvgTextFont(tex2svg(formula, displayMode).trim());
	return wrapLatexHtml(svg, displayMode);
}

export function renderLatexFallback(formula: string, displayMode: boolean): string {
	return wrapLatexHtml(`【公式：${escapeHtml(formula)}】`, displayMode);
}

export function replaceLatexPlaceholderHtml(
	html: string,
	placeholder: string,
	rendered: string,
	displayMode: boolean,
): string {
	if (!displayMode) {
		return html.split(placeholder).join(rendered);
	}

	const paragraphWrappedPlaceholder = new RegExp(
		`<p>\\s*${escapeRegExp(placeholder)}\\s*<\\/p>`,
		"g",
	);
	return html
		.replace(paragraphWrappedPlaceholder, rendered)
		.split(placeholder)
		.join(rendered);
}

export function normalizeWechatHighlightTags(html: string): string {
	return html
		.replace(
			/<mark(?:\s+[^>]*)?>/gi,
			`<span class="highlight" style="${HIGHLIGHT_STYLE}">`,
		)
		.replace(/<\/mark>/gi, "</span>");
}

function normalizeSvgTextFont(svg: string): string {
	return svg
		.replace(
			/(<text\b[^>]*?)\sfont-family=(["'])[^"']*\2/gi,
			`$1 font-family="${SVG_TEXT_FONT_FAMILY}"`,
		)
		.replace(
			/<text\b(?![^>]*\sfont-family=)/gi,
			`<text font-family="${SVG_TEXT_FONT_FAMILY}"`,
		);
}

function wrapLatexHtml(content: string, displayMode: boolean): string {
	if (displayMode) {
		return `<section class="wechat-latex-display" style="${DISPLAY_STYLE}">${content}</section>`;
	}
	return `<span class="wechat-latex-inline" style="${INLINE_STYLE}">${content}</span>`;
}

function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapeHtml(text: string): string {
	return text
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}
