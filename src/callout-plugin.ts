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

	return {
		h: Math.round(h * 360),
		s: Math.round(s * 100),
		l: Math.round(l * 100),
	};
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
export function themeFromCalloutColor(
	rgb: string,
	typeName: string,
	icon?: string,
): CalloutTheme {
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
		border: "#086ddd",
		bg: `rgba(8,109,221,${CALLOUT_BG_ALPHA})`,
		titleColor: "#086ddd",
		titleBg: `rgba(8,109,221,${CALLOUT_TITLE_BG_ALPHA})`,
		title: "Note",
		icon: "pencil",
	},

	abstract: {
		border: "#00bfbc",
		bg: `rgba(0,191,188,${CALLOUT_BG_ALPHA})`,
		titleColor: "#00bfbc",
		titleBg: `rgba(0,191,188,${CALLOUT_TITLE_BG_ALPHA})`,
		title: "Abstract",
		icon: "clipboard-list",
	},
	summary: {
		border: "#00bfbc",
		bg: `rgba(0,191,188,${CALLOUT_BG_ALPHA})`,
		titleColor: "#00bfbc",
		titleBg: `rgba(0,191,188,${CALLOUT_TITLE_BG_ALPHA})`,
		title: "Summary",
		icon: "clipboard-list",
	},
	tldr: {
		border: "#00bfbc",
		bg: `rgba(0,191,188,${CALLOUT_BG_ALPHA})`,
		titleColor: "#00bfbc",
		titleBg: `rgba(0,191,188,${CALLOUT_TITLE_BG_ALPHA})`,
		title: "Tldr",
		icon: "clipboard-list",
	},

	info: {
		border: "#086ddd",
		bg: `rgba(8,109,221,${CALLOUT_BG_ALPHA})`,
		titleColor: "#086ddd",
		titleBg: `rgba(8,109,221,${CALLOUT_TITLE_BG_ALPHA})`,
		title: "Info",
		icon: "info",
	},

	todo: {
		border: "#086ddd",
		bg: `rgba(8,109,221,${CALLOUT_BG_ALPHA})`,
		titleColor: "#086ddd",
		titleBg: `rgba(8,109,221,${CALLOUT_TITLE_BG_ALPHA})`,
		title: "Todo",
		icon: "check-circle-2",
	},

	tip: {
		border: "#00bfbc",
		bg: `rgba(0,191,188,${CALLOUT_BG_ALPHA})`,
		titleColor: "#00bfbc",
		titleBg: `rgba(0,191,188,${CALLOUT_TITLE_BG_ALPHA})`,
		title: "Tip",
		icon: "flame",
	},
	hint: {
		border: "#00bfbc",
		bg: `rgba(0,191,188,${CALLOUT_BG_ALPHA})`,
		titleColor: "#00bfbc",
		titleBg: `rgba(0,191,188,${CALLOUT_TITLE_BG_ALPHA})`,
		title: "Hint",
		icon: "flame",
	},
	important: {
		border: "#00bfbc",
		bg: `rgba(0,191,188,${CALLOUT_BG_ALPHA})`,
		titleColor: "#00bfbc",
		titleBg: `rgba(0,191,188,${CALLOUT_TITLE_BG_ALPHA})`,
		title: "Important",
		icon: "flame",
	},

	success: {
		border: "#08b94e",
		bg: `rgba(8,185,78,${CALLOUT_BG_ALPHA})`,
		titleColor: "#08b94e",
		titleBg: `rgba(8,185,78,${CALLOUT_TITLE_BG_ALPHA})`,
		title: "Success",
		icon: "check",
	},
	check: {
		border: "#08b94e",
		bg: `rgba(8,185,78,${CALLOUT_BG_ALPHA})`,
		titleColor: "#08b94e",
		titleBg: `rgba(8,185,78,${CALLOUT_TITLE_BG_ALPHA})`,
		title: "Check",
		icon: "check",
	},
	done: {
		border: "#08b94e",
		bg: `rgba(8,185,78,${CALLOUT_BG_ALPHA})`,
		titleColor: "#08b94e",
		titleBg: `rgba(8,185,78,${CALLOUT_TITLE_BG_ALPHA})`,
		title: "Done",
		icon: "check",
	},

	question: {
		border: "#ec7500",
		bg: `rgba(236,117,0,${CALLOUT_BG_ALPHA})`,
		titleColor: "#ec7500",
		titleBg: `rgba(236,117,0,${CALLOUT_TITLE_BG_ALPHA})`,
		title: "Question",
		icon: "help-circle",
	},
	help: {
		border: "#ec7500",
		bg: `rgba(236,117,0,${CALLOUT_BG_ALPHA})`,
		titleColor: "#ec7500",
		titleBg: `rgba(236,117,0,${CALLOUT_TITLE_BG_ALPHA})`,
		title: "Help",
		icon: "help-circle",
	},
	faq: {
		border: "#ec7500",
		bg: `rgba(236,117,0,${CALLOUT_BG_ALPHA})`,
		titleColor: "#ec7500",
		titleBg: `rgba(236,117,0,${CALLOUT_TITLE_BG_ALPHA})`,
		title: "Faq",
		icon: "help-circle",
	},

	warning: {
		border: "#ec7500",
		bg: `rgba(236,117,0,${CALLOUT_BG_ALPHA})`,
		titleColor: "#ec7500",
		titleBg: `rgba(236,117,0,${CALLOUT_TITLE_BG_ALPHA})`,
		title: "Warning",
		icon: "alert-triangle",
	},
	caution: {
		border: "#ec7500",
		bg: `rgba(236,117,0,${CALLOUT_BG_ALPHA})`,
		titleColor: "#ec7500",
		titleBg: `rgba(236,117,0,${CALLOUT_TITLE_BG_ALPHA})`,
		title: "Caution",
		icon: "alert-triangle",
	},
	attention: {
		border: "#ec7500",
		bg: `rgba(236,117,0,${CALLOUT_BG_ALPHA})`,
		titleColor: "#ec7500",
		titleBg: `rgba(236,117,0,${CALLOUT_TITLE_BG_ALPHA})`,
		title: "Attention",
		icon: "alert-triangle",
	},

	failure: {
		border: "#e93147",
		bg: `rgba(233,49,71,${CALLOUT_BG_ALPHA})`,
		titleColor: "#e93147",
		titleBg: `rgba(233,49,71,${CALLOUT_TITLE_BG_ALPHA})`,
		title: "Failure",
		icon: "x",
	},
	fail: {
		border: "#e93147",
		bg: `rgba(233,49,71,${CALLOUT_BG_ALPHA})`,
		titleColor: "#e93147",
		titleBg: `rgba(233,49,71,${CALLOUT_TITLE_BG_ALPHA})`,
		title: "Fail",
		icon: "x",
	},
	missing: {
		border: "#e93147",
		bg: `rgba(233,49,71,${CALLOUT_BG_ALPHA})`,
		titleColor: "#e93147",
		titleBg: `rgba(233,49,71,${CALLOUT_TITLE_BG_ALPHA})`,
		title: "Missing",
		icon: "x",
	},

	danger: {
		border: "#e93147",
		bg: `rgba(233,49,71,${CALLOUT_BG_ALPHA})`,
		titleColor: "#e93147",
		titleBg: `rgba(233,49,71,${CALLOUT_TITLE_BG_ALPHA})`,
		title: "Danger",
		icon: "zap",
	},
	error: {
		border: "#e93147",
		bg: `rgba(233,49,71,${CALLOUT_BG_ALPHA})`,
		titleColor: "#e93147",
		titleBg: `rgba(233,49,71,${CALLOUT_TITLE_BG_ALPHA})`,
		title: "Error",
		icon: "zap",
	},

	bug: {
		border: "#e93147",
		bg: `rgba(233,49,71,${CALLOUT_BG_ALPHA})`,
		titleColor: "#e93147",
		titleBg: `rgba(233,49,71,${CALLOUT_TITLE_BG_ALPHA})`,
		title: "Bug",
		icon: "bug",
	},

	example: {
		border: "#7852ee",
		bg: `rgba(120,82,238,${CALLOUT_BG_ALPHA})`,
		titleColor: "#7852ee",
		titleBg: `rgba(120,82,238,${CALLOUT_TITLE_BG_ALPHA})`,
		title: "Example",
		icon: "list",
	},

	quote: {
		border: "#9e9e9e",
		bg: `rgba(158,158,158,${CALLOUT_BG_ALPHA})`,
		titleColor: "#9e9e9e",
		titleBg: `rgba(158,158,158,${CALLOUT_TITLE_BG_ALPHA})`,
		title: "Quote",
		icon: "quote",
	},
	cite: {
		border: "#9e9e9e",
		bg: `rgba(158,158,158,${CALLOUT_BG_ALPHA})`,
		titleColor: "#9e9e9e",
		titleBg: `rgba(158,158,158,${CALLOUT_TITLE_BG_ALPHA})`,
		title: "Cite",
		icon: "quote",
	},
};

