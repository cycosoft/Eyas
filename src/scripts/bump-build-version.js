#!/usr/bin/env node

'use strict';

const fs = require(`fs-extra`);
const path = require(`path`);
const { execSync } = require(`child_process`);
const { getBuildVersion } = require(`./get-build-version.js`);

/**
 * Updates the version in the specified package.json and outputs tagging instructions.
 * @param {string} [packageJsonPath] - Optional path to package.json; defaults to the one in CWD.
 * @returns {Promise<string>} The new version.
 */
async function bumpBuildVersion(
	packageJsonPath = path.join(process.cwd(), `package.json`),
	changelogPath = path.join(process.cwd(), `src`, `eyas-interface`, `app`, `src`, `CHANGELOG.json`)
) {
	const packageJson = await fs.readJson(packageJsonPath);

	// Generate the new version
	const newVersion = getBuildVersion();
	packageJson.version = newVersion;

	// Write back to package.json
	await fs.writeJson(packageJsonPath, packageJson, { spaces: 2 });

	// Update CHANGELOG.json
	if (await fs.pathExists(changelogPath)) {
		const changelogText = await fs.readFile(changelogPath, `utf8`);
		const updatedText = changelogText.replace(/"version":\s*"[^"]*"/, `"version": "${newVersion}"`);
		await fs.writeFile(changelogPath, updatedText);
	}

	// Output instructions
	console.log(`\n✅ Version updated to: ${newVersion}`);

	// Output GitHub Release format
	if (await fs.pathExists(changelogPath)) {
		try {
			const changelog = await fs.readJson(changelogPath);
			const current = changelog[0];

			// Determine the previous version from git tags
			let previousVersion = ``;
			try {
				previousVersion = execSync(`git describe --tags --abbrev=0`, { encoding: `utf8` }).trim().replace(/^v/, ``);
			} catch (e) {
				// Fallback to changelog if git fails
				previousVersion = changelog[1] ? changelog[1].version : ``;
			}

			if (current && current.items) {
				console.log(`\n--- GitHub Release Body ---`);
				current.items.forEach(item => console.log(item.text));
				console.log(`\nCLI: \`npm i @cycosoft/eyas@latest --save-dev\` | [NPM](https://www.npmjs.com/package/@cycosoft/eyas)`);
				if (previousVersion) {
					console.log(`\n**Full Changelog**: https://github.com/cycosoft/Eyas/compare/v${previousVersion}...v${newVersion}`);
				}
				console.log(`---------------------------\n`);
			}
		} catch (e) {
			// Fail silently
		}
	}

	console.log(`To tag this version, run:`);
	console.log(`git tag -a v${newVersion} -m "v${newVersion}"\n`);

	return newVersion;
}

// Run if called directly
if (require.main === module) {
	(async () => {
		try {
			await bumpBuildVersion();
		} catch (err) {
			console.error(`❌ Error updating version:`, err.message);
			process.exit(1);
		}
	})();
}

module.exports = { bumpBuildVersion };
