export type HtmlClipboardPayload = {
	html: string;
	text: string;
};

export type NativeClipboard = {
	write?: (data: HtmlClipboardPayload) => void;
	writeText?: (text: string) => void;
};

export type BrowserClipboard = {
	write?: (items: ClipboardItem[]) => Promise<void>;
	writeText?: (text: string) => Promise<void>;
};

export type ClipboardRuntimeDependencies = {
	native?: NativeClipboard;
	browser?: BrowserClipboard;
	createClipboardItem?: (payload: HtmlClipboardPayload) => ClipboardItem;
};

export type ClipboardSource = "system" | "browser";

export type ClipboardWriteResult = {
	source: ClipboardSource;
	fallback: boolean;
};

export class ClipboardRuntimeError extends Error {
	constructor(
		message: string,
		readonly nativeError?: unknown,
		readonly browserError?: unknown,
	) {
		super(message);
		this.name = "ClipboardRuntimeError";
	}
}

export async function writeRichClipboard(
	payload: HtmlClipboardPayload,
	dependencies: ClipboardRuntimeDependencies,
): Promise<ClipboardWriteResult> {
	let nativeError: unknown;
	if (dependencies.native?.write) {
		try {
			dependencies.native.write(payload);
			return { source: "system", fallback: false };
		} catch (error) {
			nativeError = error;
		}
	}

	if (dependencies.browser?.write) {
		try {
			const createClipboardItem =
				dependencies.createClipboardItem ?? createBrowserClipboardItem;
			await dependencies.browser.write([createClipboardItem(payload)]);
			return { source: "browser", fallback: nativeError !== undefined };
		} catch (error) {
			throw new ClipboardRuntimeError(
				"富文本剪贴板写入失败",
				nativeError,
				error,
			);
		}
	}

	throw new ClipboardRuntimeError(
		"当前平台没有可用的富文本剪贴板 API",
		nativeError,
	);
}

export async function writePlainTextClipboard(
	text: string,
	dependencies: ClipboardRuntimeDependencies,
): Promise<ClipboardWriteResult> {
	let nativeError: unknown;
	if (dependencies.native?.writeText) {
		try {
			dependencies.native.writeText(text);
			return { source: "system", fallback: false };
		} catch (error) {
			nativeError = error;
		}
	}

	if (dependencies.browser?.writeText) {
		try {
			await dependencies.browser.writeText(text);
			return { source: "browser", fallback: nativeError !== undefined };
		} catch (error) {
			throw new ClipboardRuntimeError(
				"纯文本剪贴板写入失败",
				nativeError,
				error,
			);
		}
	}

	throw new ClipboardRuntimeError(
		"当前平台没有可用的纯文本剪贴板 API",
		nativeError,
	);
}

export function getBrowserClipboard(): BrowserClipboard | undefined {
	const activeWindow =
		typeof window !== "undefined"
			? (window as Window & { activeWindow?: Window }).activeWindow
			: undefined;
	return (
		activeWindow?.navigator?.clipboard ??
		(typeof navigator !== "undefined" ? navigator.clipboard : undefined)
	);
}

function createBrowserClipboardItem(
	payload: HtmlClipboardPayload,
): ClipboardItem {
	if (typeof ClipboardItem === "undefined") {
		throw new Error("当前 WebView 不支持 ClipboardItem");
	}

	return new ClipboardItem({
		"text/html": new Blob([payload.html], { type: "text/html" }),
		"text/plain": new Blob([payload.text], { type: "text/plain" }),
	});
}
