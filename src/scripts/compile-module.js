#!/usr/bin/env node

'use strict';

// Allow for "root" await calls
(async () => {
	// Import dependencies
	const fs = require(`fs-extra`);
	const bytenode = require(`bytenode`);
	const paths = require(`./paths`);

	// Create or empty the dist directory for module output
	await fs.emptyDir(paths.module.dist);

	// Copy the build assets to the dist directory
	await fs.copy(paths.module.buildAssetsSrc, paths.module.buildAssetsDest);

	// copy eyas assets to the dist directory
	await fs.copy(paths.module.eyasAssetsSrc, paths.module.eyasAssetsDest);

	// set a home for the CLI output
	await fs.emptyDir(paths.module.cliDest);

	// Compile the CLI
	bytenode.compileFile({
		createLoader: true,
		loaderFilename: `%.js`,
		filename: paths.module.cliSrcFile,
		output: paths.module.cliDestFile
	});
})();
