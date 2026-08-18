import MarkdownIt, { type PluginSimple } from "markdown-it";
// @ts-ignore - no types available
import markdownItMark from "markdown-it-mark";
import preprocessCallouts, { postprocessCallouts } from "./callout-plugin";
import {
	renderLatexFallback,
	replaceLatexPlaceholderHtml,
} from "./latex-rendering";
import { convertWikiLinks, type WikiLinkResolver } from "./wiki-links";

export type LatexRenderResult = {
	html: string;
	fallback?: boolean;
};

export type MarkdownCoreOptions = {
	currentPath?: string;
	resolveWikiLink?: WikiLinkResolver;
	renderLatex?: (
		formula: string,
		displayMode: boolean,
	) => LatexRenderResult;
};

export type MarkdownCoreDiagnostics = {
	formulaCount: number;
	latexFallbackCount: number;
	wikilinkCount: number;
	unresolvedWikilinkCount: number;
};

export type MarkdownCoreResult = {
	html: string;
	diagnostics: MarkdownCoreDiagnostics;
};

type LatexFormula = {
	formula: string;
	displayMode: boolean;
};

type LatexExtraction = {
	markdown: string;
	formulas: Map<string, LatexFormula>;
	exclusions: Map<string, string>;
};

const MARKDOWN_ESCAPES: [string, string][] = [
	["\\\\", "\\"],
	["\\_", "_"],
	["\\*", "*"],
	["\\`", "`"],
	["\\#", "#"],
	["\\+", "+"],
	["\\-", "-"],
	["\\.", "."],
	["\\!", "!"],
	["\\(", "("],
	["\\)", ")"],
	["\\[", "["],
	["\\]", "]"],
	["\\{", "{"],
	["\\}", "}"],
	["\\~", "~"],
];

const LATEX_PLACEHOLDER_PREFIX = "\uE000LATEX";
const LATEX_PLACEHOLDER_SUFFIX = "\uE000";
const LATEX_EXCLUSION_PREFIX = "\uE001LATEX_EXCLUSION";
const LATEX_EXCLUSION_SUFFIX = "\uE002";

function isEscaped(text: string, index: number): boolean {
	let backslashCount = 0;
	for (let i = index - 1; i >= 0 && text[i] === "\\"; i--) {
		backslashCount++;
	}
	return backslashCount % 2 === 1;
}

