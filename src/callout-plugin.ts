/**
 * Callout preprocessor: converts Obsidian callout MD syntax to inline-styled
 * <table> blocks BEFORE markdown-it. WeChat preserves <table> but strips <div>.
 */

// ==========================================
// 类型定义
// ==========================================

type CalloutTheme = {
    border: string;
    bg: string;
    titleColor: string;
    titleBg: string;
    title: string; // 默认标题（首字母大写的类型名）
    icon?: string; // lucide icon 名称，如 "star"
};

export type CalloutManagerJson = {
    callouts: {
        custom: string[];
        settings: Record<
            string,
            Array<{ changes: { icon?: string; color?: string } }>
        >;
    };
};

// ==========================================
// 颜色转换工具
// ==========================================

/** "R, G, B" → { h: 0-360, s: 0-100, l: 0-100 } */
function rgbStringToHsl(rgb: string): { h: number; s: number; l: number } {
    const parts = rgb.split(",").map((s) => parseInt(s.trim(), 10));
    const [rs = 0, gs = 0, bs = 0] = parts;
    const r = rs / 255;
    const g = gs / 255;
    const b = bs / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r:
                h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
                break;
            case g:
                h = ((b - r) / d + 2) / 6;
                break;
            case b:
                h = ((r - g) / d + 4) / 6;
                break;
        }
    }

    return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

const CALLOUT_BG_ALPHA = 0.16;
const CALLOUT_TITLE_BG_ALPHA = 0.24;

// ==========================================
// Lucide icon（tree-shakeable，esbuild 按需打包）
// 数据来源：lucide-static（MIT license，https://lucide.dev）
// ==========================================

import * as lucideStatic from "lucide-static";

/** 将 lucide 图标名（kebab-case）规范化为 PascalCase
 * "lucide-list-todo" → "ListTodo"
 * "link"            → "Link"
 * "ListTodo"        → "ListTodo"
 */
function normalizeIconName(name: string): string {
    const n = name.startsWith("lucide-") ? name.slice(7) : name;
    return n
        .split("-")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join("");
}

/** 缓存已解析的 SVG，避免重复查找 */
const _svgCache: Record<string, string> = {};

/** 根据 icon 名称获取内联 SVG HTML
 * 运行时动态从 lucide-static 包中查找，支持所有 lucide 图标。
 * 未找到时向控制台报告警告。
 * @param icon 如 "lucide-list-todo"、"link"
 */
export function getIconSvg(icon: string): string {
    if (!icon) return "";

    if (_svgCache[icon]) return _svgCache[icon];

    const pascalName = normalizeIconName(icon);
    const svgStr = (lucideStatic as Record<string, string>)[pascalName];

    if (!svgStr) {
        console.warn(
            `[obsidian-wechat-publish] 图标 "${icon}" 未在 lucide-static 中找到或尚未导入。` +
            ` 当前版本仅支持部分图标，请检查 https://lucide.dev/icons 是否存在该图标。`,
        );
        _svgCache[icon] = "";
        return "";
    }

    const result = svgStr
        .replace(/stroke="[^"]*"/, `stroke="currentColor"`)
        .replace(/\bwidth="24"/, `width="1em"`)
        .replace(/\bheight="24"/, `height="1em"`);

    _svgCache[icon] = result;
    return result;
}

/** 单一 RGB 颜色字符串 → 完整 CalloutTheme（HSL 派生） */
export function themeFromCalloutColor(rgb: string, typeName: string, icon?: string): CalloutTheme {
    const { h, s, l } = rgbStringToHsl(rgb);
    const title = typeName.charAt(0).toUpperCase() + typeName.slice(1);
    return {
        border: `hsl(${h}, ${s}%, ${l}%)`,
        titleColor: `hsl(${h}, ${s}%, ${l}%)`,
        bg: `hsla(${h}, ${s}%, ${Math.min(l + 25, 95)}%, ${CALLOUT_BG_ALPHA})`,
        titleBg: `hsla(${h}, ${s}%, ${Math.min(l + 12, 90)}%, ${CALLOUT_TITLE_BG_ALPHA})`,
        title,
        ...(icon ? { icon } : {}),
    };
}

