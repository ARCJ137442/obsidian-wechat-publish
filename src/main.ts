/* eslint-disable obsidianmd/ui/sentence-case */
import {
	App,
	Editor,
	MarkdownView,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
	TFile,
} from "obsidian";
import juice from "juice";

import {
	renderMarkdownCore,
	type LatexRenderResult,
	type MarkdownCoreDiagnostics,
	preventBreakAfterStrong as preventBreakAfterStrongCore,
} from "./markdown-core";
import { convertWikiLinks as convertWikiLinksCore } from "./wiki-links";
import {
	replaceImagesWithPlaceholders as replaceImagesWithPlaceholdersCore,
	replaceLocalImageSources,
} from "./image-output";
import {
	getFrontmatterString,
	parseFrontmatter as parseFrontmatterCore,
	type FrontmatterMeta,
} from "./frontmatter";
import {
	buildMergedCalloutData,
	setupCalloutData,
	getActiveThemes,
	CalloutManagerJson,
} from "./callout-plugin";
import {
	normalizeWechatHighlightTags,
	renderLatexFallback,
	renderLatexHtml,
} from "./latex-rendering";
import { buildCopyCSS } from "./copy-css";
import {
	buildCopyNotice,
	countHtmlParagraphs,
	countImagePlaceholders,
} from "./copy-notice";
import {
	clearPreviewTimeout,
	renewPreviewTimeout,
} from "./preview-timeout";

// ==========================================
// 默认样式：仿微信公众号爆款文章风格
// ==========================================
const DEFAULT_CSS = `
  /* ===== 简约日记风 · 微信公众号排版 ===== */

  /* 全局容器 */
  .wechat-content {
    font-family: "PingFang SC", system-ui, -apple-system, BlinkMacSystemFont, "Helvetica Neue", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
    font-size: 17px;
    color: rgba(0, 0, 0, 0.9);
    line-height: 1.75;
    letter-spacing: 0.544px;
    text-align: justify;
    padding: 0;
    max-width: 100%;
  }

  /* H1 标题 - 仅靠字号和粗细区分，不做颜色装饰 */
  h1 {
    font-size: 22px;
    font-weight: 600;
    color: #1a1a1a;
    text-align: left;
    margin: 0 0 24px 0;
    line-height: 1.4;
  }

  /* H2 标题 */
  h2 {
    font-size: 19px;
    font-weight: 600;
    color: #1a1a1a;
    margin: 32px 0 16px 0;
    line-height: 1.4;
  }

  /* H3 标题 */
  h3 {
    font-size: 17px;
    font-weight: 600;
    color: #333;
    margin: 24px 0 12px 0;
    line-height: 1.4;
  }

  /* 段落文字 - 两端对齐，舒适间距 */
  p {
    text-align: justify;
    font-size: 17px;
    font-weight: 400;
    color: rgba(0, 0, 0, 0.9);
    margin: 0 0 24px 0;
    line-height: 1.75;
    text-indent: 0;
  }

  /* 引用块 - 极简灰色细线，不抢正文焦点 */
  blockquote {
    margin: 1em 0;
    padding: 4px 0 4px 10px;
    border-left: 3px solid #dbdbdb;
    color: rgba(0, 0, 0, 0.5);
    font-size: 15px;
    font-weight: 400;
    line-height: 1.7;
    background: transparent;
  }

  blockquote p {
    margin: 0;
    color: rgba(0, 0, 0, 0.5);
    font-weight: 400;
  }

  /* Obsidian Callout — showcase style */
  .wechat-callout {
    margin: 20px 0;
    border-left: 3px solid #999;
    border-radius: 4px;
    overflow: hidden;
    background: #f5f3f7;
  }
  .wechat-callout-title {
    padding: 0 !important;
    font-size: 14px;
    font-weight: 600;
    line-height: 1.6;
    color: #555;
    /* background 由内联 CSS 变量设置，勿在此处覆盖 */
  }
  .wechat-callout-body {
    padding: 12px 14px;
  }
  .wechat-callout-body p {
    margin: 0;
    color: rgba(0, 0, 0, 0.7);
    font-size: 15px;
  }
  .wechat-callout-note td { border-left-color: #888; background: #f5f3f7; }
  .wechat-callout-note    .wechat-callout-title { color: #555; }
  .wechat-callout-info td { border-left-color: #7ba7bc; background: #f0f6f9; }
  .wechat-callout-info    .wechat-callout-title { color: #4a7585; }
  .wechat-callout-tip td     { border-left-color: #7ba37b; background: #f0f6f2; }
  .wechat-callout-tip     .wechat-callout-title { color: #4a704a; }
  .wechat-callout-question td{ border-left-color: #b7a07b; background: #f7f4ec; }
  .wechat-callout-question .wechat-callout-title { color: #7a684a; }
  .wechat-callout-warning td { border-left-color: #bc9a7b; background: #f7f2ec; }
  .wechat-callout-warning .wechat-callout-title { color: #856a4a; }
  .wechat-callout-danger td  { border-left-color: #bc7b7b; background: #f7efef; }
  .wechat-callout-danger  .wechat-callout-title { color: #854a4a; }
  .wechat-callout-example td { border-left-color: #7baa99; background: #eff7f5; }
  .wechat-callout-example .wechat-callout-title { color: #4a7566; }
  .wechat-callout-quote td   { border-left-color: #999; background: #f5f5f5; }
  .wechat-callout-quote   .wechat-callout-title { color: #666; }

  /* 加粗文字 - 仅加粗，不改变颜色 */
  strong {
    font-weight: 600;
  }

  /* 斜体 */
  em {
    font-style: italic;
  }

  /* 链接 */
  a {
    color: #576b95;
    text-decoration: none;
    border-bottom: 1px solid rgba(87, 107, 149, 0.3);
  }

  /* 笔记链接占位符（无 link-wechat-mp 时） */
  .wechat-note-link {
    color: #576b95;
    text-decoration: none;
    border-bottom: 1px solid rgba(87, 107, 149, 0.3);
  }

  /* 列表 */
  ul, ol {
    margin: 16px 0;
    padding-left: 24px;
  }
  li {
    margin-bottom: 8px;
    line-height: 1.75;
  }
  /* Nested lists: indent properly */
  li ul, li ol {
    margin: 8px 0;
    padding-left: 24px;
  }
  ul ul, ol ol, ul ol, ol ul {
    margin: 8px 0;
  }

  /* 定义列表 */
  dl {
    margin: 16px 0;
  }
  dt {
    font-size: 17px;
    color: rgba(0, 0, 0, 0.9);
    font-weight: normal;
    margin-bottom: 8px;
  }
  dd {
    font-size: 17px;
    color: rgba(0, 0, 0, 0.9);
    line-height: 1.75;
    margin-left: 8px;
    margin-bottom: 8px;
    display: inline;
  }
  dd::before { content: ''; margin-right: 0; }
  dd::after { content: ''; display: block; }

  /* 图片 - 居中无装饰 */
  img {
    display: block;
    margin: 24px auto;
    max-width: 100%;
    height: auto;
  }

  /* 代码块 */
  pre {
    background: #f8f9fa;
    padding: 16px;
    border-radius: 4px;
    overflow-x: auto;
    font-size: 14px;
    font-family: "SF Mono", Monaco, Consolas, monospace;
    line-height: 1.6;
    margin: 20px 0;
  }
  code {
    background: #ede8f2;
    padding: 2px 6px;
    border-radius: 3px;
    font-size: 14px;
    font-family: "SF Mono", Monaco, Consolas, monospace;
    color: #333;
  }
  pre code {
    background: transparent;
    padding: 0;
  }

  /* 高亮 — 极淡底层色条 */
  mark, .highlight {
    background: linear-gradient(180deg, transparent 55%, rgba(0,0,0,0.18) 55%);
    padding: 0 2px;
  }

  /* 表格 */
  .wechat-content table {
    width: 100%;
    border-collapse: collapse;
    margin: 16px 0 24px;
    font-size: 15px;
  }
  .wechat-content th, .wechat-content td {
    padding: 8px 12px;
    border: 1px solid #e8e8e8;
    text-align: left;
  }
  .wechat-content th {
    background: #f5f3f7;
    font-weight: 600;
    color: #555;
  }
  .wechat-content td {
    color: rgba(0, 0, 0, 0.8);
  }

  /* 水平线 */
  hr {
    border: none;
    border-top: 1px solid #eee;
    margin: 32px 0;
  }
`;

