import { describe, expect, it, vi } from "vitest";
import {
	ClipboardRuntimeError,
	writePlainTextClipboard,
	writeRichClipboard,
} from "../src/clipboard-runtime";

const payload = {
	html: '<p style="color:red">正文</p>',
	text: "正文",
};

describe("clipboard runtime adapters", () => {
	it("prefers the native system API for rich HTML", async () => {
		const nativeWrite = vi.fn();
		const browserWrite = vi.fn(async () => undefined);

		const result = await writeRichClipboard(payload, {
			native: { write: nativeWrite },
			browser: { write: browserWrite },
		});

		expect(result).toEqual({ source: "system", fallback: false });
		expect(nativeWrite).toHaveBeenCalledWith(payload);
		expect(browserWrite).not.toHaveBeenCalled();
	});

	it("falls back to Web Clipboard for rich HTML when native API is absent", async () => {
		const browserWrite = vi.fn(async () => undefined);
		const createdPayloads: Array<{ html: string; text: string }> = [];
		const createClipboardItem = vi.fn((value: { html: string; text: string }) => {
			createdPayloads.push(value);
			return {} as ClipboardItem;
		});

		const result = await writeRichClipboard(payload, {
			browser: { write: browserWrite },
			createClipboardItem,
		});

		expect(result).toEqual({ source: "browser", fallback: false });
		expect(createClipboardItem).toHaveBeenCalledWith(payload);
		expect(createdPayloads).toEqual([payload]);
		expect(browserWrite).toHaveBeenCalledOnce();
	});

	it("writes both HTML and plain-text MIME parts to the browser clipboard", async () => {
		class FakeClipboardItem {
			readonly types: string[];

			constructor(private readonly data: Record<string, Blob>) {
				this.types = Object.keys(data);
			}

			async getType(type: string): Promise<Blob> {
				return this.data[type];
			}
		}

		vi.stubGlobal("ClipboardItem", FakeClipboardItem);
		let received: ClipboardItem[] | undefined;
		try {
			await writeRichClipboard(payload, {
				browser: {
					write: async (items) => {
						received = items;
					},
				},
			});
		} finally {
			vi.unstubAllGlobals();
		}

		if (!received) throw new Error("browser clipboard did not receive an item");
		const item = received[0] as unknown as FakeClipboardItem;
		expect(item.types).toEqual(["text/html", "text/plain"]);
		expect(await (await item.getType("text/html")).text()).toBe(payload.html);
		expect(await (await item.getType("text/plain")).text()).toBe(payload.text);
	});

	it("falls back to Web Clipboard after a native rich write failure", async () => {
		const nativeWrite = vi.fn(() => {
			throw new Error("native unavailable");
		});
		const browserWrite = vi.fn(async () => undefined);

		const result = await writeRichClipboard(payload, {
			native: { write: nativeWrite },
			browser: { write: browserWrite },
			createClipboardItem: () => ({}) as ClipboardItem,
		});

		expect(result).toEqual({ source: "browser", fallback: true });
		expect(browserWrite).toHaveBeenCalledOnce();
	});

	it("uses the native system API for plain HTML text when available", async () => {
		const nativeWriteText = vi.fn();
		const browserWriteText = vi.fn(async () => undefined);

		const result = await writePlainTextClipboard(payload.html, {
			native: { writeText: nativeWriteText },
			browser: { writeText: browserWriteText },
		});

		expect(result).toEqual({ source: "system", fallback: false });
		expect(nativeWriteText).toHaveBeenCalledWith(payload.html);
		expect(browserWriteText).not.toHaveBeenCalled();
	});

	it("uses Web Clipboard for plain HTML text when native API is absent", async () => {
		const browserWriteText = vi.fn(async () => undefined);

		const result = await writePlainTextClipboard(payload.html, {
			browser: { writeText: browserWriteText },
		});

		expect(result).toEqual({ source: "browser", fallback: false });
		expect(browserWriteText).toHaveBeenCalledWith(payload.html);
	});

	it("falls back to browser plain text after the native write fails", async () => {
		const nativeWriteText = vi.fn(() => {
			throw new Error("native unavailable");
		});
		const browserWriteText = vi.fn(async () => undefined);

		const result = await writePlainTextClipboard(payload.html, {
			native: { writeText: nativeWriteText },
			browser: { writeText: browserWriteText },
		});

		expect(result).toEqual({ source: "browser", fallback: true });
		expect(browserWriteText).toHaveBeenCalledWith(payload.html);
	});

	it("reports browser rich-write failures without pretending plain text was copied", async () => {
		const browserError = new Error("permission denied");
		const browserWrite = vi.fn(async () => {
			throw browserError;
		});

		await expect(
			writeRichClipboard(payload, {
				browser: { write: browserWrite },
				createClipboardItem: () => ({}) as ClipboardItem,
			}),
		).rejects.toMatchObject({
			name: "ClipboardRuntimeError",
			message: "富文本剪贴板写入失败",
			browserError,
		});
	});

	it("reports unsupported rich clipboard instead of silently copying plain text", async () => {
		try {
			await writeRichClipboard(payload, {});
			throw new Error("expected rich clipboard to be unsupported");
		} catch (error) {
			expect(error).toBeInstanceOf(ClipboardRuntimeError);
			expect(error).toMatchObject({
				message: "当前平台没有可用的富文本剪贴板 API",
			});
		}
	});
});