const CALLOUT_THEMES: Record<string, CalloutTheme> = {
    note: {
        border: "#888",
        bg: `rgba(127,127,127,${CALLOUT_BG_ALPHA})`,
        titleColor: "#555",
        titleBg: `rgba(127,127,127,${CALLOUT_TITLE_BG_ALPHA})`,
        title: "Note",
        icon: "info",
    },
    info: {
        border: "#7ba7bc",
        bg: `rgba(123,167,188,${CALLOUT_BG_ALPHA})`,
        titleColor: "#4a7585",
        titleBg: `rgba(123,167,188,${CALLOUT_TITLE_BG_ALPHA})`,
        title: "Info",
        icon: "info",
    },
    tip: {
        border: "#7ba37b",
        bg: `rgba(123,163,123,${CALLOUT_BG_ALPHA})`,
        titleColor: "#4a704a",
        titleBg: `rgba(123,163,123,${CALLOUT_TITLE_BG_ALPHA})`,
        title: "Tip",
        icon: "lightbulb",
    },
    question: {
        border: "#b7a07b",
        bg: `rgba(183,160,123,${CALLOUT_BG_ALPHA})`,
        titleColor: "#7a684a",
        titleBg: `rgba(183,160,123,${CALLOUT_TITLE_BG_ALPHA})`,
        title: "Question",
        icon: "help-circle",
    },
    warning: {
        border: "#bc9a7b",
        bg: `rgba(188,154,123,${CALLOUT_BG_ALPHA})`,
        titleColor: "#856a4a",
        titleBg: `rgba(188,154,123,${CALLOUT_TITLE_BG_ALPHA})`,
        title: "Warning",
        icon: "alert-triangle",
    },
    danger: {
        border: "#bc7b7b",
        bg: `rgba(188,123,123,${CALLOUT_BG_ALPHA})`,
        titleColor: "#854a4a",
        titleBg: `rgba(188,123,123,${CALLOUT_TITLE_BG_ALPHA})`,
        title: "Danger",
        icon: "flame",
    },
    example: {
        border: "#7baa99",
        bg: `rgba(123,170,153,${CALLOUT_BG_ALPHA})`,
        titleColor: "#4a7566",
        titleBg: `rgba(123,170,153,${CALLOUT_TITLE_BG_ALPHA})`,
        title: "Example",
        icon: "flag",
    },
    quote: {
        border: "#999",
        bg: `rgba(127,127,127,${CALLOUT_BG_ALPHA})`,
        titleColor: "#666",
        titleBg: `rgba(127,127,127,${CALLOUT_TITLE_BG_ALPHA})`,
        title: "Quote",
        icon: "quote",
    },
};

const CALLOUT_ALIASES: Record<string, string> = {
    note: "note",
    abstract: "note",
    summary: "note",
    tldr: "note",
    info: "info",
    todo: "info",
    tip: "tip",
    hint: "tip",
    important: "tip",
    success: "tip",
    check: "tip",
    done: "tip",
    question: "question",
    help: "question",
    faq: "question",
    warning: "warning",
    caution: "warning",
    attention: "warning",
    danger: "danger",
    error: "danger",
    bug: "danger",
    failure: "danger",
    fail: "danger",
    missing: "danger",
    example: "example",
    quote: "quote",
};

// ==========================================
// 动态注入机制（联动 callout-manager）
// ==========================================

/** 从 callout-manager JSON 合并 themes + aliases
 * - custom 列表中的类型 + 有颜色的 → 新增到 themes
 * - settings 中有 icon 或 color 的类型 → 覆盖颜色/图标，并 self-alias
 * - settings 中仅内联样式的类型 → 覆盖 builtin 类型样式（保留原别名）
 */
