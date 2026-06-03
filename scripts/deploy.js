#!/usr/bin/env node
/**
 * deploy.js — Build and deploy plugin to Obsidian vault.
 *
 * Usage:
 *   npm run deploy -- <vault-path>
 *   npm run deploy -- H:/MyVault
 *   npm run deploy                        # defaults to life-series vault
 *
 * The vault path should be the root of the Obsidian vault (contains .obsidian/).
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const vaultPath = process.argv[2];

if (!vaultPath) {
	console.error('Usage: npm run deploy -- <vault-root>');
	console.error('Example: npm run deploy -- H:/MyVault');
	process.exit(1);
}

const pluginDir = path.join(vaultPath, '.obsidian', 'plugins', 'obsidian-wechat-publish');

// Validate
if (!fs.existsSync(path.join(vaultPath, '.obsidian'))) {
	console.error(`Error: ${vaultPath} does not appear to be an Obsidian vault (no .obsidian/ directory).`);
	process.exit(1);
}

// Build
console.log('Building...');
execSync('npm run build', { stdio: 'inherit', cwd: __dirname + '/..' });

// Deploy
fs.mkdirSync(pluginDir, { recursive: true });
for (const file of ['main.js', 'manifest.json', 'styles.css', 'mathjax-svg.js']) {
	fs.copyFileSync(path.join(__dirname, '..', file), path.join(pluginDir, file));
	console.log(`  ${file} → ${pluginDir}`);
}

console.log(`\nDeployed to ${pluginDir}`);
console.log('Reload Obsidian to use the updated plugin.');
