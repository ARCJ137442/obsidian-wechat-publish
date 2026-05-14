/**
 * 集成测试：buildMergedCalloutData 与真实 callout-manager JSON 的联动
 *
 * 测试策略：
 * 1. 读取真实 vault 的 .obsidian/plugins/callout-manager/data.json
 * 2. 验证合并后的 themes 和 aliases 符合预期
 * 3. 验证内置 callout 未被意外覆盖
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { buildMergedCalloutData, themeFromCalloutColor } from "../src/callout-plugin";
import type { CalloutManagerJson } from "../src/callout-plugin";

// ── 读取真实 vault 的 callout-manager 配置 ──

const VAULT_PATH = "H:/A137442/Document/life-series";
const CM_JSON_PATH = resolve(VAULT_PATH, ".obsidian/plugins/callout-manager/data.json");

function loadRealCalloutManagerJson(): CalloutManagerJson {
    const raw = readFileSync(CM_JSON_PATH, "utf-8");
    return JSON.parse(raw) as CalloutManagerJson;
}

// ── 辅助：解析 hsl() 字符串 ──

function parseHsl(hsl: string): { h: number; s: number; l: number } {
    // 支持 hsl() 和 hsla() 格式
    const match = hsl.match(/hsla?\((\d+),\s*(\d+)%,\s*(\d+)%/);
    if (!match) throw new Error(`Invalid HSL: ${hsl}`);
    return { h: parseInt(match[1]), s: parseInt(match[2]), l: parseInt(match[3]) };
}

describe("buildMergedCalloutData（真实 JSON）", () => {
    const realJson = loadRealCalloutManagerJson();
    const { themes, aliases } = buildMergedCalloutData(realJson);

    // ── 自定义类型（custom 列表）测试 ──

    describe("custom 列表中的类型", () => {
        const customList = realJson.callouts.custom;

        it("custom 列表非空", () => {
            expect(customList.length).toBeGreaterThan(0);
        });

        it("custom 列表中每个类型都是 alias → 自己（直通）", () => {
            for (const type of customList) {
                expect(aliases[type], `${type} should map to itself`).toBe(type);
            }
        });

        it("code（208, 181, 48）→ hsl 派生正确", () => {
            const t = themes["code"];
            expect(t).toBeDefined();
            const { h, s, l } = parseHsl(t.border);
            // 实际值：H=50, S=63%, L=50%
            expect(h).toBeCloseTo(50, 0);
            expect(s).toBeCloseTo(63, 0);
            expect(l).toBeCloseTo(50, 0);
            // bg: L+25 = 75%
            expect(parseHsl(t.bg).l).toBe(75);
            // titleBg: L+12 = 62%
            expect(parseHsl(t.titleBg).l).toBe(62);
        });

        it("download（83, 223, 221）→ hsl 派生正确", () => {
            const t = themes["download"];
            expect(t).toBeDefined();
            const { h } = parseHsl(t.border);
            expect(h).toBeCloseTo(179, 0); // H≈179
        });

        it("btw（255, 193, 7）→ hsl 派生正确", () => {
            const t = themes["btw"];
            expect(t).toBeDefined();
            const { h } = parseHsl(t.border);
            expect(h).toBeCloseTo(45, 0); // H≈45
        });

        it("history（255, 255, 255）白色 L=100 不溢出", () => {
            const t = themes["history"];
            expect(t).toBeDefined();
            const { l } = parseHsl(t.border);
            expect(l).toBe(100);
            // bg clamp 到 95
            expect(parseHsl(t.bg).l).toBe(95);
            // titleBg clamp 到 90
            expect(parseHsl(t.titleBg).l).toBe(90);
        });

        it("inspire（255, 255, 0）黄色", () => {
            const t = themes["inspire"];
            expect(t).toBeDefined();
            const { h, s } = parseHsl(t.border);
            expect(h).toBeCloseTo(60, 0); // H≈60
            expect(s).toBeCloseTo(100, 0); // S≈100%
        });
    });

    // ── 内置类型（不应被覆盖）测试 ──

    describe("内置 callout 类型未被覆盖", () => {
        const BUILTIN_THEMES = [
            "note", "info", "tip", "question",
            "warning", "danger", "example", "quote",
        ] as const;

        for (const type of BUILTIN_THEMES) {
            it(`${type} 的 border 应为原始 HEX 值（非 hsl）`, () => {
                const t = themes[type];
                expect(t).toBeDefined();
                // 内置类型未被 JSON 覆盖时，border 保持为 #xxx 格式
                expect(t.border).toMatch(/^#[0-9a-f]{3,6}$/i);
            });
        }

        it("内置类型的 bg/titleColor/titleBg 仍为 rgba 格式", () => {
            for (const type of BUILTIN_THEMES) {
                const t = themes[type];
                expect(t.bg).toMatch(/^rgba\(/);
                expect(t.titleColor).toMatch(/^#[0-9a-f]{3,6}$/i);
                expect(t.titleBg).toMatch(/^rgba\(/);
            }
        });
    });

    // ── 边界情况 ──

    describe("边界容错", () => {
        it("空 settings 时不报错，返回原始 themes", () => {
            const { themes: t2 } = buildMergedCalloutData({ callouts: { custom: [], settings: {} } });
            expect(t2["note"]).toBeDefined();
            expect(t2["note"].border).toBe("#888");
        });

        it("custom 列表有重复不报错", () => {
            const json = {
                callouts: {
                    custom: ["code", "code"],
                    settings: { code: [{ changes: { color: "208, 181, 48" } }] },
                },
            };
            const { aliases: a2 } = buildMergedCalloutData(json);
            expect(a2["code"]).toBe("code");
        });

        it("有 icon 无 color 的配置：创建 theme（复制 builtin + icon）", () => {
            const json = {
                callouts: {
                    custom: ["test-type"],
                    settings: {
                        "test-type": [{ changes: { icon: "lucide-star" } }],
                    },
                },
            };
            const { themes: t3 } = buildMergedCalloutData(json);
            // 有 icon 则创建 theme（复制 note 样式 + 添加 icon）
            expect(t3["test-type"]).toBeDefined();
            expect(t3["test-type"].icon).toBe("lucide-star");
        });

        it("settings 中不在 custom 也不在内置的类型：有 color 则注册为 theme", () => {
            const json = {
                callouts: {
                    custom: [],
                    settings: {
                        "unknown-type": [{ changes: { color: "255, 0, 0" } }],
                    },
                },
            };
            const { themes: t4 } = buildMergedCalloutData(json);
            // 有 color 配置的类型，无论是否在 custom 列表中，都应注册为 theme
            expect(t4["unknown-type"]).toBeDefined();
            expect(t4["unknown-type"].border).toMatch(/^hsl\(/);
        });
    });
});
