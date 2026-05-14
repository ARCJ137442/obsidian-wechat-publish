/**
 * 单元测试：HSL 颜色派生逻辑
 * 验证 themeFromCalloutColor 对各类 RGB 输入的正确派生
 */
import { describe, it, expect } from "vitest";
import { themeFromCalloutColor } from "../src/callout-plugin";

describe("themeFromCalloutColor", () => {
    /** 精度辅助：比较两个 HSL 字符串的 H/S/L 是否接近 */
    function parseHsl(hsl: string): { h: number; s: number; l: number } {
        // 支持 hsl() 和 hsla() 格式
        const match = hsl.match(/hsla?\((\d+),\s*(\d+)%,\s*(\d+)%/);
        if (!match) throw new Error(`Invalid HSL: ${hsl}`);
        return { h: parseInt(match[1]), s: parseInt(match[2]), l: parseInt(match[3]) };
    }

    function expectHslApprox(
        actual: string,
        expectedH: number,
        expectedS: number,
        expectedL: number,
        hTol = 5,
        sTol = 3,
        lTol = 1,
    ) {
        const { h, s, l } = parseHsl(actual);
        expect(h, `hue: expected ~${expectedH}, got ${h}`).toBeCloseTo(expectedH, 0);
        expect(s, `saturation: expected ~${expectedS}, got ${s}`).toBeCloseTo(expectedS, 0);
        expect(l, `lightness: expected ~${expectedL}, got ${l}`).toBeCloseTo(expectedL, 0);
    }

    it("派生 code 色（208, 181, 48）", () => {
        const t = themeFromCalloutColor("208, 181, 48", "code");
        // 实际值：H=50, S=63%, L=50%
        expectHslApprox(t.border, 50, 63, 50);
        expectHslApprox(t.titleColor, 50, 63, 50);
        // bg: L+25 = 75%
        expectHslApprox(t.bg, 50, 63, 75);
        // titleBg: L+12 = 62%
        expectHslApprox(t.titleBg, 50, 63, 62);
        expect(t.title).toBe("Code");
    });

    it("派生 download 色（83, 223, 221）", () => {
        const t = themeFromCalloutColor("83, 223, 221", "download");
        // 实际值：H=179, S=69%, L=60%
        expectHslApprox(t.border, 179, 69, 60);
        expectHslApprox(t.bg, 179, 69, 85);   // L+25 = 85
        expectHslApprox(t.titleBg, 179, 69, 72); // L+12 = 72
        expect(t.title).toBe("Download");
    });

    it("派生 link 色（82, 139, 212）", () => {
        const t = themeFromCalloutColor("82, 139, 212", "link");
        // H≈214, S≈60%, L≈58%
        expectHslApprox(t.border, 214, 60, 58);
        expectHslApprox(t.bg, 214, 60, 83);   // L+25 = 83
        expectHslApprox(t.titleBg, 214, 60, 70); // L+12 = 70
        expect(t.title).toBe("Link");
    });

    it("派生 inspire 色（255, 255, 0）", () => {
        const t = themeFromCalloutColor("255, 255, 0", "inspire");
        // H≈60, S≈100%, L≈50%
        expectHslApprox(t.border, 60, 100, 50);
        expectHslApprox(t.bg, 60, 100, 75);   // L+25 = 75
        expectHslApprox(t.titleBg, 60, 100, 62); // L+12 = 62
        expect(t.title).toBe("Inspire");
    });

    it("派生 btw 色（255, 193, 7）", () => {
        const t = themeFromCalloutColor("255, 193, 7", "btw");
        // H≈45, S≈100%, L≈51%
        expectHslApprox(t.border, 45, 100, 51);
        expectHslApprox(t.bg, 45, 100, 76);   // L+25 = 76
        expectHslApprox(t.titleBg, 45, 100, 63); // L+12 = 63
        expect(t.title).toBe("Btw");
    });

    it("派生 history 色（255, 255, 255）白色 L=100 不溢出", () => {
        const t = themeFromCalloutColor("255, 255, 255", "history");
        // H=0, S=0, L=100
        expectHslApprox(t.border, 0, 0, 100);
        expectHslApprox(t.titleColor, 0, 0, 100);
        // bg: L+25 clamp 到 95（不超过 95）
        expectHslApprox(t.bg, 0, 0, 95);
        // titleBg: L+12 clamp 到 90
        expectHslApprox(t.titleBg, 0, 0, 90);
        expect(t.title).toBe("History");
    });

    it("派生 key 色（0, 255, 204）青绿色", () => {
        const t = themeFromCalloutColor("0, 255, 204", "key");
        // 实际值：H=168, S=100%, L=50%
        expectHslApprox(t.border, 168, 100, 50);
        expectHslApprox(t.bg, 168, 100, 75);
        expectHslApprox(t.titleBg, 168, 100, 62);
        expect(t.title).toBe("Key");
    });

    it("派生 analyze 色（153, 102, 255）紫色", () => {
        const t = themeFromCalloutColor("153, 102, 255", "analyze");
        // 实际值：H=260, S=100%, L=70%
        expectHslApprox(t.border, 260, 100, 70);
        expectHslApprox(t.bg, 260, 100, 95);   // L+25 clamp 到 95
        expectHslApprox(t.titleBg, 260, 100, 82); // L+12 = 82
        expect(t.title).toBe("Analyze");
    });

    it("黑色（0, 0, 0）L=0，bg 不下溢", () => {
        const t = themeFromCalloutColor("0, 0, 0", "test");
        expectHslApprox(t.border, 0, 0, 0);
        expectHslApprox(t.bg, 0, 0, 25);   // L+25 = 25
        expectHslApprox(t.titleBg, 0, 0, 12); // L+12 = 12
    });

    it("6 个代表色相的派生正确性（红/橙/黄/绿/蓝/紫）", () => {
        const cases = [
            { rgb: "255, 0, 0",   expectedH: 0   },
            { rgb: "255, 165, 0",  expectedH: 39  },
            { rgb: "255, 255, 0",   expectedH: 60  },
            { rgb: "0, 255, 0",     expectedH: 120 },
            { rgb: "0, 0, 255",     expectedH: 240 },
            { rgb: "128, 0, 128",   expectedH: 300 },
        ];
        for (const { rgb, expectedH } of cases) {
            const t = themeFromCalloutColor(rgb, "test");
            const { h } = parseHsl(t.border);
            expect(h, `RGB(${rgb}): hue expected ~${expectedH}, got ${h}`).toBeCloseTo(expectedH, 0);
        }
    });

    it("border 和 titleColor 始终同色（同一色相）", () => {
        const testCases = [
            { rgb: "208, 181, 48", type: "code" },
            { rgb: "0, 255, 204", type: "key" },
            { rgb: "255, 193, 7", type: "btw" },
            { rgb: "153, 102, 255", type: "analyze" },
        ];
        for (const { rgb, type } of testCases) {
            const t = themeFromCalloutColor(rgb, type);
            expect(t.border).toBe(t.titleColor);
        }
    });

    it("bg 比 titleBg 亮（L 值更大）", () => {
        const testCases = [
            { rgb: "208, 181, 48", type: "code" },
            { rgb: "83, 223, 221", type: "download" },
            { rgb: "0, 0, 0", type: "test" },
            { rgb: "255, 255, 255", type: "history" },
        ];
        for (const { rgb, type } of testCases) {
            const t = themeFromCalloutColor(rgb, type);
            const bgL = parseHsl(t.bg).l;
            const titleBgL = parseHsl(t.titleBg).l;
            expect(bgL, `RGB(${rgb}): bg L=${bgL} should be >= titleBg L=${titleBgL}`).toBeGreaterThanOrEqual(titleBgL);
        }
    });
});
