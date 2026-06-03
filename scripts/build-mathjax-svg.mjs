/**
 * Build pipeline for MathJax SVG module:
 *   1. esbuild: TS → JS (transpile only, no bundling)
 *   2. rollup:  Bundle CJS modules (preserves MathJax global state)
 *   3. Output:  mathjax-svg.js (CJS)
 *
 * Why not esbuild alone? mathjax-full relies on global state (mathjax.handlers)
 * that esbuild's tree-shaking breaks. Rollup's commonjs() plugin preserves it.
 *
 * Critical: @rollup/plugin-replace replaces PACKAGE_VERSION with a constant,
 * preventing MathJax's eval('require') + eval('__dirname') from running in
 * Obsidian's Electron environment (where __dirname points to Obsidian's install dir).
 */
import { build as esbuild } from "esbuild";
import { rollup } from "rollup";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import replace from "@rollup/plugin-replace";

const TEMP_FILE = ".mathjax-svg-temp.js";

async function build() {
	// Step 1: esbuild transpile TS → JS (no bundle, no tree-shaking)
	await esbuild({
		entryPoints: ["src/mathjax-svg.ts"],
		outfile: TEMP_FILE,
		format: "esm",
		platform: "browser",
		target: "es6",
		bundle: false,
	});

	// Step 2: rollup bundle with commonjs() to preserve MathJax global state
	const bundle = await rollup({
		input: TEMP_FILE,
		plugins: [
			replace({
				preventAssignment: true,
				values: {
					// Kill MathJax's eval('require') version detection at build time
					"typeof PACKAGE_VERSION === 'undefined'": "false",
					PACKAGE_VERSION: JSON.stringify("3.2.1"),
				},
			}),
			commonjs(),
			nodeResolve({ browser: true, preferBuiltins: false }),
		],
	});

	await bundle.write({
		file: "mathjax-svg.js",
		format: "cjs",
		exports: "auto",
	});

	// Step 3: cleanup temp file
	const fs = await import("fs");
	fs.unlinkSync(TEMP_FILE);

	// Report size
	const stats = fs.statSync("mathjax-svg.js");
	console.log(`mathjax-svg.js: ${(stats.size / 1024).toFixed(0)} KB`);
}

build().catch((e) => {
	console.error(e);
	process.exit(1);
});
