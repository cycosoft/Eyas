/* global __dirname, process */

'use strict';

// imports
const path = require(`path`);

// setup
console.log({__dirname});
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

const folders = {
	consumerRoot, // : `/`,
	moduleRoot, // : `/ || /node_modules/@cycosoft/eyas`,
	moduleDist: path.join(moduleRoot, `.dist`), // `./dist`,
	eyasBuild: `./.eyas-build`,
	eyasDist: `./.eyas-dist`,
	eyasBuildAssets: `eyas-assets`,
	buildAssetsSrc: `./src/build-assets`,
	buildAssetsDest: `./.eyas-build/build-assets`,
	cliSrc: `./src/cli`,
	cliDest: `./dist/cli`,
	eyasAssetsSrc: `./src/eyas-assets`,
	eyasAssetsDest: `./dist/eyas-assets`,
};

const files = {
	userEyasConfig: `./.eyasrc.js`,
	cliUncompiled: `./src/cli/index.js`,
	cliCompiled: `./dist/cli/index.jsc`,
};

const scripts = {
	getConfig: `./src/scripts/get-config.js`,
};

// object to be exported
const paths = {
	files,
	folders,
	scripts
};

console.log({paths});

// export the config for the project
module.exports = paths;
