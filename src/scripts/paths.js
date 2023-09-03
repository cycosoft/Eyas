'use strict';

// imports
const path = require(`path`);

// setup
console.log({__dirname});
const isProd = __dirname.includes(`node_modules`);
const consumerRoot = process.cwd();
const eyasRoot = isProd
	? path.join(consumerRoot, `node_modules`, `@cycosoft`, `eyas`)
	: consumerRoot;
const names = {
	eyasBuild: `.eyas-build`,
	eyasDist: `.eyas-dist`,
	eyasAssets: `assets`,
	eyasPackage: `package.json`,
	userConfig: `.eyasrc.js`,
	userSource: `user`
};
const paths = {
	eyasBuild: path.join(consumerRoot, names.eyasBuild),
	eyasDist: path.join(consumerRoot, names.eyasDist),
	assetsFrom: path.join(eyasRoot, `src`, names.eyasAssets),
	assetsTo: path.join(consumerRoot, names.eyasBuild, names.eyasAssets),
	eyasRunnerSource: path.join(eyasRoot, `dist`, `eyas`),
	eyasRunner: path.join(consumerRoot, names.eyasBuild, `index.js`),
	userSourceTo: path.join(consumerRoot, names.eyasBuild, names.userSource),
	eyasPackageJsonFrom: path.join(eyasRoot, `dist`, names.eyasPackage),
	eyasPackageJsonTo: path.join(consumerRoot, names.eyasBuild, names.eyasPackage),
	userConfigFrom: path.join(consumerRoot, names.userConfig),
	userConfigTo: path.join(consumerRoot, names.eyasBuild, names.userConfig),
	getConfigScript: path.join(eyasRoot, `src`, `scripts`, `get-config.js`)
};

// object to be exported
const paths = {
	files: {},

	folders: {},

	scripts: {
		getConfig: ``
	}
};

// export the config for the project
module.exports = paths;
