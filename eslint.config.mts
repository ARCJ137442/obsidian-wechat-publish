import tseslint from "typescript-eslint";
import obsidianmd from "eslint-plugin-obsidianmd";
import globals from "globals";
import { globalIgnores } from "eslint/config";

export default tseslint.config(
	{
		languageOptions: {
			globals: {
				...globals.browser,
			},
			parserOptions: {
				projectService: {
					allowDefaultProject: ["eslint.config.js", "manifest.json"],
				},
				tsconfigRootDir: import.meta.dirname,
				extraFileExtensions: [".json"],
			},
		},
	},
	...obsidianmd.configs.recommended,
	{
		rules: {
		// Obsidian plugins run in Electron; console.log is useful for DevTools debugging
		"no-console": [
			"warn",
			{ allow: ["log", "warn", "error", "debug"] },
		],
		},
	},
	{
		files: ["src/main.ts"],
		languageOptions: {
			globals: {
				...globals.node,
				...globals.browser,
			},
		},
		rules: {
			// Existing UI labels and Chinese notices are intentionally not sentence-cased.
			"obsidianmd/ui/sentence-case": "off",
			// Obsidian plugins use Node.js/Electron builtins at runtime
			"import/no-nodejs-modules": "off",
			"@typescript-eslint/no-require-imports": "off",
			"no-undef": "off",
			// JSON.parse returns any; Obsidian CachedMetadata.frontmatter is Record<string, any>
			"@typescript-eslint/no-explicit-any": "off",
			"@typescript-eslint/no-unsafe-assignment": "off",
			"@typescript-eslint/no-unsafe-call": "off",
			"@typescript-eslint/no-unsafe-member-access": "off",
		},
	},
	{
		files: ["src/mathjax-svg.ts"],
		languageOptions: {
			globals: {
				...globals.node,
			},
		},
		rules: {
			"@typescript-eslint/no-unsafe-assignment": "off",
			"@typescript-eslint/no-unsafe-argument": "off",
			"import/no-nodejs-modules": "off",
			"@typescript-eslint/no-require-imports": "off",
		},
	},
	{
		files: ["src/desktop-runtime.ts"],
		languageOptions: {
			globals: {
				...globals.node,
				...globals.browser,
			},
		},
		rules: {
			// Desktop-only adapter: synchronous Node/Electron access is intentional at this boundary.
			"import/no-nodejs-modules": "off",
			"@typescript-eslint/no-require-imports": "off",
			"no-undef": "off",
		},
	},
	{
		files: ["src/image-output.ts"],
		rules: {
			// This module serializes inline styles into exported WeChat HTML, not Obsidian UI.
			"obsidianmd/no-static-styles-assignment": "off",
		},
	},
	globalIgnores([
		"node_modules",
		"dist",
		"esbuild.config.mjs",
		"eslint.config.js",
		"version-bump.mjs",
		"versions.json",
		"main.js",
		"mathjax-svg.js",
	]),
);
