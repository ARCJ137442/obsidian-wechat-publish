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

/** Extract display and inline formulas before Markdown escape handling. */
export function extractLatex(markdown: string): LatexFormula[] {
	const formulas: LatexFormula[] = [];
	markdown
		.replace(/\$\$([\s\S]+?)\$\$/g, (_match, formula: string) => {
			formulas.push({ formula: formula.trim(), displayMode: true });
			return `\uE000LATEX${formulas.length - 1}\uE000`;
		})
		.replace(/\$(.+?)\$/g, (_match, formula: string) => {
			formulas.push({ formula: formula.trim(), displayMode: false });
			return `\uE000LATEX${formulas.length - 1}\uE000`;
		});
	return formulas;
}

function extractLatexWithPlaceholders(markdown: string): {
	markdown: string;
	formulas: Map<string, LatexFormula>;
} {
	const formulas = new Map<string, LatexFormula>();
	let formulaIndex = 0;
	const withPlaceholders = markdown
		.replace(/\$\$([\s\S]+?)\$\$/g, (_match, formula: string) => {
			const placeholder = `\uE000LATEX${formulaIndex}\uE000`;
			formulas.set(placeholder, {
				formula: formula.trim(),
				displayMode: true,
			});
			formulaIndex++;
			return placeholder;
		})
		.replace(/\$(.+?)\$/g, (_match, formula: string) => {
			const placeholder = `\uE000LATEX${formulaIndex}\uE000`;
			formulas.set(placeholder, {
				formula: formula.trim(),
				displayMode: false,
			});
			formulaIndex++;
			return placeholder;
		});
	return { markdown: withPlaceholders, formulas };
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

	const { markdown: withLatexPlaceholders, formulas } =
		extractLatexWithPlaceholders(normalized);
	const { text: unescaped, placeholders } = unescapeMarkdown(
		withLatexPlaceholders,
	);
	const md = new MarkdownIt({ html: true, breaks: true, linkify: true });
	md.use(markdownItMark as PluginSimple);

	const preprocessed = preprocessCallouts(unescaped);
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
