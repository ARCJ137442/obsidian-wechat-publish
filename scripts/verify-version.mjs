import fs from "node:fs";
import process from "node:process";

const expectedVersion = process.argv[2] || process.env.RELEASE_VERSION;
const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
const manifest = JSON.parse(fs.readFileSync("manifest.json", "utf8"));
const versions = JSON.parse(fs.readFileSync("versions.json", "utf8"));
const readme = fs.readFileSync("README.md", "utf8");
const spec = fs.readFileSync("docs/wechat-publish-spec.md", "utf8");

const version = packageJson.version;
const checks = [
	["package.json", packageJson.version],
	["manifest.json", manifest.version],
	["README.md badge", readme.match(/badge\/version-([^ -]+)-blue/)?.[1]],
	["publish spec", spec.match(/版本: ([^ |]+)/)?.[1]],
];

for (const [source, actual] of checks) {
	if (actual !== version) {
		throw new Error(`${source} has version ${actual ?? "<missing>"}; expected ${version}`);
	}
}

if (versions[version] === undefined) {
	throw new Error(`versions.json has no entry for ${version}`);
}

if (expectedVersion && expectedVersion !== version) {
	throw new Error(`release tag expects ${expectedVersion}, but package.json is ${version}`);
}

console.log(`Version check passed: ${version}`);
