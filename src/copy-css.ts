export function buildCopyCSS(css: string): string {
	const mediaIdx = css.indexOf("@media");
	let copy = mediaIdx >= 0 ? css.substring(0, mediaIdx) : css;
	copy = stripStandaloneTextColorDeclarations(copy);
	copy = copy.replace(
		/background:\s*linear-gradient\([^)]+rgba\(0,\s*0,\s*0[^)]+\)[^)]*\)/g,
		"background-color: rgba(0,0,0,0.15)",
	);
	copy += "\nblockquote, blockquote p { color: rgba(0,0,0,0.5) !important; }";
	return copy;
}

function stripStandaloneTextColorDeclarations(css: string): string {
	return css
		.replace(/^\s*color:\s*[^;]+;\s*$/gm, "")
		.replace(/^\s*color:\s*rgba?\([^)]+\)\s*!?\s*;?\s*$/gm, "")
		.replace(/^\s*color:\s*#[0-9a-fA-F]+\s*!?\s*;?\s*$/gm, "");
}
