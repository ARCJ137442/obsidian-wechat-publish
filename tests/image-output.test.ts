import { beforeAll, describe, expect, it } from "vitest";
import { DOMParser as LinkedomDOMParser } from "linkedom";
import {
	replaceImagesWithPlaceholders,
	replaceLocalImageSources,
} from "../src/image-output";

beforeAll(() => {
	(globalThis as typeof globalThis & { DOMParser: typeof LinkedomDOMParser }).DOMParser =
		LinkedomDOMParser;
});

describe("Copy image output", () => {
	it("uses placeholders for local images and keeps external images", () => {
		const output = replaceImagesWithPlaceholders(
			'<html><body><p><img src="images/local.png" alt="本地图"></p><p><img src="https://example.com/remote.png"></p></body></html>',
		);
		expect(output).toContain("【图片：images/local.png】");
		expect(output).toContain('src="https://example.com/remote.png"');
		expect(output).not.toContain('src="images/local.png"');
	});
});

describe("Preview image output", () => {
	it("resolves local images through the injected adapter", async () => {
		const output = await replaceLocalImageSources(
			'<html><body><p><img src="images/local%20image.png"></p><p><img src="data:image/png;base64,abc"></p></body></html>',
			(source) => `data:image/png;base64,${source}`,
		);
		expect(output).toContain("data:image/png;base64,images/local image.png");
		expect(output).toContain("data:image/png;base64,abc");
	});
});
