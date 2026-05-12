const fs = require('fs');
const https = require('https');
const MarkdownIt = require('markdown-it');
const markdownItMark = require('markdown-it-mark');
const juice = require('juice');

let css = fs.readFileSync('H:/A137442/Document/life-series/publish/wechat-theme.css', 'utf-8');
// Strip @media blocks (same as plugin)
css = css.replace(/@media\s*\([^{]*\)\s*\{[^}]*\}/g, '');

let raw = fs.readFileSync('H:/A137442/Document/life-series/temp/样式测试 - 全元素覆盖.md', 'utf-8');
if (raw.startsWith('---')) { const end = raw.indexOf('---', 3); if (end !== -1) raw = raw.slice(end + 3).trim(); }

// mdUnescape
const ESC_MAP = new Map();
function mdUnescape(text) {
	ESC_MAP.clear();
	const e = [['\\\\', '\\'], ['\\_', '_'], ['\\*', '*'], ['\\`', '`'], ['\\#', '#'], ['\\+', '+'], ['\\-', '-'], ['\\.', '.'], ['\\!', '!'], ['\\(', '('], ['\\)', ')'], ['\\[', '['], ['\\]', ']'], ['\\{', '{'], ['\\}', '}'], ['\\~', '~']];
	for (let i = 0; i < e.length; i++) { const ph = '\uE000MDESC' + i + '\uE000'; ESC_MAP.set(ph, e[i][1]); text = text.split(e[i][0]).join(ph); }
	return text;
}
function restoreEscapes(text) { for (const [ph, ch] of ESC_MAP) text = text.split(ph).join(ch); return text; }

// LaTeX SVG via codecogs
async function renderLatexSvg(formula) {
	return new Promise(resolve => {
		const url = 'https://latex.codecogs.com/svg.latex?\\color{black}%20' + encodeURIComponent(formula);
		https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
			let data = ''; res.on('data', c => data += c); res.on('end', () => {
				let svg = data;
				svg = svg.replace(/<\?xml[^?]*\?>\s*/g, '').replace(/<!--[^>]*-->\s*/g, '');
				svg = svg.replace(/\s*xmlns:xlink=['"][^"']*['"]/g, '').replace(/\s*version=['"][\d.]+['"]/g, '');
				svg = svg.replace(/xlink:href/g, 'href');
				const wm = svg.match(/width='([\d.]+)pt'/); const w = wm ? wm[1] : null;
				svg = svg.replace(/\s*width='[\d.]+pt'/g, '').replace(/\s*height='[\d.]+pt'/g, '');
				svg = svg.replace(/viewBox='([\d.\-\s]+)'/, (_, vb) => {
					const p = vb.split(/\s+/).map(Number); p[1] -= 6; p[3] += 12; return 'viewBox="' + p.join(' ') + '"';
				});
				let a = 'style="vertical-align:middle;"'; if (w) a += ' width="' + w + 'pt"';
				svg = svg.replace('<svg ', '<svg ' + a + ' ').replace(/<g /g, '<g fill="currentColor" ').replace(/<use /g, '<use fill="currentColor" ');
				resolve(svg.trim());
			});
		}).on('error', () => resolve('<code>' + formula + '</code>'));
	});
}

// Callout preprocessor (table-based)
const CT = {
	note: { border: '#888', bg: '#fafafa', tc: '#555' }, info: { border: '#7ba7bc', bg: '#f8fafb', tc: '#4a7585' },
	tip: { border: '#7ba37b', bg: '#f8faf8', tc: '#4a704a' }, question: { border: '#b7a07b', bg: '#faf9f6', tc: '#7a684a' },
	warning: { border: '#bc9a7b', bg: '#faf7f4', tc: '#856a4a' }, danger: { border: '#bc7b7b', bg: '#faf5f5', tc: '#854a4a' },
	example: { border: '#7baa99', bg: '#f6faf9', tc: '#4a7566' }, quote: { border: '#999', bg: '#f8f8f8', tc: '#666' },
};
const CA = { note: 'note', abstract: 'note', summary: 'note', tldr: 'note', info: 'info', todo: 'info', tip: 'tip', hint: 'tip', important: 'tip', success: 'tip', check: 'tip', done: 'tip', question: 'question', help: 'question', faq: 'question', warning: 'warning', caution: 'warning', attention: 'warning', danger: 'danger', error: 'danger', bug: 'danger', failure: 'danger', fail: 'danger', missing: 'danger', example: 'example', quote: 'quote' };
const TL = { note: 'Note', info: 'Info', tip: 'Tip', question: 'Question', warning: 'Warning', danger: 'Danger', example: 'Example', quote: 'Quote' };
function preprocessCallouts(md) {
	return md.replace(/^> \[!([a-zA-Z0-9_-]+)\]([+-])?[ \t]*([^\n]*)\n((?:> [^\n]*\n?)*)/gm, (_, rt, _f, title, bb) => {
		const ct = CA[rt.toLowerCase()] || 'note'; const t = CT[ct];
		const cTitle = title.trim() || TL[ct] || 'Note';
		const body = bb.split('\n').filter(l => l.trim()).map(l => l.replace(/^>\s?/, '')).join('\n').trim();
		const bl = body.split('\n').map(l => '<p style="margin:0 0 6px 0;color:rgba(0,0,0,0.7);font-size:15px;line-height:1.75">' + l + '</p>').join('\n');
		return '<table style="width:100%;margin:20px 0;border-collapse:collapse;border-spacing:0"><tbody><tr><td style="border-left:3px solid ' + t.border + ';background:' + t.bg + ';padding:12px 16px;border-radius:4px">\n<p style="margin:0 0 8px 0;color:' + t.tc + ';font-size:14px;font-weight:600;line-height:1.6">' + cTitle + '</p>\n' + bl + '\n</td></tr></tbody></table>\n';
	});
}

(async () => {
	const unescaped = mdUnescape(raw);
	const latexMap = new Map(); let li = 0;
	const withLatexPH = unescaped
		.replace(/\$\$([\s\S]+?)\$\$/g, (_, f) => { const ph = '\uE000LATEX' + li + '\uE000'; latexMap.set(ph, f.trim()); li++; return ph; })
		.replace(/\$(.+?)\$/g, (_, f) => { const ph = '\uE000LATEX' + li + '\uE000'; latexMap.set(ph, f.trim()); li++; return ph; });
	const preprocessed = preprocessCallouts(withLatexPH);
	const md = new MarkdownIt({ html: true, breaks: true, linkify: true }); md.use(markdownItMark);
	let html = md.render(preprocessed); html = restoreEscapes(html);
	for (const [ph, formula] of latexMap) { const svg = await renderLatexSvg(formula); html = html.split(ph).join(svg); }
	const fullHtml = '<div class="wechat-content"><style>' + css + '</style>' + html + '</div>';
	const inlinedHtml = juice(fullHtml);
	fs.writeFileSync('C:/Users/56506/AppData/Local/Temp/copy-output.html', inlinedHtml, 'utf-8');
	console.log('Written. SVG:', inlinedHtml.includes('<svg'), 'Table callout:', inlinedHtml.includes('border-left:3px solid'), 'Size:', inlinedHtml.length);
})();
