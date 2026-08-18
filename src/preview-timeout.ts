export type PreviewTimeoutHandle = ReturnType<typeof setTimeout>;

export function renewPreviewTimeout(
	current: PreviewTimeoutHandle | null,
	onExpire: () => void,
	timeoutMs: number,
): PreviewTimeoutHandle {
	if (current !== null) clearTimeout(current);
	return setTimeout(onExpire, timeoutMs);
}

export function clearPreviewTimeout(
	current: PreviewTimeoutHandle | null,
): void {
	if (current !== null) clearTimeout(current);
}