/** 只对不同名称的做alias，默认包括恒等 */
const CALLOUT_ALIASES: Record<string, string> = {
	summary: "abstract",
	tldr: "abstract",

	hint: "tip",

	check: "success",
	done: "success",

	help: "question",
	faq: "question",

	caution: "warning",
	attention: "warning",

	fail: "failure",
	missing: "failure",

	error: "danger",

	cite: "quote",
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
		if (
			!customList.includes(key) &&
			!(key in CALLOUT_THEMES) &&
			!(key in CALLOUT_ALIASES) &&
			!colorStr
		)
			continue;

		// 如果该类型在 settings 中有 icon 或 color → 创建独立 theme 入口 + self-alias
		if (colorStr) {
			themes[key as keyof typeof themes] = themeFromCalloutColor(
				colorStr,
				key,
				iconStr,
			);
		} else if (iconStr) {
			// 仅 icon：复制 base theme 并替换 icon
			const aliasOf = aliases[key];
			const base =
				themes[key] ??
				(aliasOf
					? themes[aliasOf as keyof typeof themes]
					: undefined) ??
				themes["note"]!;
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
		/^> \[!([a-zA-Z0-9_-]+)\]([+-])?[ \t]*([^\n]*)(?:\n((?:> [^\n]*\n?)*))?/gm;

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
				getActiveAliases()[rawType.toLowerCase()] ??
				rawType.toLowerCase();
			const theme =
				getActiveThemes()[cType] ?? getActiveThemes()["note"]!;
			const cTitle = title.trim() || theme.title || "Note";

			// 提取 body 内容，去掉 > 前缀，保留原始 markdown
			const body = bodyBlock
				? bodyBlock
						.split("\n")
						.filter((line) => line.trim())
						.map((line) => line.replace(/^>\s?/, ""))
						.join("\n")
						.trim()
				: "";

			// 用 HTML 注释作为标记，标题作为第一行 markdown 内容
			// 空行确保标记和内容是独立的 HTML 块
			return `<!--CALLOUT_START:${cType}-->\n\n${cTitle}\n\n${body}\n\n<!--CALLOUT_END-->`;
		},
	);
}

