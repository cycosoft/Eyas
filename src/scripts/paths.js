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

// const names = {
// 	eyasBuild: `.eyas-build`,
// 	eyasDist: `.eyas-dist`,
// 	eyasAssets: `eyas-assets`,
// 	buildAssets: `build-assets`,
// 	eyasPackage: `package.json`,
// 	userEyasConfig: `.eyasrc.js`,
// 	userSource: `user`
// };
// const pathsd = {
// 	eyasBuild: path.join(consumerRoot, names.eyasBuild),
// 	eyasDist: path.join(consumerRoot, names.eyasDist),
// 	assetsFrom: path.join(moduleRoot, `src`, names.eyasAssets),
// 	assetsTo: path.join(consumerRoot, names.eyasBuild, names.eyasAssets),
// 	eyasRunnerSource: path.join(moduleRoot, `dist`, `eyas`),
// 	eyasRunner: path.join(consumerRoot, names.eyasBuild, `index.js`),
// 	userSourceTo: path.join(consumerRoot, names.eyasBuild, names.userSource),
// 	eyasPackageJsonFrom: path.join(moduleRoot, `dist`, names.eyasPackage),
// 	eyasPackageJsonTo: path.join(consumerRoot, names.eyasBuild, names.eyasPackage),
// 	userConfigFrom: path.join(consumerRoot, names.userEyasConfig),
// 	userConfigTo: path.join(consumerRoot, names.eyasBuild, names.userEyasConfig),
// 	getConfigScript: path.join(moduleRoot, `src`, `scripts`, `get-config.js`)
// };

const rootFolders = {
	src: path.join(moduleRoot, `src`),
	moduleDist: path.join(moduleRoot, `dist`),
	build: path.join(consumerRoot, `.eyas-build`),
	eyasDist: path.join(consumerRoot, `.eyas-dist`)
};

const folders = {
	...rootFolders,
	buildAssetsSrc: path.join(moduleRoot, `src`, `build-assets`),
	buildAssetsDest: path.join(moduleRoot, `dist`, `build-assets`),
	cliSrc: path.join(moduleRoot, `src`, `cli`),
	cliDest: path.join(moduleRoot, `dist`, `cli`),
	eyasAssetsSrc: path.join(moduleRoot, `src`, `eyas-assets`),
	eyasAssetsDest: path.join(moduleRoot, `dist`, `eyas-assets`),
	eyasRunnerSrc: path.join(moduleRoot, `dist`, `eyas`),
	eyasRunnerDest: path.join(consumerRoot, `.eyas-build`, `eyas`)
};

const files = {
	eyasConfig: path.join(consumerRoot, `.eyasrc.js`),
	cliSrc: path.join(folders.cliSrc, `index.js`),
	cliDest: path.join(folders.cliDest, `index.jsc`)
};

const scripts = {
	getConfigSrc: path.join(moduleRoot, `src`, `scripts`, `get-config.js`),
	getConfigDest: path.join(moduleRoot, `get-config.jsc`)
};

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
		eyasSrc: path.join(moduleRoot, `dist`, `eyas`),
		eyasDest: path.join(consumerRoot, `.eyas-build`, `eyas`),
		getConfigScript: path.join(moduleRoot, `src`, `scripts`, `get-config.js`),
		configDest: path.join(consumerRoot, `.eyas-build`, `.eyasrc.js`)
	},

	config: {
		source: path.join(consumerRoot, `.eyasrc.js`)
	},

	eyas: {}
};

console.log({paths});

// export the config for the project
module.exports = paths;
