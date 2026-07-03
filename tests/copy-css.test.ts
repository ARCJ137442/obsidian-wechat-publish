import { describe, expect, it } from "vitest";
import juice from "juice";
import { buildCopyCSS } from "../src/copy-css";

describe("WeChat copy CSS", () => {
	it("strips one-line text color declarations without touching border colors", () => {
		const css = `
.wechat-content p { color: rgba(0, 0, 0, 0.9); margin: 0; }
.wechat-callout-example .wechat-callout-title { color: #4a7566; }
.wechat-callout-example td { border-left-color: #0ca678; background: #eff7f5; }
`;

		const copyCSS = buildCopyCSS(css);

		expect(copyCSS).not.toContain("color: #4a7566");
		expect(copyCSS).not.toContain("color: rgba(0, 0, 0, 0.9)");
		expect(copyCSS).toContain("border-left-color: #0ca678");
	});

	it("forces highlighted bold text to inherit the surrounding WeChat text color", () => {
		const copyCSS = buildCopyCSS(`
.wechat-content { color: rgba(0, 0, 0, 0.9); }
strong { font-weight: 600; }
.highlight { background-color: rgba(0,0,0,0.15); }
.highlight strong { color: #4a7566; }
`);
		const html = `<div class="wechat-content"><style>${copyCSS}</style><p><span class="highlight"><strong>高亮粗体</strong></span></p></div>`;

		const inlined = juice(html);

		expect(inlined).toContain("color: inherit");
		expect(inlined).not.toContain("#4a7566");
	});
});
