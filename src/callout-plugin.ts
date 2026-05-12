/**
 * Callout preprocessor: converts Obsidian callout MD syntax to inline-styled
 * <table> blocks BEFORE markdown-it. WeChat preserves <table> but strips <div>.
 */
const CALLOUT_THEMES: Record<string, { border: string; bg: string; titleColor: string; titleBg: string }> = {
	'note':     { border: '#888',    bg: '#f5f3f7', titleColor: '#555',    titleBg: '#ede8f2' },
	'info':     { border: '#7ba7bc', bg: '#f0f6f9', titleColor: '#4a7585', titleBg: '#e2eef4' },
	'tip':      { border: '#7ba37b', bg: '#f0f6f2', titleColor: '#4a704a', titleBg: '#e2f0e6' },
	'question': { border: '#b7a07b', bg: '#f7f4ec', titleColor: '#7a684a', titleBg: '#f0eade' },
	'warning':  { border: '#bc9a7b', bg: '#f7f2ec', titleColor: '#856a4a', titleBg: '#f0e6d8' },
	'danger':   { border: '#bc7b7b', bg: '#f7efef', titleColor: '#854a4a', titleBg: '#f0dfdf' },
	'example':  { border: '#7baa99', bg: '#eff7f5', titleColor: '#4a7566', titleBg: '#dff0eb' },
	'quote':    { border: '#999',    bg: '#f5f5f5', titleColor: '#666',    titleBg: '#eaeaea' },
};

const CALLOUT_ALIASES: Record<string, string> = {
	'note': 'note', 'abstract': 'note', 'summary': 'note', 'tldr': 'note',
	'info': 'info', 'todo': 'info',
	'tip': 'tip', 'hint': 'tip', 'important': 'tip', 'success': 'tip', 'check': 'tip', 'done': 'tip',
	'question': 'question', 'help': 'question', 'faq': 'question',
	'warning': 'warning', 'caution': 'warning', 'attention': 'warning',
	'danger': 'danger', 'error': 'danger', 'bug': 'danger', 'failure': 'danger', 'fail': 'danger', 'missing': 'danger',
	'example': 'example', 'quote': 'quote'
};

const DEFAULT_TITLES: Record<string, string> = {
	'note': 'Note', 'info': 'Info', 'tip': 'Tip', 'question': 'Question',
	'warning': 'Warning', 'danger': 'Danger', 'example': 'Example', 'quote': 'Quote'
};

export default function preprocessCallouts(md: string): string {
	const re = /^> \[!([a-zA-Z0-9_-]+)\]([+-])?[ \t]*([^\n]*)\n((?:> [^\n]*\n?)*)/gm;

	return md.replace(re, (_full: string, rawType: string, _fold: string | undefined, title: string, bodyBlock: string) => {
		const cType = CALLOUT_ALIASES[rawType.toLowerCase()] ?? 'note';
		const theme = CALLOUT_THEMES[cType] ?? CALLOUT_THEMES['note']!;
		const cTitle = title.trim() || DEFAULT_TITLES[cType] || 'Note';
		const body = bodyBlock
			.split('\n')
			.filter(line => line.trim())
			.map(line => line.replace(/^>\s?/, ''))
			.join('\n')
			.trim();

		// WeChat-safe <table> structure with inline styles
		return `<table class="wechat-callout-table wechat-callout-${cType}" style="width:100%;margin:20px 0;border-collapse:collapse;border-spacing:0"><tbody><tr><td style="border-left:3px solid ${theme.border};background:${theme.bg};padding:12px 16px;border-radius:4px">
<p style="margin:0 0 8px 0;color:${theme.titleColor};font-size:14px;font-weight:600;line-height:1.6">${cTitle}</p>
${body.split('\n').map(line => `<p style="margin:0 0 6px 0;color:rgba(0,0,0,0.7);font-size:15px;line-height:1.75">${line}</p>`).join('\n')}
</td></tr></tbody></table>\n`;
	});
}