const CALLOUT_FALLBACK_CSS = `
	.wechat-callout {
	    margin: 20px 0;
	    border-left: 4px solid #773098;
	    border-radius: 8px;
	    overflow: hidden;
	    background: #faf7fd;
	}
	.wechat-callout-title {
	    padding: 0 !important;
	    font-size: 14px;
	    font-weight: 600;
	    line-height: 1.6;
	    /* color/background 由内联 CSS 变量设置，勿在此处覆盖 */
	}
	.wechat-callout-body {
	    padding: 12px 14px;
	}
	.wechat-callout-body p {
	    margin: 0 0 12px 0;
	    color: #333;
	    font-weight: 400;
	}
	.wechat-callout-body p:last-child {
	    margin-bottom: 0;
	}
	.wechat-callout-note {
	    border-left-color: #773098;
	    background: #faf7fd;
	}
	.wechat-callout-note .wechat-callout-title {
	    color: #5a3382;
	}
	.wechat-callout-info {
	    border-left-color: #2eaadc;
	    background: #f3fbff;
	}
	.wechat-callout-info .wechat-callout-title {
	    color: #1f7599;
	}
	.wechat-callout-tip {
	    border-left-color: #2f9e44;
	    background: #f3fcf5;
	}
	.wechat-callout-tip .wechat-callout-title {
	    color: #1f6d2f;
	}
	.wechat-callout-question {
	    border-left-color: #b7791f;
	    background: #fffaf2;
	}
	.wechat-callout-question .wechat-callout-title {
	    color: #8a5b17;
	}
	.wechat-callout-warning {
	    border-left-color: #e8913c;
	    background: #fff8f0;
	}
	.wechat-callout-warning .wechat-callout-title {
	    color: #b96f22;
	}
	.wechat-callout-danger {
	    border-left-color: #e03131;
	    background: #fff5f5;
	}
	.wechat-callout-danger .wechat-callout-title {
	    color: #b42323;
	}
	.wechat-callout-example {
	    border-left-color: #0ca678;
	    background: #f2fffb;
	}
	.wechat-callout-example .wechat-callout-title {
	    color: #087f5b;
	}
	.wechat-callout-quote {
	    border-left-color: #868e96;
	    background: #f8f9fa;
	}
	.wechat-callout-quote .wechat-callout-title {
	    color: #495057;
	}
`;

