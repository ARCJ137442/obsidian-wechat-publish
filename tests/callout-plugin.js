"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = calloutPlugin;
const CALLOUT_TYPES = {
    'note': 'note', 'abstract': 'note', 'summary': 'note', 'tldr': 'note',
    'info': 'info', 'todo': 'info',
    'tip': 'tip', 'hint': 'tip', 'important': 'tip', 'success': 'tip', 'check': 'tip', 'done': 'tip',
    'question': 'question', 'help': 'question', 'faq': 'question',
    'warning': 'warning', 'caution': 'warning', 'attention': 'warning',
    'danger': 'danger', 'error': 'danger', 'bug': 'danger', 'failure': 'danger', 'fail': 'danger', 'missing': 'danger',
    'example': 'example',
    'quote': 'quote'
};
const DEFAULT_TITLES = {
    'note': 'Note', 'info': 'Info', 'tip': 'Tip', 'question': 'Question',
    'warning': 'Warning', 'danger': 'Danger', 'example': 'Example', 'quote': 'Quote'
};
function calloutPlugin(md) {
    md.core.ruler.after('block', 'callout', (state) => {
        const tokens = state.tokens;
        const result = [];
        for (let i = 0; i < tokens.length; i++) {
            const tok = tokens[i];
            if (tok.type !== 'blockquote_open') {
                result.push(tok);
                continue;
            }
            const bqStart = i;
            let bqEnd = i + 1;
            let depth = 1;
            while (bqEnd < tokens.length && depth > 0) {
                if (tokens[bqEnd].type === 'blockquote_open')
                    depth++;
                else if (tokens[bqEnd].type === 'blockquote_close')
                    depth--;
                bqEnd++;
            }
            // Find [!TYPE] in the first inline token
            let calloutRawType = '';
            let calloutCustomTitle = '';
            let headerLen = 0;
            for (let j = bqStart + 1; j < bqEnd && !calloutRawType; j++) {
                const t = tokens[j];
                if (t.type === 'inline') {
                    const m = t.content.match(/^\[!([a-zA-Z0-9_-]+)\]([+-])?[ \t]*([^\n]*)/);
                    if (m) {
                        calloutRawType = m[1].toLowerCase();
                        calloutCustomTitle = (m[3] ?? '').trim();
                        headerLen = m[0].length;
                        if (t.content[headerLen] === '\n')
                            headerLen++;
                    }
                }
            }
            if (!calloutRawType) {
                for (let j = bqStart; j < bqEnd; j++)
                    result.push(tokens[j]);
                i = bqEnd - 1;
                continue;
            }
            const cType = CALLOUT_TYPES[calloutRawType] ?? 'note';
            const cTitle = calloutCustomTitle || DEFAULT_TITLES[cType] || 'Note';
            const html = (s) => {
                const t = new state.Token('html_block', '', 0);
                t.content = s;
                result.push(t);
            };
            html(`<div class="wechat-callout wechat-callout-${cType}">`);
            html(`<div class="wechat-callout-title">${md.utils.escapeHtml(cTitle)}</div>`);
            html(`<div class="wechat-callout-body">`);
            // Emit body tokens, stripping header from first inline
            for (let j = bqStart + 1; j < bqEnd; j++) {
                const bt = tokens[j];
                if (bt.type === 'blockquote_open' || bt.type === 'blockquote_close')
                    continue;
                if (bt.type === 'inline' && headerLen > 0) {
                    const stripped = new state.Token('inline', '', 0);
                    stripped.content = bt.content.slice(headerLen).trimStart();
                    // Also trim leading \n if present
                    if (stripped.content.startsWith('\n'))
                        stripped.content = stripped.content.slice(1);
                    if (stripped.content)
                        result.push(stripped);
                    headerLen = 0;
                }
                else {
                    result.push(bt);
                }
            }
            html(`</div></div>`);
            i = bqEnd - 1;
        }
        state.tokens = result;
    });
}