export function buildMergedCalloutData(json: CalloutManagerJson): {
    themes: typeof CALLOUT_THEMES;
    aliases: typeof CALLOUT_ALIASES;
} {
    const themes = { ...CALLOUT_THEMES };
    const aliases = { ...CALLOUT_ALIASES };

    const settings = json.callouts?.settings ?? {};
    const customList = json.callouts?.custom ?? [];

    for (const [key, changesList] of Object.entries(settings)) {
        const colorStr = changesList?.[0]?.changes?.color;
        const iconStr = changesList?.[0]?.changes?.icon;
        if (!colorStr && !iconStr) continue;

        // 跳过：不在 custom、不在内置theme、不在 builtin alias、且无 color（仅有 icon 后面单独处理）
        if (!customList.includes(key) && !(key in CALLOUT_THEMES) && !(key in CALLOUT_ALIASES) && !colorStr) continue;

        // 如果该类型在 settings 中有 icon 或 color → 创建独立 theme 入口 + self-alias
        if (colorStr) {
            themes[key as keyof typeof themes] = themeFromCalloutColor(colorStr, key, iconStr);
        } else if (iconStr) {
            // 仅 icon：复制 base theme 并替换 icon
            const aliasOf = aliases[key];
            const base = themes[key] ?? (aliasOf ? themes[aliasOf as keyof typeof themes] : undefined) ?? themes["note"]!;
            themes[key as keyof typeof themes] = { ...base, icon: iconStr };
        }

        // 有 icon 或 color 的类型 → self-alias（不再继承 builtin 别名）
        aliases[key] = key;
    }

    // custom 列表中的类型 → alias → 自己（直通）
    for (const type of customList) {
        if (!(type in CALLOUT_THEMES)) {
            aliases[type] = type;
        }
    }

    return { themes, aliases };
}

// 模块级变量，存储当前生效的 themes 和 aliases
let _activeThemes: typeof CALLOUT_THEMES = CALLOUT_THEMES;
let _activeAliases: typeof CALLOUT_ALIASES = CALLOUT_ALIASES;

/** 注入合并后的 themes + aliases（在 main.ts onload 时调用一次） */
export function setupCalloutData(
    themes: typeof CALLOUT_THEMES,
    aliases: typeof CALLOUT_ALIASES,
): void {
    _activeThemes = themes;
    _activeAliases = aliases;
}

/** 获取当前生效的 themes */
export function getActiveThemes(): typeof CALLOUT_THEMES {
    return _activeThemes;
}

/** 获取当前生效的 aliases */
export function getActiveAliases(): typeof CALLOUT_ALIASES {
    return _activeAliases;
}

export default function preprocessCallouts(md: string): string {
    const re =
        /^> \[!([a-zA-Z0-9_-]+)\]([+-])?[ \t]*([^\n]*)\n((?:> [^\n]*\n?)*)/gm;

    return md.replace(
        re,
        (
            _full: string,
            rawType: string,
            _fold: string | undefined,
            title: string,
            bodyBlock: string,
        ) => {
            const cType =
                getActiveAliases()[rawType.toLowerCase()] ?? "note";
            const theme =
                getActiveThemes()[cType] ?? getActiveThemes()["note"]!;
            const cTitle = title.trim() || theme.title || "Note";
            const body = bodyBlock
                .split("\n")
                .filter((line) => line.trim())
                .map((line) => line.replace(/^>\s?/, ""))
                .join("\n")
                .trim();

            // WeChat-safe <table> structure with inline styles
            // 📌【2026-05-14 22:35:39】目前还有一个bug：callout内的列表、表格等尚未能被完整渲染，目前只能无损呈现纯文字
            // CSS custom properties on table: dark mode can override them via --var-name: dark-value !important
            const iconHtml = theme.icon
                ? `<span class="wechat-callout-icon" style="display:inline-flex;align-items:center;margin-right:8px;color:var(--callout-title-color)">${getIconSvg(theme.icon)}</span>`
                : "";
            return `<table class="wechat-callout-table wechat-callout-${cType}" style="--callout-border:${theme.border};--callout-bg:${theme.bg};--callout-title-color:${theme.titleColor};--callout-title-bg:${theme.titleBg};width:100%;margin:20px 0;border-collapse:collapse;border-spacing:0"><tbody><tr><td style="border:none;border-left:3px solid var(--callout-border);background:var(--callout-bg);padding:12px 16px;border-radius:4px">
<p style="margin:0 0 4px 0;font-size:14px;font-weight:600;line-height:1.6"><span class="wechat-callout-title" style="color:var(--callout-title-color);padding:0!important;background:transparent!important">${iconHtml}${cTitle}</span></p>
${body
    .split("\n")
    .map(
        (line) =>
            `<p style="margin:0 0 6px 0;font-size:15px;line-height:1.75">${line}</p>`,
    )
    .join("\n")}
</td></tr></tbody></table>\n`;
        },
    );
}
