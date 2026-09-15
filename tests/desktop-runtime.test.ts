import { describe, expect, it, vi } from "vitest";
import { binaryToBase64, getVaultBasePath } from "../src/desktop-runtime";

vi.mock("obsidian", () => ({
	Platform: { isDesktop: true },
}));

describe("desktop runtime adapter", () => {
	it("keeps vault path resolution at the desktop boundary", () => {
		expect(getVaultBasePath({ getBasePath: () => "C:/vault" })).toBe("C:/vault");
		expect(getVaultBasePath({})).toBeUndefined();
	});

	it("converts binary image data without depending on window.btoa", () => {
		expect(binaryToBase64(new Uint8Array([0, 255, 16]).buffer)).toBe("AP8Q");
	});
});