function protectLatexExclusions(markdown: string): {
	markdown: string;
	exclusions: Map<string, string>;
} {
	const exclusions = new Map<string, string>();
	let exclusionIndex = 0;

	const protect = (text: string): string => {
		const placeholder = `${LATEX_EXCLUSION_PREFIX}${exclusionIndex}${LATEX_EXCLUSION_SUFFIX}`;
		exclusionIndex++;
		exclusions.set(placeholder, text);
		return placeholder;
	};

	// Fenced blocks are protected first, so backticks and dollar signs inside
	// them cannot be mistaken for Markdown inline syntax or formulas.
	let protectedMarkdown = markdown.replace(
		/^ {0,3}(`{3,}|~{3,})[^\n]*\n[\s\S]*?^ {0,3}\1[ \t]*(?:\n|$)/gm,
		(match) => protect(match),
	);

	// Raw paired HTML is kept as one unit. This covers dollar signs in both
	// attributes and text while retaining MarkdownIt's existing HTML support.
	protectedMarkdown = protectedMarkdown.replace(
		/<([A-Za-z][\w:-]*)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,
		(match) => protect(match),
	);
	protectedMarkdown = protectedMarkdown.replace(
		/<!--[\s\S]*?-->|<\/?[A-Za-z][^>]*>/g,
		(match) => protect(match),
	);

	// Protect inline code spans after fenced blocks have been removed. The
	// simple one-backtick form is the common case; the repeated-backtick form
	// is handled as well by matching the same delimiter on both sides.
	protectedMarkdown = protectedMarkdown.replace(
		/(^|[^`])(`+)(?!`)([\s\S]*?)\2(?!`)/g,
		(_match, prefix: string, delimiter: string, content: string) =>
			`${prefix}${protect(`${delimiter}${content}${delimiter}`)}`,
	);

	return { markdown: protectedMarkdown, exclusions };
}

function restoreLatexExclusions(
	text: string,
	exclusions: Map<string, string>,
): string {
	let result = text;
	for (let pass = 0; pass <= exclusions.size; pass++) {
		const previous = result;
		for (const [placeholder, original] of exclusions) {
			result = result.split(placeholder).join(original);
		}
		if (result === previous) break;
	}
	return result;
}

function findClosingDollar(
	text: string,
	start: number,
	delimiterLength: number,
): number {
	for (let index = start; index < text.length; index++) {
		if (text[index] !== "$" || isEscaped(text, index)) continue;
		if (delimiterLength === 2) {
			if (text.slice(index, index + 2) === "$$") return index;
			continue;
		}
		if (text[index - 1] === "$" || text[index + 1] === "$") continue;
		if (/\s/.test(text[index - 1] ?? "")) continue;
		return index;
	}
	return -1;
}

function isLikelyInlineFormulaStart(text: string, index: number): boolean {
	const next = text[index + 1] ?? "";
	// Match Obsidian's inline delimiter rule: the opening dollar must touch a
	// non-whitespace character. The closing delimiter is validated separately
	// by findClosingDollar(), so paired numeric formulas such as `$1$` and
	// `$100$` are not mistaken for currency merely because they start with a
	// digit. An unpaired `$100` remains ordinary text.
	return next !== "" && !/\s/.test(next);
}

function extractLatexWithPlaceholders(markdown: string): LatexExtraction {
	const { markdown: protectedMarkdown, exclusions } =
		protectLatexExclusions(markdown);
	const formulas = new Map<string, LatexFormula>();
	let formulaIndex = 0;
	let result = "";

	const addFormula = (
		formula: string,
		displayMode: boolean,
	): string => {
		const placeholder = `${LATEX_PLACEHOLDER_PREFIX}${formulaIndex}${LATEX_PLACEHOLDER_SUFFIX}`;
		formulas.set(placeholder, { formula: formula.trim(), displayMode });
		formulaIndex++;
		return placeholder;
	};

	for (let index = 0; index < protectedMarkdown.length; ) {
		if (
			protectedMarkdown[index] !== "$" ||
			isEscaped(protectedMarkdown, index)
		) {
			result += protectedMarkdown[index] ?? "";
			index++;
			continue;
		}

		const isDisplay = protectedMarkdown.slice(index, index + 2) === "$$";
		if (
			!isDisplay &&
			/\d/.test(protectedMarkdown[index - 1] ?? "")
		) {
			// When a numeric "$1$"-style fragment was rejected as prose, its
			// second dollar must not become a fresh formula opener and consume
			// text until a later dollar sign.
			result += "$";
			index++;
			continue;
		}
		if (!isDisplay && !isLikelyInlineFormulaStart(protectedMarkdown, index)) {
			result += "$";
			index++;
			continue;
		}

		const delimiterLength = isDisplay ? 2 : 1;
		const contentStart = index + delimiterLength;
		const closingIndex = findClosingDollar(
			protectedMarkdown,
			contentStart,
			delimiterLength,
		);
		if (closingIndex < 0) {
			result += protectedMarkdown[index] ?? "";
			index++;
			continue;
		}

		const formula = protectedMarkdown.slice(contentStart, closingIndex).trim();
		if (!formula) {
			result += protectedMarkdown.slice(index, closingIndex + delimiterLength);
			index = closingIndex + delimiterLength;
			continue;
		}

		result += addFormula(formula, isDisplay);
		index = closingIndex + delimiterLength;
	}

	return { markdown: result, formulas, exclusions };
}

/** Extract display and inline formulas before Markdown escape handling. */
export function extractLatex(markdown: string): LatexFormula[] {
	return Array.from(extractLatexWithPlaceholders(markdown).formulas.values());
}

function unescapeMarkdown(text: string): {
	text: string;
	placeholders: Map<string, string>;
} {
	const placeholders = new Map<string, string>();
	let result = text;
	for (let i = 0; i < MARKDOWN_ESCAPES.length; i++) {
		const escape = MARKDOWN_ESCAPES[i];
		if (!escape) continue;
		const [source, replacement] = escape;
		const placeholder = `\uE000MDESC${i}\uE000`;
		result = result.split(source).join(placeholder);
		placeholders.set(placeholder, replacement);
	}
	return { text: result, placeholders };
}

function restoreEscapes(
	text: string,
	placeholders: Map<string, string>,
): string {
	let result = text;
	for (const [placeholder, replacement] of placeholders) {
		result = result.split(placeholder).join(replacement);
	}
	return result;
}

export function preventBreakAfterStrong(html: string): string {
	let result = html;
	result = result.replace(/(<\/strong>)(<)/g, "$1\uFEFF$2");
	result = result.replace(/(<\/b>)(<)/g, "$1\uFEFF$2");
	result = result.replace(/(<\/span>)(<)/g, "$1\uFEFF$2");
	result = result.replace(/(<\/strong>)(\s*)([：:])/g, "$1\uFEFF$2$3");
	result = result.replace(/(<\/b>)(\s*)([：:])/g, "$1\uFEFF$2$3");
	result = result.replace(/(<\/span>)(\s*)([：:])/g, "$1\uFEFF$2$3");
	return result;
}

export function renderMarkdownCore(
	markdown: string,
	options: MarkdownCoreOptions = {},
): MarkdownCoreResult {
	let wikilinkCount = 0;
	let unresolvedWikilinkCount = 0;
	const normalized = options.resolveWikiLink
		? convertWikiLinks(
				markdown,
				options.currentPath ?? "",
				options.resolveWikiLink,
				() => {
					unresolvedWikilinkCount++;
				},
				() => {
					wikilinkCount++;
				},
			)
		: markdown;

	const {
		markdown: withLatexPlaceholders,
		formulas,
		exclusions,
	} =
		extractLatexWithPlaceholders(normalized);
	const { text: unescaped, placeholders } = unescapeMarkdown(
		withLatexPlaceholders,
	);
	const md = new MarkdownIt({ html: true, breaks: true, linkify: true });
	md.use(markdownItMark as PluginSimple);

	const preprocessed = preprocessCallouts(
		restoreLatexExclusions(unescaped, exclusions),
	);
	let html = postprocessCallouts(md.render(preprocessed));
	html = restoreEscapes(html, placeholders);
	html = preventBreakAfterStrong(html);

	let latexFallbackCount = 0;
	for (const [placeholder, { formula, displayMode }] of formulas) {
		const rendered = options.renderLatex?.(formula, displayMode) ?? {
			html: renderLatexFallback(formula, displayMode),
			fallback: true,
		};
		if (rendered.fallback) latexFallbackCount++;
		html = replaceLatexPlaceholderHtml(
			html,
			placeholder,
			rendered.html,
			displayMode,
		);
	}

	return {
		html,
		diagnostics: {
			formulaCount: formulas.size,
			latexFallbackCount,
			wikilinkCount,
			unresolvedWikilinkCount,
		},
	};
}
