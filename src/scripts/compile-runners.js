#!/usr/bin/env node

/* global process */

'use strict';

const path = require(`path`);
const isDev = process.env.NODE_ENV === `dev`;
const consumerRoot = process.cwd();
const buildRoot = path.join(consumerRoot, `.build`);
const runnersRoot = path.join(consumerRoot, `.runners`);
const distRoot = path.join(consumerRoot, `dist`);
const paths = {
	icon: path.join(buildRoot, `eyas-assets`, `eyas-logo.png`)
};

// Entry Point
(async () => {
	const fs = require(`fs-extra`);
	const builder = require(`electron-builder`);

	// Determine the executables to build
	const targets = [];
	if(process.platform === `win32` || process.env.FORCE_BUILD === `win32`) {
		targets.push(builder.Platform.WINDOWS);
	}

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
				app: buildRoot,
				output: runnersRoot
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

		const dest = path.join(distRoot, `runners`, path.basename(file));
		console.log(`copying ${file} to ${dest}`);
		fs.copy(file, dest);
	});

	// copy mac .app to dist folder
	if(process.platform === `darwin`) {
		const from = path.join(runnersRoot, `mac-arm64`, `Eyas.app`);
		const to = path.join(distRoot, `runners`, `Eyas.app`);
		console.log(`copying ${from} to ${to}`);
		fs.copy(from, to);
	}

	// cleanup
	console.log(``);
	console.log(`Cleaning up...`);
	await fs.remove(buildRoot);
	await fs.remove(runnersRoot);
})();
