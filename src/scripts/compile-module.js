#!/usr/bin/env node

'use strict';

// Allow for "root" await calls
(async () => {
	// Import dependencies
	const fs = require(`fs-extra`);
	const bytenode = require(`bytenode`);
	const { module: paths } = require(`./paths`);

	// Prep the dist/ directory for module output
	await fs.emptyDir(paths.dist);

	// Copy asset directories
	await fs.copy(paths.buildAssetsSrc, paths.buildAssetsDest);
	await fs.copy(paths.eyasAssetsSrc, paths.eyasAssetsDest);

	// Prep the scripts/ directory
	await fs.emptyDir(paths.scriptsDest);

	// Compile the paths script
	await bytenode.compileFile({
		loaderFilename: `%.js`,
		filename: paths.pathsSrc,
		output: paths.pathsDest
	});

	// Compile the get-config script
	await bytenode.compileFile({
		loaderFilename: `%.js`,
		filename: paths.configLoaderSrc,
		output: paths.configLoaderDest
	});

	const result = require(paths.configLoaderDest);
	// prints: Hello World!
	console.log(result);

	// Compile the CLI
	await fs.emptyDir(paths.cliDest);
	await bytenode.compileFile({
		loaderFilename: `%.js`,
		filename: paths.cliSrcFile,
		output: paths.cliDestFile
	});
})();
