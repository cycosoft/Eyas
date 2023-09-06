#!/usr/bin/env node

'use strict';

// Allow for "root" await calls
(async () => {
	// Import dependencies
	const fs = require(`fs-extra`);
	const bytenode = require(`bytenode`);
	const { module: paths } = require(`./paths`);

	// Create or empty the dist directory for module output
	await fs.emptyDir(paths.dist);

	// Copy over files and folders from their sources to the dist directory
	await fs.copy(paths.buildAssetsSrc, paths.buildAssetsDest);
	await fs.copy(paths.eyasAssetsSrc, paths.eyasAssetsDest);
	await fs.copy(paths.configLoaderSrc, paths.configLoaderDest);
	await fs.copy(paths.pathsSrc, paths.pathsDest);

	// set a home for the CLI output
	await fs.emptyDir(paths.cliDest);

	// Compile the CLI
	await bytenode.compileFile({
		loaderFilename: `%.js`,
		filename: paths.cliSrcFile,
		output: paths.cliDestFile
	});
})();
