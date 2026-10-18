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
		expect(output).toContain("本地图");
		expect(output).toMatch(
			/<strong[^>]*color:#FF0000[^>]*>【图片：images\/local\.png】<\/strong><br><span[^>]*font-size:14px[^>]*>本地图<\/span>/,
		);
		expect(output).not.toContain("<p><p");
		expect(output).toContain('src="https://example.com/remote.png"');
		expect(output).not.toContain('src="images/local.png"');
	});

	it("keeps the source filename and Obsidian caption on separate lines", () => {
		const output = replaceImagesWithPlaceholders(
			'<html><body><p><img src="Pasted%20image%201790783415879.png" alt="中秋长假重拾 MC，日落时的怅然"></p></body></html>',
		);

		expect(output).toContain("【图片：Pasted image 1790783415879.png】");
		expect(output).toContain("中秋长假重拾 MC，日落时的怅然");
		expect(output).toMatch(/<strong[^>]*>【图片：Pasted image 1790783415879\.png】<\/strong><br>/);
	});

	it("does not add a second line when no caption is present", () => {
		const output = replaceImagesWithPlaceholders(
			'<html><body><p><img src="attachments/Pasted%20image%201.png" alt=""></p></body></html>',
		);

		expect(output).toContain("【图片：attachments/Pasted image 1.png】");
		expect(output).not.toContain("<br>");
		expect(output).not.toContain("font-weight:400");
	});

	it("keeps the decoded source filename when no caption is present", () => {
		const output = replaceImagesWithPlaceholders(
			'<p><img src="attachments/Pasted%20image%201.png" alt=""></p>',
		);

		expect(output).toContain("【图片：attachments/Pasted image 1.png】");
	});

	it("does not abort on malformed encoded image paths", () => {
		const output = replaceImagesWithPlaceholders(
			'<p><img src="attachments/bad%2Fname%ZZ.png" alt=""></p>',
		);

		expect(output).toContain("【图片：attachments/bad%2Fname%ZZ.png】");
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
