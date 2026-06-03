/**
 * Rollup config for MathJax SVG module.
 *
 * mathjax-full uses CJS modules with global state (mathjax.handlers)
 * that esbuild breaks. Rollup's commonjs() plugin preserves this state correctly.
 *
 * Output: mathjax-svg.js (CJS) — loaded at runtime via require().
 */
import { nodeResolve } from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import typescript from "@rollup/plugin-typescript";

export default {
	input: "src/mathjax-svg.ts",
	output: {
		file: "mathjax-svg.js",
		format: "cjs",
		exports: "auto",
	},
	external: ["obsidian"],
	plugins: [
		typescript({
			tsconfig: "./tsconfig.mathjax.json",
		}),
		commonjs(),
		nodeResolve({ browser: true, preferBuiltins: false }),
	],
};