/**
 * 后处理 callout：将 HTML 注释标记转换为最终的 table 结构
 * 在 markdown-it 渲染后调用
 *
 * 输入格式（HTML）：
 * <!--CALLOUT_START:note-->
 * <p>标题内容（可能包含 <strong>、<em> 等）</p>
 * <p>正文内容</p>
 * <!--CALLOUT_END-->
 *
 * 输出格式（HTML）：
 * <table class="wechat-callout-table ...">
 *   <p><span class="wechat-callout-title">标题内容</span></p>
 *   <div class="wechat-callout-body">正文内容</div>
 * </table>
 */
export function postprocessCallouts(html: string): string {
	const re =
		/<!--CALLOUT_START:([^>]+)-->\s*([\s\S]*?)\s*<!--CALLOUT_END-->/g;

	return html.replace(
		re,
		(_full: string, cType: string, bodyContent: string) => {
			const theme =
				getActiveThemes()[cType] ?? getActiveThemes()["note"]!;
			const iconHtml = theme.icon
				? `<span class="wechat-callout-icon" style="display:inline-flex;align-items:center;margin-right:8px;color:var(--callout-title-color)">${getIconSvg(theme.icon)}</span>`
				: "";

			// 分离标题和正文：标题是第一个 <p> 标签的内容
			let titleHtml = theme.title || "Note";
			let contentHtml = bodyContent;

			const titleMatch = bodyContent.match(/^<p>([\s\S]*?)<\/p>/);
			if (titleMatch) {
				titleHtml = titleMatch[1] || "Note";
				// 移除第一个 <p> 标签，剩余作为正文
				contentHtml = bodyContent.slice(titleMatch[0].length).trim();
			}

			return `<table class="wechat-callout-table wechat-callout-${cType}" style="--callout-border:${theme.border};--callout-bg:${theme.bg};--callout-title-color:${theme.titleColor};--callout-title-bg:${theme.titleBg};width:100%;margin:20px 0;border-collapse:collapse;border-spacing:0"><tbody><tr><td style="border:none;border-left:3px solid var(--callout-border);background:var(--callout-bg);padding:12px 16px;border-radius:4px">
<p style="margin:0 0 4px 0;font-size:14px;font-weight:600;line-height:1.6"><span class="wechat-callout-title" style="color:var(--callout-title-color);padding:0!important;background:transparent!important">${iconHtml}${titleHtml}</span></p>
<div class="wechat-callout-body" style="margin:0;padding:0">${contentHtml}</div>
</td></tr></tbody></table>\n`;
		},
	);
}
