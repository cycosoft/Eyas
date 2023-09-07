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
	await fs.copy(paths.scriptsSrc, paths.scriptsDest);

	// Compile the CLI
	await fs.emptyDir(paths.cliDest);
	await bytenode.compileFile({
		loaderFilename: `%.js`,
		filename: paths.cliSrcFile,
		output: paths.cliDestFile
	});
})();
