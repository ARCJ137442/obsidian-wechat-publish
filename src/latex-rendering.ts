export type LatexSvgRenderer = (formula: string, displayMode: boolean) => string;

type LatexSegment = {
	type: "math" | "text";
	value: string;
};

type CasesFormula = {
	prefix: string;
	rows: string[][];
	suffix: string;
};

const CJK_RE = /[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]/;
const CJK_PUNCTUATION_RE = /[，。！？；：、“”‘’（）《》〈〉【】]/;
const TEXT_COMMANDS = ["\\text", "\\mbox"];
const CASES_BEGIN = "\\begin{cases}";
const CASES_END = "\\end{cases}";
const DISPLAY_STYLE = "text-align:center;margin:1em 0;line-height:1.4";
const INLINE_STYLE = "display:inline-block;vertical-align:middle;line-height:1.4";
const TEXT_STYLE = "font-family:inherit;font-size:1em;line-height:1.4";
const CASES_STYLE = "display:inline-flex;align-items:center;vertical-align:middle;gap:0.25em";
const CASES_BRACE_STYLE = "font-size:2.6em;line-height:0.9;font-family:serif";
const CASES_TABLE_STYLE = "display:inline-table;border-collapse:collapse;text-align:left;vertical-align:middle";
const CASES_CELL_STYLE = "padding:0 0.25em;white-space:nowrap;line-height:1.4";
const HIGHLIGHT_STYLE = "background-color:rgba(0,0,0,0.15);padding:0 2px";

