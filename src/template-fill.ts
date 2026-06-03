/**
 * Python-style string template filling.
 * Ported from $template/series.template.md 模板填充().
 *
 * Format spec: [[fill]align][width][type]
 * - type: d (int), f (2dp), x (hex), s (string, default)
 * - align: < (left), > (right, default), ^ (center)
 * - fill: any char (default space), 0-prefix triggers zero-fill
 *
 * @example fillTemplate('{n:03d} {theme}', { n: 16, theme: '行' }) // '016 行'
 */
export function fillTemplate(
	template: string,
	vars: Record<string, unknown>,
): string {
	return template.replace(
		/{([^:}]+)(?::([^}]+))?}/g,
		(_match: string, key: string, fmt: string | undefined) => {
			const val = vars[key];
			if (val === undefined) return _match;
			if (!fmt)
				return typeof val === "string" ? val : JSON.stringify(val);

			let fill = " ";
			let align = "";
			let width = 0;
			let type = "";

			// Extract type specifier (d, f, x, s) from end
			const typeMatch = fmt.match(/[dfxs]$/);
			if (typeMatch) {
				type = typeMatch[0];
				fmt = fmt.slice(0, -typeMatch[0].length);
			}

			// Check for zero-fill with alignment: 0< 0> 0^
			const zeroFillMatch = fmt.match(/^(0)([<^>])/);
			if (zeroFillMatch) {
				fill = "0";
				align = zeroFillMatch[2]!;
				fmt = fmt.slice(2);
			} else {
				// Check for alignment char at start
				const alignMatch = fmt.match(/^[<^>]/);
				if (alignMatch) {
					align = alignMatch[0];
					fmt = fmt.slice(1);
				}
				// Check for implicit zero-fill (0 followed by digits)
				if (fmt.match(/^0\d+/)) {
					fill = "0";
					fmt = fmt.slice(1);
				}
			}

			// Extract width
			const widthMatch = fmt.match(/^\d+/);
			if (widthMatch) {
				width = parseInt(widthMatch[0], 10);
				fmt = fmt.slice(widthMatch[0].length);
			}

			// Remaining fmt chars become fill char
			if (fmt) fill = fmt;
			if (!align) align = ">";

			let result = typeof val === "string" ? val : JSON.stringify(val);
			if (type === "d") result = parseInt(result, 10).toString();
			else if (type === "f") result = parseFloat(result).toFixed(2);
			else if (type === "x") result = parseInt(result, 10).toString(16);

			if (width && result.length < width) {
				if (align === "<") result = result.padEnd(width, fill);
				else result = result.padStart(width, fill);
			}

			return result;
		},
	);
}
