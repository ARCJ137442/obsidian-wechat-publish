export type CopyStatistics = {
	plainTextCharacters: number;
	htmlCharacters: number;
	htmlByteSize: number;
};

export function buildCopyStatistics(
	html: string,
	plainText: string,
): CopyStatistics {
	return {
		plainTextCharacters: Array.from(plainText).length,
		htmlCharacters: Array.from(html).length,
		htmlByteSize: new TextEncoder().encode(html).byteLength,
	};
}

export function formatByteSize(byteSize: number): string {
	if (byteSize < 1024) return `${byteSize} B`;
	if (byteSize < 1024 * 1024) return `${(byteSize / 1024).toFixed(1)} KB`;
	return `${(byteSize / (1024 * 1024)).toFixed(1)} MB`;
}