export function renderLatexHtml(
	formula: string,
	displayMode: boolean,
	tex2svg: LatexSvgRenderer,
): string {
	const svg = tex2svg(formula, displayMode).trim();
	if (!hasSvgText(svg)) {
		return wrapLatexHtml(svg, displayMode);
	}

	return wrapLatexHtml(renderMixedChineseLatex(formula, tex2svg), displayMode);
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

function renderMixedChineseLatex(
	formula: string,
	tex2svg: LatexSvgRenderer,
): string {
	const casesFormula = parseCasesFormula(formula);
	if (casesFormula) {
		return renderCasesFormula(casesFormula, tex2svg);
	}

	const segments = splitLatexByChineseText(formula);
	return segments
		.map((segment) =>
			segment.type === "text"
				? renderTextSegment(segment.value)
				: renderMathSegment(segment.value, tex2svg),
		)
		.join("");
}

function parseCasesFormula(formula: string): CasesFormula | null {
	const beginIndex = formula.indexOf(CASES_BEGIN);
	if (beginIndex === -1) return null;

	const bodyStart = beginIndex + CASES_BEGIN.length;
	const endIndex = formula.indexOf(CASES_END, bodyStart);
	if (endIndex === -1) return null;

	const body = formula.slice(bodyStart, endIndex);
	const rows = splitLatexRows(body)
		.map((row) => splitLatexCells(row).map((cell) => cell.trim()))
		.filter((row) => row.some((cell) => cell.length > 0));

	if (rows.length === 0) return null;

	return {
		prefix: formula.slice(0, beginIndex).trim(),
		rows,
		suffix: formula.slice(endIndex + CASES_END.length).trim(),
	};
}

function renderCasesFormula(
	casesFormula: CasesFormula,
	tex2svg: LatexSvgRenderer,
): string {
	const prefix = casesFormula.prefix
		? renderMathSegment(casesFormula.prefix, tex2svg)
		: "";
	const suffix = casesFormula.suffix
		? renderMathSegment(casesFormula.suffix, tex2svg)
		: "";
	const rows = casesFormula.rows
		.map((row) => {
			const cells = row
				.map(
					(cell) =>
						`<td style="${CASES_CELL_STYLE}">${renderMixedChineseLatex(cell, tex2svg)}</td>`,
				)
				.join("");
			return `<tr>${cells}</tr>`;
		})
		.join("");

	return `${prefix}<span class="wechat-latex-cases" style="${CASES_STYLE}"><span style="${CASES_BRACE_STYLE}">{</span><table style="${CASES_TABLE_STYLE}"><tbody>${rows}</tbody></table></span>${suffix}`;
}

function splitLatexRows(source: string): string[] {
	const rows: string[] = [];
	let buffer = "";
	let depth = 0;

	for (let index = 0; index < source.length; index++) {
		const char = source[index]!;
		const next = source[index + 1];

		if (char === "\\" && next === "\\" && depth === 0) {
			rows.push(buffer);
			buffer = "";
			index++;
			continue;
		}

		buffer += char;
		if (char === "\\") {
			if (next) {
				buffer += next;
				index++;
			}
			continue;
		}
		if (char === "{") depth++;
		if (char === "}" && depth > 0) depth--;
	}

	rows.push(buffer);
	return rows;
}

function splitLatexCells(source: string): string[] {
	const cells: string[] = [];
	let buffer = "";
	let depth = 0;

	for (let index = 0; index < source.length; index++) {
		const char = source[index]!;

		if (char === "&" && depth === 0) {
			cells.push(buffer);
			buffer = "";
			continue;
		}

		buffer += char;
		if (char === "\\") {
			const next = source[index + 1];
			if (next) {
				buffer += next;
				index++;
			}
			continue;
		}
		if (char === "{") depth++;
		if (char === "}" && depth > 0) depth--;
	}

	cells.push(buffer);
	return cells;
}

function splitLatexByChineseText(formula: string): LatexSegment[] {
	const segments: LatexSegment[] = [];
	let buffer = "";
	let currentType: LatexSegment["type"] | null = null;

	const flush = () => {
		if (!buffer || !currentType) return;
		appendSegment(segments, currentType, buffer);
		buffer = "";
		currentType = null;
	};

	for (let index = 0; index < formula.length; index++) {
		const textCommand = readTextCommand(formula, index);
		if (textCommand) {
			flush();
			appendSegment(segments, "text", textCommand.content);
			index = textCommand.endIndex;
			continue;
		}

		const char = formula[index]!;
		const nextType = classifyFormulaChar(formula, index, currentType);
		if (currentType && currentType !== nextType) {
			flush();
		}
		currentType = nextType;
		buffer += char;
	}

	flush();
	return segments;
}

function appendSegment(
	segments: LatexSegment[],
	type: LatexSegment["type"],
	value: string,
) {
	if (!value) return;
	const previous = segments[segments.length - 1];
	if (previous && previous.type === type) {
		previous.value += value;
		return;
	}
	segments.push({ type, value });
}

function classifyFormulaChar(
	formula: string,
	index: number,
	currentType: LatexSegment["type"] | null,
): LatexSegment["type"] {
	const char = formula[index]!;
	if (/\s/.test(char)) {
		const next = nextNonWhitespaceChar(formula, index + 1);
		if (currentType === "text" || (next && isChineseTextChar(next))) {
			return "text";
		}
		return "math";
	}

	return isChineseTextChar(char) ? "text" : "math";
}

function nextNonWhitespaceChar(formula: string, start: number): string | null {
	for (let index = start; index < formula.length; index++) {
		const char = formula[index]!;
		if (!/\s/.test(char)) return char;
	}
	return null;
}

function readTextCommand(
	formula: string,
	startIndex: number,
): { content: string; endIndex: number } | null {
	for (const command of TEXT_COMMANDS) {
		const openBraceIndex = startIndex + command.length;
		if (!formula.startsWith(command, startIndex) || formula[openBraceIndex] !== "{") {
			continue;
		}

		const group = readBalancedGroup(formula, openBraceIndex);
		if (group) return group;
	}
	return null;
}

function readBalancedGroup(
	source: string,
	openBraceIndex: number,
): { content: string; endIndex: number } | null {
	let depth = 1;
	const contentStart = openBraceIndex + 1;

	for (let index = contentStart; index < source.length; index++) {
		const char = source[index]!;
		if (char === "\\") {
			index++;
			continue;
		}
		if (char === "{") {
			depth++;
			continue;
		}
		if (char === "}") {
			depth--;
			if (depth === 0) {
				return {
					content: source.slice(contentStart, index),
					endIndex: index,
				};
			}
		}
	}

	return null;
}

function renderTextSegment(value: string): string {
	return `<span class="wechat-latex-text" style="${TEXT_STYLE}">${escapeHtml(value)}</span>`;
}

function renderMathSegment(value: string, tex2svg: LatexSvgRenderer): string {
	const leadingWhitespace = value.match(/^\s*/)?.[0] ?? "";
	const trailingWhitespace = value.match(/\s*$/)?.[0] ?? "";
	const formula = value.trim();

	if (!formula) {
		return escapeHtml(value);
	}

	try {
		const svg = tex2svg(formula, false).trim();
		if (svg && !hasSvgText(svg)) {
			return `${escapeHtml(leadingWhitespace)}${svg}${escapeHtml(trailingWhitespace)}`;
		}
	} catch {
		// Fall through to readable text fallback for this segment.
	}

	return escapeHtml(latexToReadableText(value));
}

function latexToReadableText(source: string): string {
	let result = source;
	const replacements: [RegExp, string][] = [
		[/\\overset\s*\{\s*\\leq?\s*\}\s*\{\s*\\to\s*\}/g, "≤→"],
		[/\\overset\s*\{\s*\\geq?\s*\}\s*\{\s*\\to\s*\}/g, "≥→"],
		[/\\mathbb\s*\{\s*Z\s*\}/g, "ℤ"],
		[/\\mathbb\s*\{\s*N\s*\}/g, "ℕ"],
		[/\\mathbb\s*\{\s*R\s*\}/g, "ℝ"],
		[/\\mathbb\s*\{\s*C\s*\}/g, "ℂ"],
		[/\\rightarrow/g, "→"],
		[/\\leftarrow/g, "←"],
		[/\\leftrightarrow/g, "↔"],
		[/\\to/g, "→"],
		[/\\leq?/g, "≤"],
		[/\\geq?/g, "≥"],
		[/\\neq/g, "≠"],
		[/\\in/g, "∈"],
		[/\\notin/g, "∉"],
		[/\\times/g, "×"],
		[/\\cdot/g, "·"],
		[/\\approx/g, "≈"],
	];

	for (const [pattern, replacement] of replacements) {
		result = result.replace(pattern, replacement);
	}

	return result
		.replace(/[{}]/g, "")
		.replace(/\\/g, "")
		.replace(/\s+/g, " ")
		.trim();
}

function isChineseTextChar(char: string): boolean {
	return CJK_RE.test(char) || CJK_PUNCTUATION_RE.test(char);
}

function hasSvgText(svg: string): boolean {
	return /<text\b/i.test(svg);
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
