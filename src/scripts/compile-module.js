#!/usr/bin/env node

'use strict';

// Import dependencies
const fs = require(`fs-extra`);

// setup paths
const path = require(`path`);
const roots = require(`./get-roots`);
const names = {
	buildAssets: `build-assets`,
	eyasAssets: `eyas-assets`,
	eyasInterfaceApp: `eyas-interface`,
	packageJson: `package.json`,
	cli: `cli`
};
const paths = {
	dist: roots.dist,
	buildAssetsSrc: path.join(roots.src, names.buildAssets, names.packageJson),
	buildAssetsDest: path.join(roots.moduleBuild, names.packageJson),
	cliDest: path.join(roots.dist, names.cli),
	cliSrcFile: path.join(roots.src, names.cli, `index.js`),
	cliDestFile: path.join(roots.dist, names.cli, `index.js`),
	eyasCoreSrc: path.join(roots.preBuild, `eyas-core/index.js`),
	eyasCoreDest: path.join(roots.moduleBuild, `index.js`),
	eyasAssetsSrc: path.join(roots.src, names.eyasAssets),
	eyasAssetsDest: path.join(roots.moduleBuild, names.eyasAssets),
	eyasInterfaceAppSrc: path.join(roots.preBuild, names.eyasInterfaceApp),
	eyasInterfaceAppDest: path.join(roots.moduleBuild, names.eyasInterfaceApp),
	packageJsonModule: path.join(roots.module, names.packageJson),
	packageJsonDist: path.join(roots.moduleBuild, names.packageJson),
	scriptsSrc: path.join(roots.preBuild, `scripts`),
	scriptsBuild: path.join(roots.moduleBuild, `scripts`),
	scriptsDist: path.join(roots.dist, `scripts`)
};

// Allow for "root" await calls
(async () => {
	// Prep the .build/ & dist/ directories for module output
	await fs.emptyDir(roots.moduleBuild);
	await fs.emptyDir(roots.dist);

	// Copy runtime files
	await fs.copy(paths.eyasAssetsSrc, paths.eyasAssetsDest);
	await fs.copy(paths.buildAssetsSrc, paths.buildAssetsDest);
	await fs.copy(paths.eyasInterfaceAppSrc, paths.eyasInterfaceAppDest);
	await fs.copy(paths.eyasCoreSrc, paths.eyasCoreDest);
	await fs.copy(paths.scriptsSrc, paths.scriptsBuild);

	await fs.copy(
		path.join(paths.scriptsSrc, `get-config.js`),
		path.join(paths.scriptsDist, `get-config.js`)
	);

	await fs.copy(
		path.join(paths.scriptsSrc, `get-roots.js`),
		path.join(paths.scriptsDist, `get-roots.js`)
	);

	// remove the prebuild folder
	console.log(`clean up: removing ${roots.preBuild}`);
	await fs.remove(roots.preBuild);

	// Update the package.json version numbers
	await updatePackageJsonValues();

	// Copy the CLI
	console.log(`copying ${paths.cliSrcFile}`);
	await fs.copy(paths.cliSrcFile, paths.cliDestFile);
	console.log(`🎉 complete`);
})();

// update all the versions in the distributed package.json from the module package.json
async function updatePackageJsonValues() {
	console.log(`🕜 updatePackageJsonValues()`);
	// read both package.json
	const packageJsonModule = require(paths.packageJsonModule);
	const packageJsonDist = require(paths.packageJsonDist);

	// for each key in the dist/package.json
	for (const key in packageJsonDist) {
		// skip if not a property of the object
		if (!Object.hasOwnProperty.call(packageJsonDist, key)) { continue; }

		// skip overwriting "scripts", and keep the dist/package.json scripts
		if (key === `scripts`) { continue; }

		// if the value is an object
		if (typeof packageJsonDist[key] === `object`) {
			// loop through each property
			for (const prop in packageJsonDist[key]) {
				// skip if not a property of the object
				if (!Object.hasOwnProperty.call(packageJsonDist[key], prop)) { continue; }

				// copy the value for each matching key from the module/package.json
				packageJsonDist[key][prop] = packageJsonModule[key][prop];
			}

			// skip to the next key
			continue;
		}

		// copy the value for each matching key from the module/package.json
		packageJsonDist[key] = packageJsonModule[key];
	}

	// electron-builder requires `electron` to be a devDependency. Copy version from source.
	packageJsonDist.devDependencies.electron = packageJsonModule.dependencies.electron;

	// save the updated dist/package.json
	await fs.outputFile(paths.packageJsonDist, JSON.stringify(packageJsonDist));
}