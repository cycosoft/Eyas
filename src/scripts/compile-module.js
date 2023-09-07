#!/usr/bin/env node

'use strict';

// setup paths
const path = require(`path`);
const roots = require(`./get-roots`);
const names = {
	buildAssets: `build-assets`,
	eyasAssets: `eyas-assets`,
	cli: `cli`,
	scripts: `scripts`
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
	scriptsSrc: path.join(roots.src, names.scripts),
	scriptsDest: path.join(roots.dist, names.scripts)
};

// Allow for "root" await calls
(async () => {
	// Import dependencies
	const fs = require(`fs-extra`);
	const bytenode = require(`bytenode`);

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
