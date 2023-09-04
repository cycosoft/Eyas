#!/usr/bin/env node

'use strict';

// Allow for "root" await calls
(async () => {
	// Import dependencies
	const fs = require(`fs-extra`);
	const bytenode = require(`bytenode`);
	const paths = require(`./paths`);

	// Create or empty the dist directory for module output
	await fs.emptyDir(paths.folders.moduleDist);

	// Copy the build assets to the dist directory
	await fs.copy(paths.folders.buildAssetsSrc, paths.folders.buildAssetsDest);

	// copy eyas assets to the dist directory
	await fs.copy(paths.folders.eyasAssetsSrc, paths.folders.eyasAssetsDest);

	// set a home for the CLI output
	await fs.emptyDir(paths.folders.cliDest);

	// Compile the CLI
	bytenode.compileFile({
		createLoader: true,
		loaderFilename: `%.js`,
		filename: paths.files.cliSrc,
		output: paths.files.cliDest
	});
})();
