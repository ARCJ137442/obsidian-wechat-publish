/**
 * Callout preprocessor: converts Obsidian callout MD syntax to HTML blocks
 * BEFORE markdown-it rendering. markdown-it (html: true) passes them through.
 */
const CALLOUT_TYPES: Record<string, string> = {
	'note': 'note', 'abstract': 'note', 'summary': 'note', 'tldr': 'note',
	'info': 'info', 'todo': 'info',
	'tip': 'tip', 'hint': 'tip', 'important': 'tip', 'success': 'tip', 'check': 'tip', 'done': 'tip',
	'question': 'question', 'help': 'question', 'faq': 'question',
	'warning': 'warning', 'caution': 'warning', 'attention': 'warning',
	'danger': 'danger', 'error': 'danger', 'bug': 'danger', 'failure': 'danger', 'fail': 'danger', 'missing': 'danger',
	'example': 'example', 'quote': 'quote'
};

const TITLES: Record<string, string> = {
	'note': 'Note', 'info': 'Info', 'tip': 'Tip', 'question': 'Question',
	'warning': 'Warning', 'danger': 'Danger', 'example': 'Example', 'quote': 'Quote'
};

export default function preprocessCallouts(md: string): string {
	// Match: > [!TYPE] title\n> body lines...
	const re = /^> \[!([a-zA-Z0-9_-]+)\]([+-])?[ \t]*([^\n]*)\n((?:> [^\n]*\n?)*)/gm;

	return md.replace(re, (_full: string, rawType: string, _fold: string | undefined, title: string, bodyBlock: string) => {
		const cType = CALLOUT_TYPES[rawType.toLowerCase()] ?? 'note';
		const cTitle = title.trim() || TITLES[cType] || 'Note';
		const body = bodyBlock
			.split('\n')
			.filter(line => line.trim())
			.map(line => line.replace(/^>\s?/, ''))
			.join('\n')
			.trim();
		return `<div class="wechat-callout wechat-callout-${cType}">\n<div class="wechat-callout-title">${cTitle}</div>\n<div class="wechat-callout-body">\n\n${body}\n\n</div>\n</div>\n`;
	});
}
