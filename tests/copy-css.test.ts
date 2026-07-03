import { describe, expect, it } from "vitest";
import juice from "juice";
import { buildCopyCSS } from "../src/copy-css";

describe("WeChat copy CSS", () => {
	it("strips standalone text color declarations without touching selector colors", () => {
		const css = `
.wechat-content p {
	color: rgba(0, 0, 0, 0.9);
	margin: 0;
}
.wechat-callout-example .wechat-callout-title { color: #4a7566; }
.wechat-callout-example td { border-left-color: #0ca678; background: #eff7f5; }
`;

		const copyCSS = buildCopyCSS(css);

		expect(copyCSS).not.toContain("color: rgba(0, 0, 0, 0.9)");
		expect(copyCSS).toContain("color: #4a7566");
		expect(copyCSS).toContain("border-left-color: #0ca678");
	});

	it("does not inject highlighted bold color rules for WeChat copy", () => {
		const copyCSS = buildCopyCSS(`
strong { font-weight: 600; }
.highlight { background-color: rgba(0,0,0,0.15); }
.wechat-callout-example .wechat-callout-title { color: #4a7566; }
`);
		const html = `<div class="wechat-content"><style>${copyCSS}</style><p><span class="highlight"><strong>高亮粗体</strong></span></p></div>`;

		const inlined = juice(html);

		expect(copyCSS).not.toContain(".highlight strong");
		expect(inlined).toContain("高亮粗体");
		expect(inlined).not.toContain("#4a7566");
		expect(inlined).not.toContain("color: inherit");
	});
});
