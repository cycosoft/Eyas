#!/usr/bin/env node

'use strict';

const fs = require(`fs-extra`);
const path = require(`path`);
const { getBuildVersion } = require(`./get-build-version.js`);

/**
 * Updates the version in the specified package.json and outputs tagging instructions.
 * @param {string} [packageJsonPath] - Optional path to package.json; defaults to the one in CWD.
 * @returns {Promise<string>} The new version.
 */
async function bumpBuildVersion(packageJsonPath = path.join(process.cwd(), `package.json`)) {
	const packageJson = await fs.readJson(packageJsonPath);

	// Generate the new version
	const newVersion = getBuildVersion();
	packageJson.version = newVersion;

	// Write back to package.json
	await fs.writeJson(packageJsonPath, packageJson, { spaces: 2 });

	// Output instructions
	console.log(`\n✅ Version updated to: ${newVersion}`);
	console.log(`\nTo tag this version, run:`);
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
