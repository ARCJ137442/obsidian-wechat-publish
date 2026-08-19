import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const scriptPath = path.resolve("scripts/generate-release-notes.mjs");
const temporaryDirectories: string[] = [];

function git(args: string[], cwd: string): string {
	return execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
}

function createRepository(): string {
	const repository = fs.mkdtempSync(path.join(os.tmpdir(), "wechat-release-notes-"));
	temporaryDirectories.push(repository);
	git(["init", "-b", "main"], repository);
	git(["config", "user.name", "Release Notes Test"], repository);
	git(["config", "user.email", "release-notes@example.invalid"], repository);
	fs.writeFileSync(path.join(repository, "README.md"), "initial\n");
	git(["add", "README.md"], repository);
	git(["commit", "-m", "initial commit"], repository);
	git(["tag", "v1.0.0"], repository);
	fs.writeFileSync(path.join(repository, "README.md"), "second\n");
	git(["commit", "-am", "second commit"], repository);
	git(["tag", "v1.1.0"], repository);
	return repository;
}

afterEach(() => {
	while (temporaryDirectories.length > 0) {
		fs.rmSync(temporaryDirectories.pop()!, { recursive: true, force: true });
	}
});

describe("generate-release-notes", () => {
	it("uses the matching release document as the complete body", async () => {
		const repository = createRepository();
		const documentDirectory = path.join(repository, "docs", "releases");
		fs.mkdirSync(documentDirectory, { recursive: true });
		const document = "# v1.1.0\n\n手动发布说明。\n";
		fs.writeFileSync(path.join(documentDirectory, "v1.1.0.md"), document);

		const { generateReleaseNotes } = await import(scriptPath);
		const result = generateReleaseNotes({
			releaseTag: "v1.1.0",
			outputPath: "generated.md",
			cwd: repository,
		});

		expect(result.source).toBe("document");
		expect(fs.readFileSync(path.join(repository, "generated.md"), "utf8")).toBe(document);
	});

	it("falls back to the commit record when no release document exists", async () => {
		const repository = createRepository();

		const { generateReleaseNotes } = await import(scriptPath);
		const result = generateReleaseNotes({
			releaseTag: "v1.1.0",
			outputPath: "generated.md",
			cwd: repository,
		});

		const generated = fs.readFileSync(path.join(repository, "generated.md"), "utf8");
		expect(result.source).toBe("commits");
		expect(result.count).toBe(1);
		expect(generated).toContain("## 提交记录");
		expect(generated).toContain("second commit");
		expect(generated).toContain("v1.0.0...v1.1.0");
	});
});
