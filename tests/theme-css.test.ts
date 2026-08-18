import { describe, expect, it } from "vitest";
import { buildThemeCSS } from "../src/theme-css";

describe("主题 CSS 分层", () => {
	it("默认 CSS 作为唯一基础层，默认设置不会重复注入", () => {
		const defaultCSS = ".wechat-content { color: black; }";

		expect(buildThemeCSS(defaultCSS, defaultCSS)).toBe(defaultCSS);
		expect(buildThemeCSS(defaultCSS, "")).toBe(defaultCSS);
	});

	it("用户 CSS 作为覆盖层，即使只覆盖 Callout 也保留默认主题", () => {
		const defaultCSS = ".wechat-content { color: black; }";
		const customCSS = ".wechat-callout { margin: 0; }";
		const combined = buildThemeCSS(defaultCSS, customCSS);

		expect(combined.indexOf(defaultCSS)).toBeLessThan(combined.indexOf(customCSS));
		expect(combined).toContain(".wechat-content { color: black; }");
		expect(combined).toContain(".wechat-callout { margin: 0; }");
	});
});
