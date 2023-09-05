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

// file and folder names
const names = {
	files: {
		eyasrcJs: `.eyasrc.js`,
		cliJs: `index.js`,
		cliJsc: `index.jsc`,
		getConfigJs: `get-config.js`,
		packageJson: `package.json`,
		eyasLogo: `eyas-logo.png`
	},

	folders: {
		buildAssets: `build-assets`,
		eyasAssets: `eyas-assets`,
		cli: `cli`,
		eyas: `eyas`,
		scripts: `scripts`,
		test: `test`
	}
};

// base paths
const roots = {
	dist: path.join(moduleRoot, `dist`),
	src: path.join(moduleRoot, `src`),
	eyasBuild: path.join(consumerRoot, `.eyas-build`),
	eyasDist: path.join(consumerRoot, `.eyas-dist`)
};

// object to be exported
const paths = {
	module: {
		dist: roots.dist,
		buildAssetsSrc: path.join(roots.src, names.folders.buildAssets),
		buildAssetsDest: path.join(roots.dist, names.folders.buildAssets),
		eyasAssetsSrc: path.join(roots.src, names.folders.eyasAssets),
		eyasAssetsDest: path.join(roots.dist, names.folders.eyasAssets),
		cliDest: path.join(roots.dist, names.folders.cli),
		cliSrcFile: path.join(roots.src, names.folders.cli, names.files.cliJs),
		cliDestFile: path.join(roots.dist, names.folders.cli, names.files.cliJsc)
	},

	cli: {
		build: roots.eyasBuild,
		dist: roots.eyasDist,
		eyasSrc: path.join(roots.dist, names.folders.eyas),
		eyasDest: roots.eyasBuild,
		getConfigScript: path.join(roots.src, names.folders.scripts, names.files.getConfigJs),
		configDest: path.join(roots.eyasBuild, names.files.eyasrcJs),
		testDest: path.join(roots.eyasBuild, names.folders.test),
		eyasAssetsSrc: path.join(roots.dist, names.folders.eyasAssets),
		eyasAssetsDest: path.join(roots.eyasBuild, names.folders.eyasAssets),
		packageJsonSrc: path.join(roots.dist, names.folders.buildAssets, names.files.packageJson),
		packageJsonDest: path.join(roots.eyasBuild, names.files.packageJson)
	},

	config: {
		source: path.join(consumerRoot, names.files.eyasrcJs)
	},

	eyas: {
		config: path.join(consumerRoot, names.files.eyasrcJs),
		icon: path.join(roots.src, names.folders.eyasAssets, names.files.eyasLogo),
		testSrc: path.join(roots.src, names.folders.test)
	}
};

// export the config for the project
module.exports = paths;
