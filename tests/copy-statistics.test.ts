import { describe, expect, it } from "vitest";
import { buildCopyStatistics, formatByteSize } from "../src/copy-statistics";

describe("copy statistics", () => {
	it("counts Unicode characters and UTF-8 HTML bytes", () => {
		expect(buildCopyStatistics("<p>你好🙂</p>", "你好🙂")).toEqual({
			plainTextCharacters: 3,
			htmlCharacters: 10,
			htmlByteSize: new TextEncoder().encode("<p>你好🙂</p>").byteLength,
		});
	});

	it("formats byte sizes for the preview", () => {
		expect(formatByteSize(512)).toBe("512 B");
		expect(formatByteSize(1024)).toBe("1.0 KB");
		expect(formatByteSize(1024 * 1024 * 2)).toBe("2.0 MB");
	});
});
