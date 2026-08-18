export function buildCopyCSS(css: string): string {
	let copy = removeColorSchemeMediaBlocks(css);
	copy = stripStandaloneTextColorDeclarations(copy);
	copy = copy.replace(
		/background:\s*linear-gradient\([^)]+rgba\(0,\s*0,\s*0[^)]+\)[^)]*\)/g,
		"background-color: rgba(0,0,0,0.15)",
	);
	copy += "\nblockquote, blockquote p { color: rgba(0,0,0,0.5) !important; }";
	return copy;
}

/** Remove only color-scheme media queries; preserve responsive/print media. */
export function removeColorSchemeMediaBlocks(css: string): string {
	let result = "";
	let cursor = 0;

	while (cursor < css.length) {
		const mediaIndex = findNextMediaIndex(css, cursor);
		if (mediaIndex < 0) {
			result += css.slice(cursor);
			break;
		}

		result += css.slice(cursor, mediaIndex);
		const openBrace = css.indexOf("{", mediaIndex);
		if (openBrace < 0) {
			result += css.slice(mediaIndex);
			break;
		}
		const closeBrace = findMatchingBrace(css, openBrace);
		if (closeBrace < 0) {
			result += css.slice(mediaIndex);
			break;
		}

		const header = css.slice(mediaIndex, openBrace);
		if (!/prefers-color-scheme\s*:/i.test(header)) {
			result += css.slice(mediaIndex, closeBrace + 1);
		}
		cursor = closeBrace + 1;
	}

	return result;
}

function findNextMediaIndex(css: string, start: number): number {
	let inComment = false;
	let quote: string | null = null;

	for (let index = start; index < css.length; index++) {
		const current = css[index] ?? "";
		const next = css[index + 1] ?? "";

		if (inComment) {
			if (current === "*" && next === "/") {
				inComment = false;
				index++;
			}
			continue;
		}
		if (quote) {
			if (current === "\\") {
				index++;
			} else if (current === quote) {
				quote = null;
			}
			continue;
		}
		if (current === "/" && next === "*") {
			inComment = true;
			index++;
			continue;
		}
		if (current === '"' || current === "'") {
			quote = current;
			continue;
		}
		if (
			css.startsWith("@media", index) &&
			!/[\w-]/.test(css[index - 1] ?? "") &&
			!/[\w-]/.test(css[index + 6] ?? "")
		) {
			return index;
		}
	}

	return -1;
}

function findMatchingBrace(css: string, openBrace: number): number {
	let depth = 0;
	let inComment = false;
	let quote: string | null = null;

	for (let index = openBrace; index < css.length; index++) {
		const current = css[index] ?? "";
		const next = css[index + 1] ?? "";

		if (inComment) {
			if (current === "*" && next === "/") {
				inComment = false;
				index++;
			}
			continue;
		}
		if (quote) {
			if (current === "\\") {
				index++;
			} else if (current === quote) {
				quote = null;
			}
			continue;
		}
		if (current === "/" && next === "*") {
			inComment = true;
			index++;
			continue;
		}
		if (current === '"' || current === "'") {
			quote = current;
			continue;
		}
		if (current === "{") depth++;
		if (current === "}" && --depth === 0) return index;
	}

	return -1;
}

function stripStandaloneTextColorDeclarations(css: string): string {
	return css
		.replace(/^\s*color:\s*[^;]+;\s*$/gm, "")
		.replace(/^\s*color:\s*rgba?\([^)]+\)\s*!?\s*;?\s*$/gm, "")
		.replace(/^\s*color:\s*#[0-9a-fA-F]+\s*!?\s*;?\s*$/gm, "");
}
