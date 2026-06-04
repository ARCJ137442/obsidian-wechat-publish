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
			// Obsidian plugins use Node.js/Electron builtins at runtime
			"import/no-nodejs-modules": "off",
			"@typescript-eslint/no-require-imports": "off",
			"no-undef": "off",
			// JSON.parse returns any; Obsidian CachedMetadata.frontmatter is Record<string, any>
			"@typescript-eslint/no-unsafe-assignment": "off",
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
