/**
 * Quick Template Rename — fill template from frontmatter and rename file.
 * Command handler with Obsidian API dependencies.
 */
import { Notice, type App, type TFile } from "obsidian";
import { fillTemplate } from "./template-fill";

export async function renameFileSafely(
	app: App,
	file: TFile,
	newPath: string,
): Promise<void> {
	await app.fileManager.renameFile(file, newPath);
}

/**
 * Handle the "Quick Template Rename" command.
 * Reads title-full-template from frontmatter, fills with frontmatter values,
 * and renames the current file.
 */
export async function handleTemplateRename(
	file: TFile | null,
	parseFrontmatter: (text: string) => {
		meta: Record<string, string>;
		body: string;
	},
	readContent: (file: TFile) => Promise<string>,
	renameFile: (file: TFile, newPath: string) => Promise<void>,
): Promise<void> {
	if (!file) {
		new Notice("\u26a0\ufe0f 没有打开的文件");
		return;
	}

	if (file.extension !== "md") {
		new Notice("\u26a0\ufe0f 当前文件不是 Markdown 文件");
		return;
	}

	// Read file content and parse frontmatter
	const content = await readContent(file);
	const { meta } = parseFrontmatter(content);

	const template = meta["title-full-template"];
	if (!template) {
		new Notice("\u26a0\ufe0f 当前文件没有 title-full-template 字段");
		return;
	}

	// Fill template with frontmatter values
	const newTitle = fillTemplate(template, meta);

	// Check if template actually resolved (no leftover placeholders)
	if (/\{[^}]+\}/.test(newTitle)) {
		new Notice(
			`\u26a0\ufe0f 模板填充不完整：部分字段缺失\n${newTitle}`,
		);
		return;
	}

	const oldName = file.basename;
	if (newTitle === oldName) {
		new Notice("\u2705 文件名已是最新，无需重命名");
		return;
	}

	// Build new path: same directory, new basename + .md
	const parentPath = file.parent ? file.parent.path : "";
	const newPath = parentPath ? `${parentPath}/${newTitle}.md` : `${newTitle}.md`;

	try {
		await renameFile(file, newPath);
		new Notice(`\u2705 已重命名：${oldName} \u2192 ${newTitle}`);
	} catch (error) {
		const msg = error instanceof Error ? error.message : String(error);
		new Notice(`\u274c 重命名失败：${msg}`);
	}
}
