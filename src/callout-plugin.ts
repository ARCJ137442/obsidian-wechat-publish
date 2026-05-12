/**
 * Callout preprocessor: converts Obsidian callout MD syntax to inline-styled
 * <table> blocks BEFORE markdown-it. WeChat preserves <table> but strips <div>.
 */
const CALLOUT_THEMES: Record<string, { border: string; bg: string; titleColor: string; titleBg: string }> = {
	'note':     { border: '#888',    bg: '#fafafa', titleColor: '#555',    titleBg: '#f3f3f3' },
	'info':     { border: '#7ba7bc', bg: '#f8fafb', titleColor: '#4a7585', titleBg: '#eef4f6' },
	'tip':      { border: '#7ba37b', bg: '#f8faf8', titleColor: '#4a704a', titleBg: '#eef3ee' },
	'question': { border: '#b7a07b', bg: '#faf9f6', titleColor: '#7a684a', titleBg: '#f3f0ea' },
	'warning':  { border: '#bc9a7b', bg: '#faf7f4', titleColor: '#856a4a', titleBg: '#f3eee6' },
	'danger':   { border: '#bc7b7b', bg: '#faf5f5', titleColor: '#854a4a', titleBg: '#f3e6e6' },
	'example':  { border: '#7baa99', bg: '#f6faf9', titleColor: '#4a7566', titleBg: '#eaf3f0' },
	'quote':    { border: '#999',    bg: '#f8f8f8', titleColor: '#666',    titleBg: '#eee' },
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
		return `<table class="wechat-callout-table" style="width:100%;margin:20px 0;border-collapse:collapse;border-spacing:0"><tbody><tr><td style="border-left:3px solid ${theme.border};background:${theme.bg};padding:12px 16px;border-radius:4px">
<p style="margin:0 0 8px 0;color:${theme.titleColor};font-size:14px;font-weight:600;line-height:1.6">${cTitle}</p>
${body.split('\n').map(line => `<p style="margin:0 0 6px 0;color:rgba(0,0,0,0.7);font-size:15px;line-height:1.75">${line}</p>`).join('\n')}
</td></tr></tbody></table>\n`;
	});
}
