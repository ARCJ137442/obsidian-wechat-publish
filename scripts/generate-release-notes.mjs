import { execFileSync } from "node:child_process";
import fs from "node:fs";

const releaseTag = process.argv[2] || process.env.RELEASE_TAG;
const outputPath = process.argv[3] || "release-notes.md";
const repository = process.env.GITHUB_REPOSITORY || "ARCJ137442/obsidian-wechat-publish";

if (!releaseTag) {
	throw new Error("Usage: node scripts/generate-release-notes.mjs <tag> [output-path]");
}

function git(args) {
	return execFileSync("git", args, { encoding: "utf8" }).trim();
}

const tags = git(["tag", "--sort=-version:refname"])
	.split(/\r?\n/)
	.filter((tag) => /^v\d+\.\d+\.\d+$/.test(tag));
const currentIndex = tags.indexOf(releaseTag);
const previousTag = currentIndex >= 0 ? tags[currentIndex + 1] : undefined;
const range = previousTag ? `${previousTag}..${releaseTag}` : releaseTag;
const format = "%H%x1f%s%x1f%an";
const rawCommits = git(["log", "--no-merges", `--format=${format}`, range]);
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

fs.writeFileSync(outputPath, lines.join("\n"));
console.log(`Generated ${outputPath}: ${commits.length} commits (${comparison})`);
