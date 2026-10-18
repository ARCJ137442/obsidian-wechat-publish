export type LocalImageResolver = (
	decodedSource: string,
) => Promise<string | null> | string | null;

/**
 * Replace local image sources with the non-Base64 placeholders used by Copy.
 *
 * Obsidian image wikilinks are rendered as `<img alt="...">`. An empty alt
 * means `![[image.png]]`, while a non-empty alt is the caption from
 * `![[image.png|caption]]`. Copy keeps the source filename visible and puts
 * the optional caption on a second line so the filename can be copied without
 * losing the article's caption.
 */
export function replaceImagesWithPlaceholders(html: string): string {
	const parser = new DOMParser();
	const doc = parser.parseFromString(html, "text/html");
	const images = doc.getElementsByTagName("img");
	for (let i = images.length - 1; i >= 0; i--) {
		const img = images[i];
		if (!img) continue;
		const src = img.getAttribute("src") || "";
		if (src.startsWith("http")) continue;
		const alt = img.getAttribute("alt")?.trim() || "";
		const decodedSource = decodeImageSource(src);
		const filename = doc.createElement("strong");
		filename.setAttribute(
			"style",
			"color:#FF0000;font-weight:700;font-size:14px",
		);
		filename.textContent = `【图片：${decodedSource || "图片"}】`;

		// Keep the Markdown paragraph as the only block container. Replacing an
		// image with a <p> would create invalid nested paragraphs in Copy HTML.
		img.replaceWith(filename);
		if (alt) {
			const lineBreak = doc.createElement("br");
			const caption = doc.createElement("span");
			caption.setAttribute(
				"style",
				"color:#999;font-weight:400;font-size:14px",
			);
			caption.textContent = alt;
			filename.after(lineBreak, caption);
		}

		const parent = filename.parentElement;
		if (parent?.tagName === "P") {
			const style = parent.getAttribute("style") || "";
			const alignment =
				"text-align:center;color:#999;font-size:14px;margin:16px 0";
			if (!style.includes("text-align:center")) {
				parent.setAttribute("style", style ? `${style};${alignment}` : alignment);
			}
		}
	}
	return doc.body.innerHTML || doc.documentElement.innerHTML;
}

function decodeImageSource(src: string): string {
	if (!src) return "";
	try {
		return decodeURIComponent(src);
	} catch {
		// A malformed percent escape should not abort the whole copy operation.
		return src;
	}
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
				const replacement = await resolveImage(decodeImageSource(src));
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
