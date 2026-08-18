export type WikiLinkResolver = (
	linkpath: string,
	sourcePath: string,
) => string | null;

/** Convert Obsidian wikilinks while preserving fenced and inline code. */
export function convertWikiLinks(
	markdown: string,
	sourcePath: string,
	resolveNoteLink: WikiLinkResolver,
	onUnresolvedLink?: (linkpath: string) => void,
	onWikilink?: (linkpath: string, resolved: boolean) => void,
): string {
	const codeBlocks: string[] = [];
	let protectedMd = markdown
		.replace(/```[\s\S]*?```/g, (match) => {
			codeBlocks.push(match);
			return `\uE000CODE${codeBlocks.length - 1}\uE000`;
		})
		.replace(/`[^`\n]+`/g, (match) => {
			codeBlocks.push(match);
			return `\uE000CODE${codeBlocks.length - 1}\uE000`;
		});

	protectedMd = protectedMd.replace(
		/!\[\[([^\]]*?)\]\]/g,
		(_match: string, content: string) => {
			let fileName = content;
			let altText = "";
			if (content.includes("|")) {
				const parts = content.split("|");
				fileName = parts[0] ?? "";
				altText = parts.slice(1).join("|");
			}
			return `![${altText}](${encodeURI(fileName.trim())})`;
		},
	);

	protectedMd = protectedMd.replace(
		/\[\[([^\]]+?)\]\]/g,
		(_match: string, content: string) => {
			let linkpath = content;
			let displayText = content;

			if (content.includes("|")) {
				const parts = content.split("|");
				linkpath = parts[0] ?? "";
				displayText = parts.slice(1).join("|");
			}

			if (linkpath.includes("#")) {
				const hashIdx = linkpath.indexOf("#");
				linkpath = linkpath.slice(0, hashIdx);
				if (!content.includes("|")) {
					displayText = content.slice(content.indexOf("#") + 1);
				}
			}

			linkpath = linkpath.trim();
			displayText = displayText.trim();
			if (!linkpath) return `[${displayText}]`;

			const wechatUrl = resolveNoteLink(linkpath, sourcePath);
			onWikilink?.(linkpath, Boolean(wechatUrl));
			if (wechatUrl) return `[${displayText}](${wechatUrl})`;

			onUnresolvedLink?.(linkpath);
			return `<span class="wechat-note-link">${displayText}</span>`;
		},
	);

	for (let i = 0; i < codeBlocks.length; i++) {
		const block = codeBlocks[i];
		if (block !== undefined) {
			protectedMd = protectedMd.replace(`\uE000CODE${i}\uE000`, block);
		}
	}

	return protectedMd;
}
