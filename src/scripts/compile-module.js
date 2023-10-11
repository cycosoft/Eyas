#!/usr/bin/env node

'use strict';

// Import dependencies
const fs = require(`fs-extra`);
const bytenode = require(`bytenode`);

// setup paths
const path = require(`path`);
const roots = require(`./get-roots`);
const names = {
	buildAssets: `build-assets`,
	eyasAssets: `eyas-assets`,
	eyasInterfaceApp: `eyas-interface`,
	cli: `cli`
};
const paths = {
	dist: roots.dist,
	buildAssetsSrc: path.join(roots.src, names.buildAssets),
	buildAssetsDest: path.join(roots.dist, names.buildAssets),
	cliDest: path.join(roots.dist, names.cli),
	cliSrcFile: path.join(roots.src, names.cli, `index.js`),
	cliDestFile: path.join(roots.dist, names.cli, `index.jsc`),
	eyasAssetsSrc: path.join(roots.src, names.eyasAssets),
	eyasAssetsDest: path.join(roots.dist, names.eyasAssets),
	eyasInterfaceAppSrc: path.join(roots.src, names.eyasInterfaceApp, `app`, `dist`),
	eyasInterfaceAppDest: path.join(roots.dist, names.eyasInterfaceApp),
	packageJsonModule: path.join(roots.module, `package.json`),
	packageJsonDist: path.join(roots.dist, names.buildAssets, `package.json`)
};

// Allow for "root" await calls
(async () => {
	// Prep the dist/ directory for module output
	await fs.emptyDir(paths.dist);

	// Copy runtime files
	await fs.copy(paths.eyasAssetsSrc, paths.eyasAssetsDest);
	await fs.copy(paths.buildAssetsSrc, paths.buildAssetsDest);
	await fs.copy(paths.eyasInterfaceAppSrc, paths.eyasInterfaceAppDest);

	// set the npm and node dependency version numbers based on package.json
	await updateRunnerVersions();

	// Update the package.json version numbers
	await updatePackageJsonValues();

	// Compile the CLI
	await fs.emptyDir(paths.cliDest);
	await bytenode.compileFile({
		loaderFilename: `%.js`,
		filename: paths.cliSrcFile,
		output: paths.cliDestFile
	});
})();

// set the npm and node dependency version numbers for each runner
async function updateRunnerVersions() {
	// read the package.json
	const semver = require(`semver`);
	const packageJson = require(paths.packageJsonModule);
	const nodeVersion = semver.clean(packageJson.devDependencies.node);
	const npmVersion = semver.clean(packageJson.devDependencies.npm);
	const runners = [`winRunner.cmd`, `macRunner.command`, `linuxRunner.sh`];
	console.log({nodeVersion, npmVersion});

	// for each runner
	for (const filename of runners) {
		// read the contents of the runner
		let script = fs.readFileSync(path.join(paths.buildAssetsDest, filename), `utf8`);

		// modify the nodeVersion variable
		script = script
			.replace(/nodeVersion=0.0.0/, `nodeVersion=${nodeVersion}`)
			.replace(/npmVersion=0.0.0/, `npmVersion=${npmVersion}`);

		console.log(script);

		// set the npm and node dependency version numbers
		// packageJsonRunner.dependencies.npm = packageJson.dependencies.npm;
		// packageJsonRunner.dependencies.node = packageJson.dependencies.node;

		// // save the updated package.json
		// await fs.outputFile(path.join(roots.dist, names[runner], `package.json`), JSON.stringify(packageJsonRunner));
	}
}

// update all the versions in the distributed package.json from the module package.json
async function updatePackageJsonValues() {
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