#!/usr/bin/env node

'use strict';

// Allow for "root" await calls
(async () => {
	// Import dependencies
	const fs = require(`fs-extra`);
	const bytenode = require(`bytenode`);
	const paths = require(`./paths`);

	// Create or empty the dist directory for module output
	await fs.emptyDir(paths.folders.eyasDist);

	// Copy the build assets to the dist directory
	await fs.copy(paths.folders.buildAssetsSrc, paths.folders.buildAssetsDest);

	// copy eyas assets to the dist directory
	await fs.copy(paths.folders.eyasAssetsSrc, paths.folders.eyasAssetsDest);

	// Compile the CLI
	bytenode.compileFile({
		createLoader: true,
		loaderFilename: `%.js`,
		filename: paths.files.cliUncompiled,
		output: paths.files.cliCompiled
	});
})();
