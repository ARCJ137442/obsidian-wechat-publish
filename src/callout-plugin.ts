/**
 * Callout preprocessor: converts Obsidian callout MD syntax to inline-styled
 * <table> blocks BEFORE markdown-it. WeChat preserves <table> but strips <div>.
 */
const CALLOUT_THEMES: Record<string, { border: string; bg: string; titleColor: string; titleBg: string }> = {
	'note':     { border: '#888',    bg: 'rgba(0,0,0,0.04)',      titleColor: '#555',    titleBg: 'rgba(0,0,0,0.06)' },
	'info':     { border: '#7ba7bc', bg: 'rgba(123,167,188,0.08)', titleColor: '#4a7585', titleBg: 'rgba(123,167,188,0.12)' },
	'tip':      { border: '#7ba37b', bg: 'rgba(123,163,123,0.08)', titleColor: '#4a704a', titleBg: 'rgba(123,163,123,0.12)' },
	'question': { border: '#b7a07b', bg: 'rgba(183,160,123,0.08)', titleColor: '#7a684a', titleBg: 'rgba(183,160,123,0.12)' },
	'warning':  { border: '#bc9a7b', bg: 'rgba(188,154,123,0.08)', titleColor: '#856a4a', titleBg: 'rgba(188,154,123,0.12)' },
	'danger':   { border: '#bc7b7b', bg: 'rgba(188,123,123,0.08)', titleColor: '#854a4a', titleBg: 'rgba(188,123,123,0.12)' },
	'example':  { border: '#7baa99', bg: 'rgba(123,170,153,0.08)', titleColor: '#4a7566', titleBg: 'rgba(123,170,153,0.12)' },
	'quote':    { border: '#999',    bg: 'rgba(0,0,0,0.04)',      titleColor: '#666',    titleBg: 'rgba(0,0,0,0.06)' },
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
		return `<table class="wechat-callout-table wechat-callout-${cType}" style="width:100%;margin:20px 0;border-collapse:collapse;border-spacing:0"><tbody><tr><td style="border:none;border-left:3px solid ${theme.border};background:${theme.bg};padding:12px 16px;border-radius:4px">
<p style="margin:0 0 8px 0;color:${theme.titleColor};font-size:14px;font-weight:600;line-height:1.6">${cTitle}</p>
${body.split('\n').map(line => `<p style="margin:0 0 6px 0;font-size:15px;line-height:1.75">${line}</p>`).join('\n')}
</td></tr></tbody></table>\n`;
	});
}
