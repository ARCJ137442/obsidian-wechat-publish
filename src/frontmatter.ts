import { parse as parseYaml } from "yaml";

export type FrontmatterMeta = Record<string, unknown>;

export type ParsedFrontmatter = {
	meta: FrontmatterMeta;
	body: string;
	error?: string;
};

const OPENING_DELIMITER = /^(?:[ \t]*\r?\n)*---[ \t]*(?:\r?\n|$)/;
const CLOSING_DELIMITER = /^(?:---|\.\.\.)[ \t]*(?:\r?\n|$)/gm;

/** Parse the frontmatter of the current editor buffer without using metadata cache. */
export function parseFrontmatter(text: string): ParsedFrontmatter {
	const source = text.replace(/^\uFEFF/, "");
	const opening = source.match(OPENING_DELIMITER);
	if (!opening) return { meta: {}, body: text };

	const bodyStart = opening[0].length;
	CLOSING_DELIMITER.lastIndex = bodyStart;
	const closing = CLOSING_DELIMITER.exec(source);
	if (!closing || closing.index < bodyStart) {
		return { meta: {}, body: text };
	}

	const frontmatterText = source.slice(bodyStart, closing.index);
	const body = source.slice(closing.index + closing[0].length).trim();
	try {
		const parsed: unknown = parseYaml(frontmatterText);
		if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
			return { meta: {}, body };
		}
		return { meta: parsed as FrontmatterMeta, body };
	} catch (error) {
		return {
			meta: {},
			body,
			error: error instanceof Error ? error.message : String(error),
		};
	}
}

export function getFrontmatterString(
	meta: FrontmatterMeta,
	key: string,
	fallback = "",
): string {
	const value = meta[key];
	if (typeof value === "string") return value;
	if (typeof value === "number" || typeof value === "boolean") {
		return String(value);
	}
	return fallback;
}
