/* global __dirname, process */

'use strict';

// imports
const path = require(`path`);

// setup
const isProd = __dirname.includes(`node_modules`);
const consumerRoot = process.cwd();
const moduleRoot = isProd
	? path.join(consumerRoot, `node_modules`, `@cycosoft`, `eyas`)
	: consumerRoot;

// object to be exported
const paths = {
	module: {
		dist: path.join(moduleRoot, `dist`),
		buildAssetsSrc: path.join(moduleRoot, `src`, `build-assets`),
		buildAssetsDest: path.join(moduleRoot, `dist`, `build-assets`),
		eyasAssetsSrc: path.join(moduleRoot, `src`, `eyas-assets`),
		eyasAssetsDest: path.join(moduleRoot, `dist`, `eyas-assets`),
		cliDest: path.join(moduleRoot, `dist`, `cli`),
		cliSrcFile: path.join(moduleRoot, `src`, `cli`, `index.js`),
		cliDestFile: path.join(moduleRoot, `dist`, `cli`, `index.jsc`)
	},

	cli: {
		build: path.join(consumerRoot, `.eyas-build`),
		dist: path.join(consumerRoot, `.eyas-dist`),
		eyasSrc: path.join(moduleRoot, `dist`, `eyas`),
		eyasDest: path.join(consumerRoot, `.eyas-build`),
		getConfigScript: path.join(moduleRoot, `src`, `scripts`, `get-config.js`),
		configDest: path.join(consumerRoot, `.eyas-build`, `.eyasrc.js`),
		testDest: path.join(consumerRoot, `.eyas-build`, `test`),
		eyasAssetsSrc: path.join(moduleRoot, `dist`, `eyas-assets`),
		eyasAssetsDest: path.join(consumerRoot, `.eyas-build`, `eyas-assets`),
		packageJsonSrc: path.join(moduleRoot, `dist`, `build-assets`, `package.json`),
		packageJsonDest: path.join(consumerRoot, `.eyas-build`, `package.json`)
	},

	config: {
		source: path.join(consumerRoot, `.eyasrc.js`)
	},

	eyas: {}
};

// export the config for the project
module.exports = paths;