// MathJax SVG renderer — built separately with rollup
let mathjaxSvgModule: { tex2svg: (formula: string, display: boolean) => string } | null = null;

/** 从 hsl(...) 或 hsla(...) 字符串中提取 H, S, L 数值 */
function parseHsl(hslStr: string): { h: number; s: number; l: number } | null {
	const match = hslStr.match(/hsla?\(\s*(\d+)\s*,\s*(\d+)%\s*,\s*(\d+)%/);
	if (!match || !match[1] || !match[2] || !match[3]) return null;
	return {
		h: parseInt(match[1]),
		s: parseInt(match[2]),
		l: parseInt(match[3]),
	};
}

/** 生成深色模式下所有自定义 callout 类型的 CSS 覆盖规则（CSS 自定义属性） */
function generateDarkModeCustomCalloutCSS(): string {
	const BUILTIN_TYPES = new Set([
		"note",
		"info",
		"tip",
		"question",
		"warning",
		"danger",
		"example",
		"quote",
	]);
	const themes = getActiveThemes();
	const lines: string[] = [];

	for (const [type, theme] of Object.entries(themes)) {
		if (BUILTIN_TYPES.has(type)) continue;
		const parsed = parseHsl(theme.border);
		if (!parsed) continue;
		const { h, s } = parsed;
		// 边框明度降 35（最低 15）
		const borderL = Math.max(parsed.l - 35, 15);
		// 标题文字明度：light ≤ 50 则提高，否则降低
		const titleL =
			parsed.l <= 50
				? Math.min(parsed.l + 45, 85)
				: Math.max(parsed.l - 40, 45);

		lines.push(
			`html.dark  .wechat-callout-${type} { --callout-border: hsl(${h},${s}%,${borderL}%) !important; --callout-title-color: hsl(${h},${s}%,${titleL}%) !important; --callout-bg: hsla(${h},${s}%,${borderL}%,0.12) !important; }`,
			`html.dark  .wechat-callout-${type} .wechat-callout-title { background: transparent !important; padding: 0 !important; }`,
			`html:not(.light) .wechat-callout-${type} { --callout-border: hsl(${h},${s}%,${borderL}%) !important; --callout-title-color: hsl(${h},${s}%,${titleL}%) !important; --callout-bg: hsla(${h},${s}%,${borderL}%,0.12) !important; }`,
			`html:not(.light) .wechat-callout-${type} .wechat-callout-title { background: transparent !important; padding: 0 !important; }`,
		);
	}

	return lines.join("\n");
}

// ──────── Plugin ────────

interface WechatPluginSettings {
	customCSS: string;
}

const DEFAULT_SETTINGS: WechatPluginSettings = {
	customCSS: DEFAULT_CSS,
};
const PREVIEW_IDLE_TIMEOUT_MS = 30_000;

type ProcessedMarkdown = {
	html: string;
	diagnostics: MarkdownCoreDiagnostics;
};

export default class WechatCopyPlugin extends Plugin {
	settings: WechatPluginSettings;

	async onload() {
		await this.loadSettings();
		await this.loadCalloutManagerThemes();

		// Command 1: Preview in Browser
		this.addCommand({
			id: "preview-in-browser",
			name: "Preview in Browser",
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				const markdown = editor.getValue();
				const currentPath = view.file ? view.file.path : "";
				await this.processAndPreview(markdown, currentPath);
			},
		});

		// Command 2: Copy to WeChat
		this.addCommand({
			id: "copy-to-wechat",
			name: "Copy to WeChat",
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				const markdown = editor.getValue();
				const currentPath = view.file ? view.file.path : "";
				await this.processAndCopy(markdown, currentPath);
			},
		});

		this.addSettingTab(new WechatSettingTab(this.app, this));
	}

	onunload() {
		if (this._previewServer) {
			clearPreviewTimeout(this._previewServerTimeout);
			this._previewServer.close();
			this._previewServer = null;
			this._previewServerTimeout = null;
		}
	}

	/** 读取 callout-manager 配置并合并到渲染管道（联动 callout-manager） */
	async loadCalloutManagerThemes(): Promise<void> {
		console.log("[wechat-publish] loadCalloutManagerThemes: 开始执行");
		try {
			const vaultBase =
				((this.app.vault.adapter as any).getBasePath?.() as // eslint-disable-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
					| string
					| undefined) ?? this.app.vault.adapter.getResourcePath("/");
			const cmPath = `${vaultBase}/.obsidian/plugins/callout-manager/data.json`;
			console.log(
				"[wechat-publish] loadCalloutManagerThemes: vault 根目录:",
				vaultBase,
			);
			console.log(
				"[wechat-publish] loadCalloutManagerThemes: 拼接后路径:",
				cmPath,
			);

			// 使用 Node.js fs 读取（Obsidian 插件上下文可用 require('fs')）
			const fs = require("fs") as typeof import("fs");
			if (!fs.existsSync(cmPath)) {
				console.log(
					"[wechat-publish] loadCalloutManagerThemes: 文件不存在，跳过（这是正常的如果未安装 callout-manager）",
				);
				return;
			}

			const content = fs.readFileSync(cmPath, "utf-8");
			console.log(
				"[wechat-publish] loadCalloutManagerThemes: 文件读取成功，长度:",
				content.length,
			);
			const json: CalloutManagerJson = JSON.parse(content);
			console.log(
				"[wechat-publish] loadCalloutManagerThemes: JSON 解析成功, custom:",
				json.callouts?.custom,
			);

			const { themes, aliases } = buildMergedCalloutData(json);
			setupCalloutData(themes, aliases);
			console.log(
				"[wechat-publish] loadCalloutManagerThemes: 合并完成，已注入 themes 和 aliases",
			);

			// 统计信息
			const settings = json.callouts?.settings ?? {};
			const customList = json.callouts?.custom ?? [];
			const overridden = Object.keys(settings).filter((k) => k in themes);
			const totalColors = Object.values(themes).filter((t) =>
				t.border.startsWith("hsl"),
			).length;

			console.log(
				`[wechat-publish] loadCalloutManagerThemes: 自定义类型=${customList.length}（${customList.join(", ") || "无"}）` +
					`, 主题总数=${totalColors}, 被覆盖内置类型=${overridden.length}（${overridden.join(", ") || "无"}）`,
			);

			new Notice(
				`✅ Callout 主题已加载\n` +
					`• 自定义类型：${customList.length} 种（${customList.join(", ") || "无"}）\n` +
					`• 当前主题总数：${totalColors} 种\n` +
					`• 被覆盖的内置类型：${overridden.length} 种（${overridden.join(", ") || "无"}）`,
			);
		} catch (e: unknown) {
			console.error(
				"[wechat-publish] loadCalloutManagerThemes: 错误:",
				e instanceof Error ? e.message : String(e),
			);
			new Notice(
				`❌ Callout 主题加载失败: ${e instanceof Error ? e.message : String(e)}`,
			);
		}
	}

	// ── Helpers ──

	parseFrontmatter(text: string): {
		meta: FrontmatterMeta;
		body: string;
	} {
		const parsed = parseFrontmatterCore(text);
		if (parsed.error) {
			console.warn("[wechat-publish] Frontmatter YAML 解析失败:", parsed.error);
		}
		return { meta: parsed.meta, body: parsed.body };
	}

	escapeHtml(text: string): string {
		return text
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/"/g, "&quot;");
	}

	// ── Shared: Enhanced MD → HTML ──
	async processMarkdown(
		markdown: string,
		currentPath: string,
		forCopy = false,
	): Promise<ProcessedMarkdown> {
		const coreResult = renderMarkdownCore(markdown, {
			currentPath,
			resolveWikiLink: this.resolveNoteLink.bind(this),
			renderLatex: (formula, displayMode): LatexRenderResult => {
				const html = this.renderLatexSvg(formula, displayMode);
				return { html, fallback: html.includes("【公式：") };
			},
		});
		let html = coreResult.html;

		// Image output is the only Preview/Copy branch after the shared core.
		html = forCopy
			? this.replaceImagesWithPlaceholders(html)
			: await this.processImagesToBase64(html, currentPath);

		return { html, diagnostics: coreResult.diagnostics };
	}

	// ── Command: Preview in Browser ──
	// Track active preview server to close on next invocation
	private _previewServer: import("http").Server | null = null;
	private _previewServerTimeout: ReturnType<typeof setTimeout> | null = null;

	async processAndPreview(markdown: string, currentPath: string) {
		new Notice("正在生成预览...");
		try {
			// Close previous preview server if still running
			if (this._previewServer) {
				clearPreviewTimeout(this._previewServerTimeout);
				this._previewServer.close();
				this._previewServer = null;
				this._previewServerTimeout = null;
			}

			// Extract metadata from frontmatter and filename
			const { meta, body: mdBody } = this.parseFrontmatter(markdown);
			const fname =
				currentPath.split("/").pop()?.replace(/\.md$/, "") || "";
			const title = getFrontmatterString(meta, "title", fname) || fname;
			const date = getFrontmatterString(meta, "date");
			const author =
				getFrontmatterString(meta, "author", "公众号作者") || "公众号作者";
			const titleShort = fname; // placeholder — update later

			const { html: bodyHtml } = await this.processMarkdown(
				mdBody,
				currentPath,
			);

			const renderCSS = this.getRenderCSS();
			const fullHtml = `<!DOCTYPE html>
<html lang="zh-CN" class="light">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${this.escapeHtml(title)}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:"PingFang SC",system-ui,sans-serif;background:#e8e8e8;display:flex;justify-content:center;padding:20px 0;margin:0}
#pageFrame{max-width:780px;width:100%;background:#fff;padding:48px 56px 64px;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.06);margin:0 16px;transition:max-width .2s,padding .2s}
#pageFrame.phone{max-width:420px;padding:40px 28px 60px}
.toolbar{position:fixed;top:0;left:0;right:0;background:rgba(232,232,232,.92);backdrop-filter:blur(8px);padding:10px 20px;z-index:20;display:flex;align-items:center;justify-content:center;gap:12px;border-bottom:1px solid rgba(0,0,0,.06);font-size:13px}
.toolbar .title{font-weight:600;color:#333;margin-right:8px}
.toolbar button{padding:5px 14px;border:1px solid #ddd;border-radius:6px;background:#fff;font-size:12px;cursor:pointer;color:#666}
.toolbar button:hover{border-color:#aaa}
.toolbar button.active{background:#3a6fb5;color:#fff;border-color:#3a6fb5}
.meta{text-align:center;margin-bottom:32px;padding:40px 0 16px;border-bottom:1px solid #f0f0f0}
.meta .title{font-size:19px;font-weight:600;color:#1a1a1a;margin-bottom:6px}
.meta .info{font-size:12px;color:#bbb;letter-spacing:.5px}
${renderCSS}

/* ===== DARK MODE (manual .dark + auto prefers) ===== */
html.dark body{background:#1a1a1a}
html.dark #pageFrame{background:#222;box-shadow:0 2px 8px rgba(0,0,0,.3)}
html.dark .toolbar{background:rgba(26,26,26,.92);border-bottom-color:#333}
html.dark .toolbar .title{color:#ddd}
html.dark .toolbar button{background:#333;color:#aaa;border-color:#444}
html.dark .toolbar button.active{background:#3a6fb5;color:#fff}
html.dark .meta{border-bottom-color:#333}
html.dark .meta .title{color:#e0e0e0}
html.dark .meta .info{color:#666}
html.dark .wechat-content{color:rgba(255,255,255,.85)}
html.dark .wechat-content h1,html.dark .wechat-content h2,html.dark .wechat-content h3{color:#e0e0e0}
html.dark .wechat-content p{color:rgba(255,255,255,.85)}
html.dark .wechat-content li{color:rgba(255,255,255,.85)}
html.dark .wechat-content blockquote,html.dark .wechat-content blockquote p{color:rgba(255,255,255,.5)!important;border-left-color:#555!important}
html.dark .wechat-content code{background:#333;color:#ddd}
html.dark .wechat-content pre{background:#2a2a2a;color:#ddd}
html.dark .wechat-content pre code{background:transparent;color:#ddd}
html.dark .wechat-content hr{border-top-color:#333}
html.dark .wechat-content a{color:#7ea8d4}
html.dark .wechat-content mark,html.dark .wechat-content .highlight{background:linear-gradient(180deg,transparent 60%,rgba(255,255,255,.15) 60%)}
html.dark .wechat-content th{background:#2a2a2a;color:#aaa;border-color:#444}
html.dark .wechat-content td{color:rgba(255,255,255,.75);border-color:#333}
html.dark .wechat-content .caption{color:rgba(255,255,255,.3)}
html.dark .wechat-callout-body p{color:rgba(255,255,255,.7)!important}
html.dark .wechat-callout-table td p{color:rgba(255,255,255,.75)!important}
html.dark table[style*="border-left"] td{background:rgba(255,255,255,0.05)!important}
html.dark table[style*="border-left"] p{color:rgba(255,255,255,0.75)!important}
/* 内置 callout 深色模式：覆盖 CSS 变量，无 background */
html.dark .wechat-callout-note    { --callout-border: rgba(136,136,136,0.6) !important; --callout-bg: rgba(136,136,136,0.12) !important; --callout-title-color: #aaa !important }
html.dark .wechat-callout-info    { --callout-border: rgba(123,167,188,0.6) !important; --callout-bg: rgba(123,167,188,0.12) !important; --callout-title-color: #8db8c8 !important }
html.dark .wechat-callout-tip     { --callout-border: rgba(123,163,123,0.6) !important; --callout-bg: rgba(123,163,123,0.12) !important; --callout-title-color: #8db88d !important }
html.dark .wechat-callout-question{ --callout-border: rgba(183,160,123,0.6) !important; --callout-bg: rgba(183,160,123,0.12) !important; --callout-title-color: #c8b88d !important }
html.dark .wechat-callout-warning  { --callout-border: rgba(188,154,123,0.6) !important; --callout-bg: rgba(188,154,123,0.12) !important; --callout-title-color: #c8a88d !important }
html.dark .wechat-callout-danger   { --callout-border: rgba(188,123,123,0.6) !important; --callout-bg: rgba(188,123,123,0.12) !important; --callout-title-color: #c88d8d !important }
html.dark .wechat-callout-example { --callout-border: rgba(123,170,153,0.6) !important; --callout-bg: rgba(123,170,153,0.12) !important; --callout-title-color: #8dc8b0 !important }
html.dark .wechat-callout-quote   { --callout-border: rgba(153,153,153,0.6) !important; --callout-bg: rgba(153,153,153,0.12) !important; --callout-title-color: #aaa !important }
/* 标题 span 无背景无 padding */
html.dark .wechat-callout-title { background: transparent !important; padding: 0 !important }
html.dark .wechat-content mark, html.dark .wechat-content .highlight { color: rgba(255,255,255,0.85) }
html.dark img{opacity:.9}
${generateDarkModeCustomCalloutCSS()}

@media(prefers-color-scheme:dark){
  html:not(.light) body{background:#1a1a1a}
  html:not(.light) #pageFrame{background:#222;box-shadow:0 2px 8px rgba(0,0,0,.3)}
  html:not(.light) .toolbar{background:rgba(26,26,26,.92);border-bottom-color:#333}
  html:not(.light) .toolbar .title{color:#ddd}
  html:not(.light) .toolbar button{background:#333;color:#aaa;border-color:#444}
  html:not(.light) .toolbar button.active{background:#3a6fb5;color:#fff}
  html:not(.light) .meta{border-bottom-color:#333}
  html:not(.light) .meta .title{color:#e0e0e0}
  html:not(.light) .meta .info{color:#666}
  html:not(.light) .wechat-content{color:rgba(255,255,255,.85)}
  html:not(.light) .wechat-content h1,html:not(.light) .wechat-content h2,html:not(.light) .wechat-content h3{color:#e0e0e0}
  html:not(.light) .wechat-content p{color:rgba(255,255,255,.85)}
  html:not(.light) .wechat-content li{color:rgba(255,255,255,.85)}
  html:not(.light) .wechat-content blockquote,html:not(.light) .wechat-content blockquote p{color:rgba(255,255,255,.5)!important;border-left-color:#555!important}
  html:not(.light) .wechat-content code{background:#333;color:#ddd}
  html:not(.light) .wechat-content pre{background:#2a2a2a;color:#ddd}
  html:not(.light) .wechat-content pre code{background:transparent;color:#ddd}
  html:not(.light) .wechat-content hr{border-top-color:#333}
  html:not(.light) .wechat-content a{color:#7ea8d4}
  html:not(.light) .wechat-content .wechat-note-link{color:#7ea8d4;border-bottom-color:rgba(126,168,212,0.3)}
  html:not(.light) .wechat-content mark,html:not(.light) .wechat-content .highlight{background:linear-gradient(180deg,transparent 60%,rgba(255,255,255,.15) 60%)}
  html:not(.light) .wechat-content th{background:#2a2a2a;color:#aaa;border-color:#444}
  html:not(.light) .wechat-content td{color:rgba(255,255,255,.75);border-color:#333}
  html:not(.light) .wechat-content .caption{color:rgba(255,255,255,.3)}
  html:not(.light) .wechat-callout-body p{color:rgba(255,255,255,.7)!important}
  html:not(.light) .wechat-callout-table td p{color:rgba(255,255,255,.75)!important}
  html:not(.light) table[style*="border-left"] td{background:rgba(255,255,255,0.05)!important}
  html:not(.light) table[style*="border-left"] p{color:rgba(255,255,255,0.75)!important}
  html:not(.light) .wechat-callout-note    { --callout-border: rgba(136,136,136,0.6) !important; --callout-bg: rgba(136,136,136,0.12) !important; --callout-title-color: #aaa !important }
  html:not(.light) .wechat-callout-info    { --callout-border: rgba(123,167,188,0.6) !important; --callout-bg: rgba(123,167,188,0.12) !important; --callout-title-color: #8db8c8 !important }
  html:not(.light) .wechat-callout-tip     { --callout-border: rgba(123,163,123,0.6) !important; --callout-bg: rgba(123,163,123,0.12) !important; --callout-title-color: #8db88d !important }
  html:not(.light) .wechat-callout-question{ --callout-border: rgba(183,160,123,0.6) !important; --callout-bg: rgba(183,160,123,0.12) !important; --callout-title-color: #c8b88d !important }
  html:not(.light) .wechat-callout-warning  { --callout-border: rgba(188,154,123,0.6) !important; --callout-bg: rgba(188,154,123,0.12) !important; --callout-title-color: #c8a88d !important }
  html:not(.light) .wechat-callout-danger   { --callout-border: rgba(188,123,123,0.6) !important; --callout-bg: rgba(188,123,123,0.12) !important; --callout-title-color: #c88d8d !important }
  html:not(.light) .wechat-callout-example { --callout-border: rgba(123,170,153,0.6) !important; --callout-bg: rgba(123,170,153,0.12) !important; --callout-title-color: #8dc8b0 !important }
  html:not(.light) .wechat-callout-quote   { --callout-border: rgba(153,153,153,0.6) !important; --callout-bg: rgba(153,153,153,0.12) !important; --callout-title-color: #aaa !important }
  /* 标题 span 无背景无 padding */
  html:not(.light) .wechat-callout-title { background: transparent !important; padding: 0 !important }
  html:not(.light) .wechat-content mark, html:not(.light) .wechat-content .highlight { color: rgba(255,255,255,0.85) }
  html:not(.light) img{opacity:.9}
  ${generateDarkModeCustomCalloutCSS()}
}
</style></head>
<body>
<div class="toolbar">
  <span class="title">${this.escapeHtml(titleShort)}</span>
  <button id="btnDesktop" class="active" onclick="setView('desktop')">桌面</button>
  <button id="btnPhone" onclick="setView('phone')">手机</button>
  <span style="width:1px;background:#ddd;height:18px;margin:0 4px"></span>
  <button id="btnLight" class="active" onclick="setTheme('light')">浅色</button>
  <button id="btnDark" onclick="setTheme('dark')">深色</button>
</div>
<div style="height:56px"></div>
<div id="pageFrame">
  <div class="meta">
    <div class="title">${this.escapeHtml(title)}</div>
    <div class="info">${this.escapeHtml(author)}${date ? " · " + this.escapeHtml(date) : ""} · 简约日记风</div>
  </div>
  <div class="wechat-content">
${bodyHtml}
  </div>
</div>
<script>
function setView(m){let f=document.getElementById("pageFrame"),db=document.getElementById("btnDesktop"),pb=document.getElementById("btnPhone");db.classList.toggle("active",m==="desktop");pb.classList.toggle("active",m==="phone");f.classList.toggle("phone",m==="phone")}
function setTheme(m){let h=document.documentElement,lb=document.getElementById("btnLight"),db=document.getElementById("btnDark");h.classList.remove("light","dark");h.classList.add(m);lb.classList.toggle("active",m==="light");db.classList.toggle("active",m==="dark")}
if(window.matchMedia("(prefers-color-scheme:dark)").matches)setTheme("dark");
</script>
</body></html>`;
			// Serve via local HTTP to avoid file:// CORS issues with inline SVG
			const http = require("http") as typeof import("http");
			const server = http.createServer(
				(
					_req: import("http").IncomingMessage,
					res: import("http").ServerResponse,
				) => {
					this.renewPreviewServerTimeout(server);
					res.writeHead(200, {
						"Content-Type": "text/html; charset=utf-8",
					});
					res.end(fullHtml);
				},
			);
			this._previewServer = server;
			await new Promise<void>((resolve) =>
				server.listen(0, "127.0.0.1", resolve),
			);
			const addr = server.address() as { port: number };
			const url = `http://127.0.0.1:${addr.port}`;

			const { shell } = require("electron") as {
				shell: { openExternal: (url: string) => Promise<void> };
			};
			await shell.openExternal(url);

			// Track & auto-close: keep alive 30s after the latest page request,
			// close on the next preview or plugin unload.
			this.renewPreviewServerTimeout(server);
			new Notice("✅ 预览已在浏览器中打开");
		} catch (error) {
			console.error(error);
			const msg = error instanceof Error ? error.message : String(error);
			new Notice("❌ 预览失败：" + msg);
		}
	}

	private renewPreviewServerTimeout(server: import("http").Server): void {
		if (this._previewServer !== server) return;
		this._previewServerTimeout = renewPreviewTimeout(
			this._previewServerTimeout,
			() => {
				server.close();
				if (this._previewServer === server) {
					this._previewServer = null;
					this._previewServerTimeout = null;
				}
			},
			PREVIEW_IDLE_TIMEOUT_MS,
		);
	}

	// ── Command: Copy to WeChat ──
	async processAndCopy(markdown: string, currentPath: string) {
		new Notice("正在渲染排版并处理图片...");
		try {
			const { body: mdBody } = this.parseFrontmatter(markdown);
			const processed = await this.processMarkdown(
				mdBody,
				currentPath,
				true,
			);
			const bodyHtml = processed.html;
			// Strip @media blocks (WeChat handles dark mode on its own; they can't be juice-inlined)
			const renderCSS = this.getCopyCSS();
			const copyBodyHtml = normalizeWechatHighlightTags(bodyHtml);
			const fullHtml = `<div class="wechat-content"><style>${renderCSS}</style>${copyBodyHtml}</div>`;
			const inlinedHtml = juice(fullHtml);
			// Use stripped rendered text as plain-text fallback, not raw markdown
			const plainText = copyBodyHtml
				.replace(/<[^>]+>/g, "")
				.replace(/\s+/g, " ")
				.trim();
			await this.copyToClipboard(
				inlinedHtml,
				plainText,
				buildCopyNotice({
					paragraphCount: countHtmlParagraphs(copyBodyHtml),
					formulaCount: processed.diagnostics.formulaCount,
					imagePlaceholderCount: countImagePlaceholders(copyBodyHtml),
					latexFallbackCount: processed.diagnostics.latexFallbackCount,
					unresolvedWikilinkCount:
						processed.diagnostics.unresolvedWikilinkCount,
				}),
			);
		} catch (error) {
			console.error(error);
			const msg = error instanceof Error ? error.message : String(error);
			new Notice("❌ 复制失败：" + msg);
		}
	}

	// 将 ![[image.png]] 转换为 ![](image.png)
	// ── CSS helper ──

	getCopyCSS(): string {
		return buildCopyCSS(this.getRenderCSS());
	}

	getRenderCSS(): string {
		const customCSS = this.settings.customCSS ?? "";
		if (customCSS.includes(".wechat-callout")) return customCSS;
		return `${customCSS}
${CALLOUT_FALLBACK_CSS}`;
	}

	/**
	 * 解析笔记链接：查找目标笔记的 link-wechat-mp frontmatter
	 * @param linkpath 笔记路径或名称（从 wikilink 提取）
	 * @param sourcePath 当前笔记路径（用于相对路径解析）
	 * @returns 微信文章链接或 null
	 */
	resolveNoteLink(linkpath: string, sourcePath: string): string | null {
		try {
			const file = this.app.metadataCache.getFirstLinkpathDest(
				linkpath,
				sourcePath,
			);
			if (!file) return null;

			const cache = this.app.metadataCache.getFileCache(file);
			if (!cache?.frontmatter) return null;

			const wechatUrl = cache.frontmatter["link-wechat-mp"];
			return typeof wechatUrl === "string" ? wechatUrl : null;
		} catch {
			return null;
		}
	}

	convertWikiLinks(markdown: string, sourcePath: string): string {
		return convertWikiLinksCore(
			markdown,
			sourcePath,
			this.resolveNoteLink.bind(this),
		);
	}

	/** Render LaTeX to one MathJax SVG; CJK text stays as SVG text with inherited font. */
	renderLatexSvg(formula: string, displayMode: boolean): string {
		if (!mathjaxSvgModule) {
			try {
				const vaultBase = (this.app.vault.adapter as any).getBasePath?.() as string | undefined; // eslint-disable-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
				if (vaultBase) {
					const fs = require('fs') as typeof import('fs');
					const modulePath = vaultBase + '/' + this.app.vault.configDir + '/plugins/obsidian-wechat-publish/mathjax-svg.js';
					if (fs.existsSync(modulePath)) {
						mathjaxSvgModule = require(modulePath);
						console.log('[wechat-publish] mathjax-svg.js loaded successfully');
					}
				}
			} catch (e) {
				console.warn('[wechat-publish] Failed to load mathjax-svg.js:', e);
			}
		}
		if (mathjaxSvgModule) {
			try {
				return renderLatexHtml(formula, displayMode, mathjaxSvgModule.tex2svg);
			} catch (e) {
				console.warn('[wechat-publish] MathJax SVG render failed:', e);
			}
		}
		return renderLatexFallback(formula, displayMode);
	}

	// 保留旧的类方法入口，实际逻辑位于无 Obsidian 依赖的核心模块。
	preventBreakAfterStrong(html: string): string {
		return preventBreakAfterStrongCore(html);
	}

	// Replace <img> tags with text placeholders for WeChat copy (avoids base64 hang)
	replaceImagesWithPlaceholders(html: string): string {
		return replaceImagesWithPlaceholdersCore(html);
	}

	// 核心逻辑：解析 HTML，查找 img 标签，将本地路径转为 Base64
	async processImagesToBase64(
		html: string,
		sourcePath: string,
	): Promise<string> {
		return replaceLocalImageSources(html, async (decodedSrc) => {
			const file = this.app.metadataCache.getFirstLinkpathDest(
				decodedSrc,
				sourcePath,
			);
			if (file && file instanceof TFile) {
				return this.readImageToBase64(file);
			}
			console.warn("未找到图片文件:", decodedSrc);
			return null;
		});
	}

	// 解析 Obsidian Callout 语法（例如：> [!warning] 标题）
	async readImageToBase64(file: TFile): Promise<string> {
		const buffer = await this.app.vault.readBinary(file);
		const arr = new Uint8Array(buffer);

		// 简单的二进制转 Base64 字符串
		let binary = "";
		const len = arr.byteLength;
		for (let i = 0; i < len; i++) {
			binary += String.fromCharCode(arr[i]!);
		}
		const base64 = window.btoa(binary);

		// 根据扩展名判断 mime type
		const ext = file.extension.toLowerCase();
		const mimeMap: Record<string, string> = {
			png: "image/png",
			jpg: "image/jpeg",
			jpeg: "image/jpeg",
			gif: "image/gif",
			webp: "image/webp",
			svg: "image/svg+xml",
		};
		const mime = mimeMap[ext] || "image/jpeg";

		return `data:${mime};base64,${base64}`;
	}

	async copyToClipboard(
		html: string,
		plainText: string,
		noticeMessage: string,
	) {
		const { clipboard } = require("electron") as {
			clipboard: {
				write: (data: { text: string; html: string }) => void;
			};
		};
		clipboard.write({
			text: plainText,
			html: html,
		});
		new Notice(noticeMessage);
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			(await this.loadData()) as WechatPluginSettings,
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class WechatSettingTab extends PluginSettingTab {
	plugin: WechatCopyPlugin;

	constructor(app: App, plugin: WechatCopyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl).setName("WeChat formatting").setHeading();

		new Setting(containerEl)
			.setName("Reset style")
			.setDesc(
				"Click to reset style to the default minimalist diary theme",
			)
			.addButton((button) =>
				button.setButtonText("Reset").onClick(async () => {
					this.plugin.settings.customCSS = DEFAULT_CSS;
					await this.plugin.saveSettings();
					this.display(); // 刷新界面
					new Notice("Style reset!");
				}),
			);

		new Setting(containerEl)
			.setName("Custom CSS")
			.setDesc("Define the converted article style (CSS)")
			.addTextArea((text) => {
				text.setPlaceholder("Enter CSS...")
					.setValue(this.plugin.settings.customCSS)
					.onChange(async (value) => {
						this.plugin.settings.customCSS = value;
						await this.plugin.saveSettings();
					});

				text.inputEl.rows = 20;
				text.inputEl.addClass("wechat-plugin-textarea");
			});
	}
}
