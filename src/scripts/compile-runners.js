#!/usr/bin/env node

/* global process, __dirname */

'use strict';

const path = require(`path`);
const isProd = __dirname.includes(`node_modules`);
const consumerRoot = process.cwd();
const moduleRoot = isProd
	? path.join(consumerRoot, `node_modules`, `@cycosoft`, `eyas`)
	: consumerRoot;
const roots = require(path.join(moduleRoot, `dist`, `scripts`, `get-roots.js`));
const names = {
	linuxRunner: `linuxRunner.sh`,
	macRunner: `macRunner.command`,
	winRunner: `winRunner.cmd`,
	winDownloader: `getDependency.cmd`,
	packageJsonCore: `package.json`,
	packageJson: `package.json`,
	eyasAssets: `eyas-assets`,
	eyasInterface: `eyas-interface`,
	scripts: `scripts`
};
const paths = {
	dist: roots.eyasDist,
	build: roots.eyasBuild,
	configLoader: path.join(roots.dist, names.scripts, `get-config.js`),
	configDest: path.join(roots.eyasBuild, `.eyas.config.js`),
	eyasApp: path.join(roots.eyasBuild, `index.js`),
	eyasAssetsSrc: path.join(roots.dist, names.eyasAssets),
	eyasAssetsDest: path.join(roots.eyasBuild, names.eyasAssets),
	eyasInterfaceSrc: path.join(roots.dist, names.eyasInterface),
	eyasInterfaceDest: path.join(roots.eyasBuild, names.eyasInterface),
	eyasSrc: path.join(roots.dist, `eyas-core`),
	eyasDest: roots.eyasBuild,
	packageJsonCoreSrc: path.join(roots.dist, `build-assets`, names.packageJsonCore),
	packageJsonDest: path.join(roots.eyasBuild, names.packageJson),
	linuxRunnerSrc: path.join(roots.dist, `build-assets`, names.linuxRunner),
	macRunnerSrc: path.join(roots.dist, `build-assets`, names.macRunner),
	winRunnerSrc: path.join(roots.dist, `build-assets`, names.winRunner),
	winRunnerInstallerSrc: path.join(roots.dist, `build-assets`, names.winDownloader),
	scriptsSrc: path.join(roots.dist, names.scripts),
	scriptsDest: path.join(roots.eyasBuild, names.scripts),
	testDest: path.join(roots.eyasBuild, `test`),
	icon: path.join(roots.eyasBuild, `eyas-assets`, `eyas-logo.png`)
};

// Entry Point
(async () => {
	const builder = require(`electron-builder`);

	// load the user's config
	const config = require(paths.configLoader);

	// Determine the executables to build
	const targets = [];
	if(config.outputs.windows) { targets.push(builder.Platform.WINDOWS); }
	if(config.outputs.mac) { targets.push(builder.Platform.MAC); }
	if(config.outputs.linux) { targets.push(builder.Platform.LINUX); }

	// set the name of the output files
	const artifactName = `${config.test.title} - ${config.test.version}`;

	const builtFiles = await builder.build({
		targets: targets.length ? builder.createTargets(targets) : null,
		config: {
			appId: `com.cycosoft.eyas`,
			productName: `Eyas`,
			// eslint-disable-next-line quotes
			artifactName: `${artifactName}` + '.${ext}',
			copyright: `Copyright © 2023 Cycosoft, LLC`,
			asarUnpack: [`resources/**`],
			directories: {
				app: paths.build,
				output: paths.dist
			},
			removePackageScripts: true,
			removePackageKeywords: true,
			mac: {
				target: `dmg`,
				icon: paths.icon
				// identity: `undefined` // disable code signing
			},
			win: {
				target: `portable`,
				icon: paths.icon
			},
			linux: {
				target: `AppImage`,
				icon: paths.icon,
				category: `Utility`
			}
		}
	});

	console.log(builtFiles);
})();