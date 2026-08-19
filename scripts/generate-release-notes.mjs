import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

function git(args, cwd) {
	return execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
}

function getCommitNotes(releaseTag, repository, cwd) {
	const tags = git(["tag", "--sort=-version:refname"], cwd)
		.split(/\r?\n/)
		.filter((tag) => /^v\d+\.\d+\.\d+$/.test(tag));
	const currentIndex = tags.indexOf(releaseTag);
	const previousTag = currentIndex >= 0 ? tags[currentIndex + 1] : undefined;
	const range = previousTag ? `${previousTag}..${releaseTag}` : releaseTag;
	const format = "%H%x1f%s%x1f%an";
	const rawCommits = git(["log", "--no-merges", `--format=${format}`, range], cwd);
	const commits = rawCommits
		? rawCommits.split(/\r?\n/).map((line) => {
				const [sha, subject, author] = line.split("\x1f");
				return { sha, subject, author };
			})
		: [];

	const comparison = previousTag
		? `自 ${previousTag} 至 ${releaseTag}`
		: `${releaseTag} 的首个版本历史`;
	const comparisonUrl = previousTag
		? `https://github.com/${repository}/compare/${previousTag}...${releaseTag}`
		: `https://github.com/${repository}/commits/${releaseTag}`;
	const lines = [
		`# ${releaseTag}`,
		"",
		`> ${comparison}自动生成。`,
		"",
		"## 提交记录",
		"",
		...commits.map(
			({ sha, subject, author }) =>
				`- [\`${sha.slice(0, 7)}\`](https://github.com/${repository}/commit/${sha}) ${subject} — ${author}`,
		),
		"",
		`完整变更记录：[${previousTag ? `${previousTag}...${releaseTag}` : releaseTag}](${comparisonUrl})`,
		"",
	];

	return { body: lines.join("\n"), comparison, count: commits.length };
}

function getReleaseDocument(releaseTag, cwd) {
	const documentPath = path.resolve(cwd, "docs", "releases", `${releaseTag}.md`);
	if (!fs.existsSync(documentPath)) {
		return undefined;
	}
	if (!fs.statSync(documentPath).isFile()) {
		throw new Error(`Release document path is not a file: ${documentPath}`);
	}

	const body = fs.readFileSync(documentPath, "utf8");
	if (!body.trim()) {
		throw new Error(`Release document is empty: ${documentPath}`);
	}

	return { body, documentPath };
}

export function generateReleaseNotes({
	releaseTag,
	outputPath = "release-notes.md",
	repository = "ARCJ137442/obsidian-wechat-publish",
	cwd = process.cwd(),
} = {}) {
	if (!releaseTag || !/^v\d+\.\d+\.\d+$/.test(releaseTag)) {
		throw new Error("Usage: node scripts/generate-release-notes.mjs <tag> [output-path]");
	}

	const releaseDocument = getReleaseDocument(releaseTag, cwd);
	if (releaseDocument) {
		const body = releaseDocument.body.endsWith("\n") ? releaseDocument.body : `${releaseDocument.body}\n`;
		fs.writeFileSync(path.resolve(cwd, outputPath), body);
		return {
			source: "document",
			path: releaseDocument.documentPath,
		};
	}

	const commitNotes = getCommitNotes(releaseTag, repository, cwd);
	fs.writeFileSync(path.resolve(cwd, outputPath), `${commitNotes.body}\n`);
	return {
		source: "commits",
		comparison: commitNotes.comparison,
		count: commitNotes.count,
	};
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
	const releaseTag = process.argv[2] || process.env.RELEASE_TAG;
	const outputPath = process.argv[3] || "release-notes.md";
	const result = generateReleaseNotes({
		releaseTag,
		outputPath,
		repository: process.env.GITHUB_REPOSITORY || "ARCJ137442/obsidian-wechat-publish",
	});

	if (result.source === "document") {
		console.log(`Copied release document ${result.path} to ${outputPath}`);
	} else {
		console.log(`Generated ${outputPath}: ${result.count} commits (${result.comparison})`);
	}
}
