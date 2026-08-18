/** Combine the built-in theme with user CSS overrides in deterministic order. */
export function buildThemeCSS(defaultCSS: string, customCSS: string): string {
	const base = defaultCSS.trim();
	const custom = customCSS.trim();

	if (!custom || custom === base) return base;
	return `${base}\n\n/* User custom CSS overrides */\n${custom}`;
}
