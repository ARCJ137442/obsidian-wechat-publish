export type CopyNoticeSummary = {
	paragraphCount: number;
	formulaCount: number;
	imagePlaceholderCount: number;
	latexFallbackCount: number;
	unresolvedWikilinkCount: number;
};

export function countHtmlParagraphs(html: string): number {
	return html.match(/<p\b/gi)?.length ?? 0;
}

export function countImagePlaceholders(html: string): number {
	return html.match(/【图片：[^】]*】/g)?.length ?? 0;
}

export function buildCopyNotice(summary: CopyNoticeSummary): string {
	const lines = [
		`✅ 已复制到剪贴板：${summary.paragraphCount} 个段落，${summary.formulaCount} 个公式。`,
	];

	if (summary.imagePlaceholderCount > 0) {
		lines.push(
			`本地图片已替换为 ${summary.imagePlaceholderCount} 个占位符，需要手动上传。`,
		);
	}
	if (summary.latexFallbackCount > 0) {
		lines.push(`${summary.latexFallbackCount} 个公式使用了文本回退。`);
	}
	if (summary.unresolvedWikilinkCount > 0) {
		lines.push(
			`${summary.unresolvedWikilinkCount} 个公众号链接未配置，已保留为普通文本。`,
		);
	}

	return lines.join("\n");
}
