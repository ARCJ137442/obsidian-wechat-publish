export type LocalImageResolver = (
	decodedSource: string,
) => Promise<string | null> | string | null;

/** Replace local image sources with the non-Base64 placeholders used by Copy. */
export function replaceImagesWithPlaceholders(html: string): string {
	const parser = new DOMParser();
	const doc = parser.parseFromString(html, "text/html");
	const images = doc.getElementsByTagName("img");
	for (let i = images.length - 1; i >= 0; i--) {
		const img = images[i];
		if (!img) continue;
		const src = img.getAttribute("src") || "";
		if (src.startsWith("http")) continue;
		const alt = img.getAttribute("alt") || "图片";
		const placeholder = doc.createElement("p");
		placeholder.setAttribute(
			"style",
			"text-align:center;color:#999;font-size:14px;margin:16px 0",
		);
		placeholder.textContent = `【图片：${decodeURIComponent(src) || alt}】`;
		img.replaceWith(placeholder);
	}
	return doc.body.innerHTML || doc.documentElement.innerHTML;
}

/** Resolve local image sources for Preview without knowing how the file is read. */
export async function replaceLocalImageSources(
	html: string,
	resolveImage: LocalImageResolver,
): Promise<string> {
	const parser = new DOMParser();
	const doc = parser.parseFromString(html, "text/html");
	const images = doc.getElementsByTagName("img");
	const tasks: Promise<void>[] = [];

	for (let i = 0; i < images.length; i++) {
		const img = images[i];
		const src = img?.getAttribute("src");
		if (!img || !src || src.startsWith("http") || src.startsWith("data:")) {
			continue;
		}

		const task = (async () => {
			try {
				const replacement = await resolveImage(decodeURIComponent(src));
				if (replacement) img.setAttribute("src", replacement);
			} catch (error) {
				console.error("图片转换失败:", src, error);
			}
		})();
		tasks.push(task);
	}

	await Promise.all(tasks);
	return doc.body.innerHTML || doc.documentElement.innerHTML;
}
