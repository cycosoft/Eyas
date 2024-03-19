#!/usr/bin/env node

/* global process */

'use strict';

const path = require(`path`);
const isDev = process.env.NODE_ENV === `dev`;
const consumerRoot = process.cwd();
const moduleRoot = !isDev
	? path.join(consumerRoot, `node_modules`, `@cycosoft`, `eyas`)
	: consumerRoot;
const roots = require(path.join(moduleRoot, `.build`, `scripts`, `get-roots.js`));
const names = {
	packageJsonCore: `package.json`,
	packageJson: `package.json`,
	eyasAssets: `eyas-assets`,
	eyasInterface: `eyas-interface`,
	scripts: `scripts`
};
const paths = {
	dist: roots.eyasDist,
	build: roots.eyasBuild,
	configLoader: path.join(roots.moduleBuild, names.scripts, `get-config.js`),
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
	scriptsSrc: path.join(roots.dist, names.scripts),
	scriptsDest: path.join(roots.eyasBuild, names.scripts),
	testDest: path.join(roots.eyasBuild, `test`),
	icon: path.join(roots.moduleBuild, `eyas-assets`, `eyas-logo.png`)
};

// Entry Point
(async () => {
	const fs = require(`fs-extra`);
	const builder = require(`electron-builder`);

	// Determine the executables to build
	const targets = [];
	if(process.platform === `win32`) { targets.push(builder.Platform.WINDOWS); }
	if(process.platform === `darwin`) { targets.push(builder.Platform.MAC); }
	// if(config.outputs.linux) { targets.push(builder.Platform.LINUX); }

	// set the name of the output files
	const runnerName = `eyas`;

	const builtFiles = await builder.build({
		targets: targets.length ? builder.createTargets(targets) : null,
		config: {
			appId: `com.cycosoft.eyas`,
			productName: `Eyas`,
			// eslint-disable-next-line quotes
			artifactName: runnerName + '.${ext}',
			copyright: `Copyright © 2023 Cycosoft, LLC`,
			asarUnpack: [`resources/**`],
			directories: {
				app: roots.moduleBuild,
				output: roots.runners
			},
			compression: isDev ? `store` : `maximum`, // `store` | `normal` | `maximum`
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

	// copy just the final executables to the dist folder
	builtFiles.forEach(file => {
		// skip .blockmap files
		if (file.endsWith(`.blockmap`) || file.endsWith(`.dmg`)) { return; }

		const dest = path.join(roots.dist, `runners`, path.basename(file));
		console.log(`copying ${file} to ${dest}`);
		fs.copy(file, dest);
	});

	// copy mac .app to dist folder
	if(process.platform === `darwin`) {
		const file = path.join(roots.runners, `mac-arm64`, `Eyas.app`);
		const dest = path.join(roots.dist, `runners`, `Eyas.app`);
		console.log(`copying ${file} to ${dest}`);
		fs.copy(file, dest);
	}

	// cleanup
	console.log(``);
	console.log(`Cleaning up...`);
	await fs.remove(roots.moduleBuild);
	await fs.remove(roots.runners);
})();
