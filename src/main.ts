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
    requestUrl,
} from "obsidian";
import MarkdownIt from "markdown-it";
// @ts-ignore - no types available
import markdownItMark from "markdown-it-mark";
import juice from "juice";
import preprocessCallouts from "./callout-plugin";

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
    padding: 10px 14px;
    font-size: 14px;
    font-weight: 600;
    line-height: 1.6;
    color: #555;
    background: #f5f5f5;
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
  .wechat-callout-note    .wechat-callout-title { color: #555; background: #ede8f2; }
  .wechat-callout-info td { border-left-color: #7ba7bc; background: #f0f6f9; }
  .wechat-callout-info    .wechat-callout-title { color: #4a7585; background: #e2eef4; }
  .wechat-callout-tip td     { border-left-color: #7ba37b; background: #f0f6f2; }
  .wechat-callout-tip     .wechat-callout-title { color: #4a704a; background: #e2f0e6; }
  .wechat-callout-question td{ border-left-color: #b7a07b; background: #f7f4ec; }
  .wechat-callout-question .wechat-callout-title { color: #7a684a; background: #f0eade; }
  .wechat-callout-warning td { border-left-color: #bc9a7b; background: #f7f2ec; }
  .wechat-callout-warning .wechat-callout-title { color: #856a4a; background: #f0e6d8; }
  .wechat-callout-danger td  { border-left-color: #bc7b7b; background: #f7efef; }
  .wechat-callout-danger  .wechat-callout-title { color: #854a4a; background: #f0dfdf; }
  .wechat-callout-example td { border-left-color: #7baa99; background: #eff7f5; }
  .wechat-callout-example .wechat-callout-title { color: #4a7566; background: #dff0eb; }
  .wechat-callout-quote td   { border-left-color: #999; background: #f5f5f5; }
  .wechat-callout-quote   .wechat-callout-title { color: #666; background: #eaeaea; }

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
	    padding: 10px 14px;
	    font-size: 15px;
	    font-weight: 700;
	    line-height: 1.6;
	    color: #5a3382;
	    background: #f1e7fb;
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
	    background: #f1e7fb;
	}
	.wechat-callout-info {
	    border-left-color: #2eaadc;
	    background: #f3fbff;
	}
	.wechat-callout-info .wechat-callout-title {
	    color: #1f7599;
	    background: #dff4fd;
	}
	.wechat-callout-tip {
	    border-left-color: #2f9e44;
	    background: #f3fcf5;
	}
	.wechat-callout-tip .wechat-callout-title {
	    color: #1f6d2f;
	    background: #dff5e4;
	}
	.wechat-callout-question {
	    border-left-color: #b7791f;
	    background: #fffaf2;
	}
	.wechat-callout-question .wechat-callout-title {
	    color: #8a5b17;
	    background: #fcefd9;
	}
	.wechat-callout-warning {
	    border-left-color: #e8913c;
	    background: #fff8f0;
	}
	.wechat-callout-warning .wechat-callout-title {
	    color: #b96f22;
	    background: #fde9d4;
	}
	.wechat-callout-danger {
	    border-left-color: #e03131;
	    background: #fff5f5;
	}
	.wechat-callout-danger .wechat-callout-title {
	    color: #b42323;
	    background: #fde3e3;
	}
	.wechat-callout-example {
	    border-left-color: #0ca678;
	    background: #f2fffb;
	}
	.wechat-callout-example .wechat-callout-title {
	    color: #087f5b;
	    background: #d9f7ee;
	}
	.wechat-callout-quote {
	    border-left-color: #868e96;
	    background: #f8f9fa;
	}
	.wechat-callout-quote .wechat-callout-title {
	    color: #495057;
	    background: #e9ecef;
	}
`;

// ──────── Enhanced MD Preprocessing ────────

/** Convert Markdown backslash escapes to placeholder tokens. */
function mdUnescape(text: string): string {
    const escapes: [string, string][] = [
        ["\\\\", "\\"],
        ["\\_", "_"],
        ["\\*", "*"],
        ["\\`", "`"],
        ["\\#", "#"],
        ["\\+", "+"],
        ["\\-", "-"],
        ["\\.", "."],
        ["\\!", "!"],
        ["\\(", "("],
        ["\\)", ")"],
        ["\\[", "["],
        ["\\]", "]"],
        ["\\{", "{"],
        ["\\}", "}"],
        ["\\~", "~"],
    ];
    let result = text;
    for (let i = 0; i < escapes.length; i++) {
        const ph = `\uE000MDESC${i}\uE000`;
        result = result.split(escapes[i]![0]).join(ph);
        escapePlaceholders.set(ph, escapes[i]![1]);
    }
    return result;
}
const escapePlaceholders = new Map<string, string>();

function restoreEscapes(text: string): string {
    let result = text;
    for (const [ph, ch] of escapePlaceholders) {
        result = result.split(ph).join(ch);
    }
    return result;
}

/** Clean SVG for WeChat: strip xlink, use currentColor, pt units. */
function cleanWechatSvg(svg: string): string {
    svg = svg.replace(/<\?xml[^?]*\?>\s*/g, "");
    svg = svg.replace(/<!--[^>]*-->\s*/g, "");
    svg = svg.replace(/\s*xmlns:xlink=['"][^"']*['"]/g, "");
    svg = svg.replace(/\s*version=['"][\d.]+['"]/g, "");
    svg = svg.replace(/xlink:href/g, "href");
    const wMatch = svg.match(/width='([\d.]+)pt'/);
    const wPt = wMatch ? wMatch[1] : null;
    svg = svg.replace(/\s*width='[\d.]+pt'/g, "");
    svg = svg.replace(/\s*height='[\d.]+pt'/g, "");
    // Pad viewBox to prevent tall glyphs (e.g. superscripts) from clipping
    svg = svg.replace(/viewBox='([\d.\-\s]+)'/, (_m: string, vb: string) => {
        const parts = vb.split(/\s+/).map(Number);
        if (parts.length === 4) {
            parts[1]! -= 6; // y - padding
            parts[3]! += 12; // height + padding
        }
        return `viewBox='${parts.join(" ")}'`;
    });
    let attrs = 'style="vertical-align:middle;"';
    if (wPt) attrs += ` width="${wPt}pt"`;
    svg = svg.replace("<svg ", `<svg ${attrs} `);
    svg = svg.replace(/<g /g, '<g fill="currentColor" ');
    svg = svg.replace(/<use /g, '<use fill="currentColor" ');
    return svg.trim();
}

/** Render LaTeX for Preview (SVG via codecogs) or Copy (text placeholder). */
async function renderLatexSvg(
    formula: string,
    forCopy = false,
): Promise<string> {
    if (forCopy) return `【公式：${escapeHtml(formula)}】`;
    try {
        const encoded = encodeURIComponent(formula);
        const url = `https://latex.codecogs.com/svg.latex?\\color{black}%20${encoded}`;
        const resp = await requestUrl({
            url,
            headers: { "User-Agent": "Mozilla/5.0" },
        });
        return cleanWechatSvg(resp.text);
    } catch {
        return `<code>${escapeHtml(formula)}</code>`;
    }
}

function escapeHtml(text: string): string {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

// ──────── Plugin ────────

interface WechatPluginSettings {
    customCSS: string;
}

const DEFAULT_SETTINGS: WechatPluginSettings = {
    customCSS: DEFAULT_CSS,
};

export default class WechatCopyPlugin extends Plugin {
    settings: WechatPluginSettings;

    async onload() {
        await this.loadSettings();

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

    async onunload() {
        if (this._previewServer) {
            clearTimeout(this._previewServerTimeout);
            this._previewServer.close();
            this._previewServer = null;
        }
    }

    // ── Helpers ──

    parseFrontmatter(text: string): {
        meta: Record<string, string>;
        body: string;
    } {
        const meta: Record<string, string> = {};
        let body = text;
        if (text.startsWith("---")) {
            const end = text.indexOf("---", 3);
            if (end !== -1) {
                const fm = text.slice(3, end).trim();
                body = text.slice(end + 3).trim();
                for (const line of fm.split("\n")) {
                    const colonIdx = line.indexOf(":");
                    if (colonIdx > 0) {
                        const key = line.slice(0, colonIdx).trim();
                        let val = line.slice(colonIdx + 1).trim();
                        val = val.replace(/^["']|["']$/g, "");
                        meta[key] = val;
                    }
                }
            }
        }
        return { meta, body };
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
    ): Promise<string> {
        // 1. WikiLink normalization
        const normalized = this.convertWikiLinks(markdown);

        // 2. Backslash unescape → placeholders (before any parsing)
        const unescaped = mdUnescape(normalized);

        // 3. LaTeX $...$ → placeholder tokens (preserve raw formula for API)
        const latexMap = new Map<string, string>();
        let latexIdx = 0;
        const withLatexPH = unescaped
            .replace(/\$\$([\s\S]+?)\$\$/g, (_m, f: string) => {
                const ph = `\uE000LATEX${latexIdx}\uE000`;
                latexMap.set(ph, f.trim());
                latexIdx++;
                return ph;
            })
            .replace(/\$(.+?)\$/g, (_m, f: string) => {
                const ph = `\uE000LATEX${latexIdx}\uE000`;
                latexMap.set(ph, f.trim());
                latexIdx++;
                return ph;
            });

        // 4. markdown-it with plugins
        const md = new MarkdownIt({ html: true, breaks: true, linkify: true });
        md.use(markdownItMark); // ==highlight== → <mark>
        const preprocessed = preprocessCallouts(withLatexPH);
        let html = md.render(preprocessed);

        // 5. Restore backslash escapes
        html = restoreEscapes(html);

        // 6. Fix bold-colon break
        html = this.preventBreakAfterStrong(html);

        // 7. Callout transform
        // 2.5 Preprocess callouts: MD syntax → HTML blocks before markdown-it

        // 8. Resolve LaTeX placeholders → SVG (async)
        for (const [ph, formula] of latexMap) {
            const svg = await renderLatexSvg(formula, forCopy);
            html = html.split(ph).join(svg);
        }

        // 9. Image → Base64
        html = forCopy
            ? this.replaceImagesWithPlaceholders(html)
            : await this.processImagesToBase64(html, currentPath);

        return html;
    }

    // ── Command: Preview in Browser ──
    // Track active preview server to close on next invocation
    private _previewServer: any = null;
    private _previewServerTimeout: any = null;

    async processAndPreview(markdown: string, currentPath: string) {
        new Notice("正在生成预览...");
        try {
            // Close previous preview server if still running
            if (this._previewServer) {
                clearTimeout(this._previewServerTimeout);
                this._previewServer.close();
                this._previewServer = null;
            }

            // Extract metadata from frontmatter and filename
            const { meta, body: mdBody } = this.parseFrontmatter(markdown);
            const fname =
                currentPath.split("/").pop()?.replace(/\.md$/, "") || "";
            const title = meta["title"] || fname;
            const date = meta["date"] || "";
            const author = meta["author"] || "公众号作者";
            const titleShort = fname; // placeholder — update later

            const bodyHtml = await this.processMarkdown(mdBody, currentPath);

            const metaBlock = `
			<div class="article-meta">
				<h1 class="article-title">${this.escapeHtml(title)}</h1>
				<div class="article-info">
					<span class="article-author">${this.escapeHtml(author)}</span>
					${date ? `<span class="article-date">${this.escapeHtml(date)}</span>` : ""}
				</div>
			</div>`;

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
html.dark .wechat-callout-note td { border-left-color: rgba(136,136,136,0.6)!important; background: rgba(136,136,136,0.12)!important }
html.dark .wechat-callout-note    .wechat-callout-title { color: #aaa!important; background: rgba(136,136,136,0.2)!important }
html.dark .wechat-callout-info td { border-left-color: rgba(123,167,188,0.6)!important; background: rgba(123,167,188,0.12)!important }
html.dark .wechat-callout-info    .wechat-callout-title { color: #8db8c8!important; background: rgba(123,167,188,0.2)!important }
html.dark .wechat-callout-tip td { border-left-color: rgba(123,163,123,0.6)!important; background: rgba(123,163,123,0.12)!important }
html.dark .wechat-callout-tip     .wechat-callout-title { color: #8db88d!important; background: rgba(123,163,123,0.2)!important }
html.dark .wechat-callout-question td{ border-left-color: rgba(183,160,123,0.6)!important; background: rgba(183,160,123,0.12)!important }
html.dark .wechat-callout-question .wechat-callout-title { color: #c8b88d!important; background: rgba(183,160,123,0.2)!important }
html.dark .wechat-callout-warning td { border-left-color: rgba(188,154,123,0.6)!important; background: rgba(188,154,123,0.12)!important }
html.dark .wechat-callout-warning .wechat-callout-title { color: #c8a88d!important; background: rgba(188,154,123,0.2)!important }
html.dark .wechat-callout-danger td  { border-left-color: rgba(188,123,123,0.6)!important; background: rgba(188,123,123,0.12)!important }
html.dark .wechat-callout-danger  .wechat-callout-title { color: #c88d8d!important; background: rgba(188,123,123,0.2)!important }
html.dark .wechat-callout-example td { border-left-color: rgba(123,170,153,0.6)!important; background: rgba(123,170,153,0.12)!important }
html.dark .wechat-callout-example .wechat-callout-title { color: #8dc8b0!important; background: rgba(123,170,153,0.2)!important }
html.dark .wechat-callout-quote td   { border-left-color: rgba(153,153,153,0.6)!important; background: rgba(153,153,153,0.12)!important }
html.dark .wechat-callout-quote   .wechat-callout-title { color: #aaa!important; background: rgba(153,153,153,0.2)!important }
html.dark .wechat-content mark, html.dark .wechat-content .highlight { color: rgba(255,255,255,0.85) }
html.dark img{opacity:.9}

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
  html:not(.light) .wechat-content mark,html:not(.light) .wechat-content .highlight{background:linear-gradient(180deg,transparent 60%,rgba(255,255,255,.15) 60%)}
  html:not(.light) .wechat-content th{background:#2a2a2a;color:#aaa;border-color:#444}
  html:not(.light) .wechat-content td{color:rgba(255,255,255,.75);border-color:#333}
  html:not(.light) .wechat-content .caption{color:rgba(255,255,255,.3)}
  html:not(.light) .wechat-callout-body p{color:rgba(255,255,255,.7)!important}
  html:not(.light) .wechat-callout-table td p{color:rgba(255,255,255,.75)!important}
  html:not(.light) table[style*="border-left"] td{background:rgba(255,255,255,0.05)!important}
  html:not(.light) table[style*="border-left"] p{color:rgba(255,255,255,0.75)!important}
  html:not(.light) .wechat-callout-note td { border-left-color: rgba(136,136,136,0.6)!important; background: rgba(136,136,136,0.12)!important }
  html:not(.light) .wechat-callout-note    .wechat-callout-title { color: #aaa!important; background: rgba(136,136,136,0.2)!important }
  html:not(.light) .wechat-callout-info td { border-left-color: rgba(123,167,188,0.6)!important; background: rgba(123,167,188,0.12)!important }
  html:not(.light) .wechat-callout-info    .wechat-callout-title { color: #8db8c8!important; background: rgba(123,167,188,0.2)!important }
  html:not(.light) .wechat-callout-tip td     { border-left-color: rgba(123,163,123,0.6)!important; background: rgba(123,163,123,0.12)!important }
  html:not(.light) .wechat-callout-tip     .wechat-callout-title { color: #8db88d!important; background: rgba(123,163,123,0.2)!important }
  html:not(.light) .wechat-callout-question td{ border-left-color: rgba(183,160,123,0.6)!important; background: rgba(183,160,123,0.12)!important }
  html:not(.light) .wechat-callout-question .wechat-callout-title { color: #c8b88d!important; background: rgba(183,160,123,0.2)!important }
  html:not(.light) .wechat-callout-warning td { border-left-color: rgba(188,154,123,0.6)!important; background: rgba(188,154,123,0.12)!important }
  html:not(.light) .wechat-callout-warning .wechat-callout-title { color: #c8a88d!important; background: rgba(188,154,123,0.2)!important }
  html:not(.light) .wechat-callout-danger td  { border-left-color: rgba(188,123,123,0.6)!important; background: rgba(188,123,123,0.12)!important }
  html:not(.light) .wechat-callout-danger  .wechat-callout-title { color: #c88d8d!important; background: rgba(188,123,123,0.2)!important }
  html:not(.light) .wechat-callout-example td { border-left-color: rgba(123,170,153,0.6)!important; background: rgba(123,170,153,0.12)!important }
  html:not(.light) .wechat-callout-example .wechat-callout-title { color: #8dc8b0!important; background: rgba(123,170,153,0.2)!important }
  html:not(.light) .wechat-callout-quote td   { border-left-color: rgba(153,153,153,0.6)!important; background: rgba(153,153,153,0.12)!important }
  html:not(.light) .wechat-callout-quote   .wechat-callout-title { color: #aaa!important; background: rgba(153,153,153,0.2)!important }
  html:not(.light) .wechat-content mark, html:not(.light) .wechat-content .highlight { color: rgba(255,255,255,0.85) }
  html:not(.light) img{opacity:.9}
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
            const server = http.createServer((_req: any, res: any) => {
                res.writeHead(200, {
                    "Content-Type": "text/html; charset=utf-8",
                });
                res.end(fullHtml);
            });
            await new Promise<void>((resolve) =>
                server.listen(0, "127.0.0.1", resolve),
            );
            const addr = server.address() as { port: number };
            const url = `http://127.0.0.1:${addr.port}`;

            const { shell } = require("electron");
            await shell.openExternal(url);

            // Track & auto-close: keep alive 30s for refreshes, close on next preview
            this._previewServer = server;
            this._previewServerTimeout = setTimeout(() => {
                server.close();
                if (this._previewServer === server) this._previewServer = null;
            }, 30000);
            new Notice("✅ 预览已在浏览器中打开");
        } catch (error) {
            console.error(error);
            const msg = error instanceof Error ? error.message : String(error);
            new Notice("❌ 预览失败：" + msg);
        }
    }

    // ── Command: Copy to WeChat ──
    async processAndCopy(markdown: string, currentPath: string) {
        new Notice("正在渲染排版并处理图片...");
        try {
            const { body: mdBody } = this.parseFrontmatter(markdown);
            const bodyHtml = await this.processMarkdown(
                mdBody,
                currentPath,
                true,
            );
            // Strip @media blocks (WeChat handles dark mode on its own; they can't be juice-inlined)
            const renderCSS = this.getCopyCSS();
            const fullHtml = `<div class="wechat-content"><style>${renderCSS}</style>${bodyHtml}</div>`;
            const inlinedHtml = juice(fullHtml);
            // Use stripped rendered text as plain-text fallback, not raw markdown
            const plainText = bodyHtml
                .replace(/<[^>]+>/g, "")
                .replace(/\s+/g, " ")
                .trim();
            await this.copyToClipboard(inlinedHtml, plainText);
        } catch (error) {
            console.error(error);
            const msg = error instanceof Error ? error.message : String(error);
            new Notice("❌ 复制失败：" + msg);
        }
    }

    // 将 ![[image.png]] 转换为 ![](image.png)
    // ── CSS helper ──

    getCopyCSS(): string {
        const css = this.getRenderCSS();
        const mediaIdx = css.indexOf("@media");
        let copy = mediaIdx >= 0 ? css.substring(0, mediaIdx) : css;
        // Strip ALL color props — WeChat dark mode crashes on "color: inherit"
        copy = copy.replace(/^\s*color:\s*[^;]+;\s*$/gm, "");
        copy = copy.replace(/color:\s*rgba?\([^)]+\)\s*!?\s*;?/g, "");
        copy = copy.replace(/color:\s*#[0-9a-fA-F]+\s*!?\s*;?/g, "");
	        // Replace mark gradient with solid bg — WeChat converts rgba(0,0,0,*) ↔ rgba(255,255,255,*)
	        copy = copy.replace(
	            /background:\s*linear-gradient\([^)]+rgba\(0,\s*0,\s*0[^)]+\)[^)]*\)/g,
	            "background-color: rgba(0,0,0,0.15)",
	        );
        // Keep blockquote as fixed gray
        copy +=
            "\nblockquote, blockquote p { color: rgba(0,0,0,0.5) !important; }";
        return copy;
    }

    getRenderCSS(): string {
        const customCSS = this.settings.customCSS ?? "";
        if (customCSS.includes(".wechat-callout")) return customCSS;
        return `${customCSS}
${CALLOUT_FALLBACK_CSS}`;
    }

    convertWikiLinks(markdown: string): string {
        const wikiImageRegex = /!\[\[([^\]]*?)\]\]/g;
        return markdown.replace(
            wikiImageRegex,
            (match: string, content: string) => {
                let fileName = content;
                let altText = "";

                // 处理管道符 | (用于改大小或别名)
                if (content.includes("|")) {
                    const parts = content.split("|");
                    fileName = parts[0] ?? "";
                    altText = parts.slice(1).join("|");
                }

                // 去除首尾空格
                fileName = fileName.trim();

                // 关键点：URL 编码，处理文件名中的空格 "Image (1).png" -> "Image%20(1).png"
                const encodedPath = encodeURI(fileName);

                return `![${altText}](${encodedPath})`;
            },
        );
    }

    // 修复：防止加粗文字和冒号被换行分开
    preventBreakAfterStrong(html: string): string {
        let result = html;

        // 针对用户提供的具体情况：</strong> 后面跟着 <section> 或其他标签，标签内有冒号
        // 在 </strong> 和下一个标签之间插入零宽不换行空格

        // 1. 处理 </strong> 后面直接跟 < 的情况（标签开始）
        result = result.replace(/(<\/strong>)(<)/g, "$1\uFEFF$2");

        // 2. 处理 </b> 后面直接跟 < 的情况
        result = result.replace(/(<\/b>)(<)/g, "$1\uFEFF$2");

        // 3. 处理 </span>（加粗）后面直接跟 < 的情况
        // 先用一个临时标记处理带 font-weight 的 span
        let tempResult = result;
        // 匹配带 font-weight 的 span 从开始到结束
        // 这里采用简化方法：在所有 </span> 后面跟 < 的地方都插入
        result = result.replace(/(<\/span>)(<)/g, "$1\uFEFF$2");

        // 4. 同时保留原来的直接跟冒号的处理
        result = result.replace(/(<\/strong>)(\s*)([：:])/g, "$1\uFEFF$2$3");
        result = result.replace(/(<\/b>)(\s*)([：:])/g, "$1\uFEFF$2$3");
        result = result.replace(/(<\/span>)(\s*)([：:])/g, "$1\uFEFF$2$3");

        return result;
    }

    // Replace <img> tags with text placeholders for WeChat copy (avoids base64 hang)
    replaceImagesWithPlaceholders(html: string): string {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, "text/html");
        const images = doc.getElementsByTagName("img");
        for (let i = images.length - 1; i >= 0; i--) {
            const img = images[i];
            if (!img) continue;
            const src = img.getAttribute("src") || "";
            // Keep external HTTP images; replace local/base64 ones
            if (src.startsWith("http")) continue;
            const alt = img.getAttribute("alt") || "图片";
            const placeholder = doc.createElement("p");
            placeholder.setAttribute(
                "style",
                "text-align:center;color:#999;font-size:14px;margin:16px 0",
            );
            placeholder.textContent = `【图片：${decodeURIComponent(src) || alt}】`;
            img.replaceWith(placeholder);
        }
        return doc.body.innerHTML || doc.documentElement.innerHTML;
    }

    // 核心逻辑：解析 HTML，查找 img 标签，将本地路径转为 Base64
    async processImagesToBase64(
        html: string,
        sourcePath: string,
    ): Promise<string> {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, "text/html");

        const images = doc.getElementsByTagName("img");
        const promises: Promise<void>[] = [];

        for (let i = 0; i < images.length; i++) {
            const img = images[i];
            if (!img) continue;

            const src = img.getAttribute("src");

            if (src) {
                // 跳过网络图片和已经是 Base64 的图片
                if (src.startsWith("http") || src.startsWith("data:")) {
                    continue;
                }

                const task = async () => {
                    try {
                        // 解码路径 (因为我们在 convertWikiLinks 里编码过)
                        const decodedSrc = decodeURIComponent(src);

                        // 使用 Obsidian API 解析文件路径
                        const file =
                            this.app.metadataCache.getFirstLinkpathDest(
                                decodedSrc,
                                sourcePath,
                            );

                        if (file && file instanceof TFile) {
                            const base64 = await this.readImageToBase64(file);
                            img.setAttribute("src", base64);
                        } else {
                            console.warn("未找到图片文件:", decodedSrc);
                        }
                    } catch (e) {
                        console.error("图片转换失败:", src, e);
                    }
                };
                promises.push(task());
            }
        }

        // 等待所有图片处理完成
        await Promise.all(promises);
        return doc.body.innerHTML || doc.documentElement.innerHTML;
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

    async copyToClipboard(html: string, plainText: string) {
        const { clipboard } = require("electron");
        clipboard.write({
            text: plainText,
            html: html,
        });
		new Notice("✅ 已复制！图片与LaTeX公式已替换为占位符，请手动替换。");
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
