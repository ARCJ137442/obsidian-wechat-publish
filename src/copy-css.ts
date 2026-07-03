export function buildCopyCSS(css: string): string {
	const mediaIdx = css.indexOf("@media");
	let copy = mediaIdx >= 0 ? css.substring(0, mediaIdx) : css;
	copy = stripTextColorDeclarations(copy);
	copy = copy.replace(
		/background:\s*linear-gradient\([^)]+rgba\(0,\s*0,\s*0[^)]+\)[^)]*\)/g,
		"background-color: rgba(0,0,0,0.15)",
	);
	copy += "\n.highlight strong { color: inherit !important; }";
	copy += "\nblockquote, blockquote p { color: rgba(0,0,0,0.5) !important; }";
	return copy;
}

function stripTextColorDeclarations(css: string): string {
	return css.replace(/(?<![-\w])color\s*:\s*[^;}]+;?/g, "");
}
