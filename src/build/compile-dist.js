#!/usr/bin/env node

/* global process */

'use strict';

// Allow for "root" await calls
(async () => {
	// Import dependencies
	const path = require(`path`);
	const fs = require(`fs-extra`);
	const bytenode = require(`bytenode`);

	// Setup
	const packageJson = `package.json`;
	const root = process.cwd();
	const src = path.join(root, `src`);
	const dist = path.join(root, `dist`);
	const packageFrom = path.join(src, `build`, packageJson);
	const packageTo = path.join(dist, packageJson);

	// Create or empty the dist directory for module output
	await fs.emptyDir(dist);

	// Copy the electron-build package.json to the dist directory
	fs.copy(packageFrom, packageTo);

	// Compile the CLI with options
	bytenode.compileFile({
		createLoader: true,
		loaderFilename: `%.js`,
		filename: path.join(src, `cli`, `index.js`),
		output: path.join(dist, `cli.jsc`)
	});
})();
