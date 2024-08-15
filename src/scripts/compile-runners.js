#!/usr/bin/env node

/* global process */

'use strict';

require('dotenv').config({ path: [`.env.local`, `.env`] })
const path = require(`path`);
const isDev = process.env.NODE_ENV === `dev`;
const isInstaller = process.env.PUBLISH_TYPE === `installer`;
const isMac = process.platform === `darwin`;
const isWin = process.platform === `win32`;
const consumerRoot = process.cwd();
const buildRoot = path.join(consumerRoot, `.build`);
const runnersRoot = path.join(consumerRoot, `.runners`);
const distRoot = path.join(consumerRoot, `dist`);
const paths = {
	icon: path.join(buildRoot, `eyas-assets`, `eyas-logo.png`),
	iconDbWin: path.join(buildRoot, `eyas-assets`, `eyas-db.ico`),
	iconDbMac: path.join(buildRoot, `eyas-assets`, `eyas-db.icns`),
	codesignWin: path.join(consumerRoot, `src`, `scripts`, `codesign-win.js`)
};

// Entry Point
(async () => {
	const fs = require(`fs-extra`);
	const builder = require(`electron-builder`);

	// Determine the executables to build
	const targets = [];
	if(isWin || process.env.FORCE_BUILD === `win32`) {
		targets.push(builder.Platform.WINDOWS);
	}

	if(isMac) { targets.push(builder.Platform.MAC); }
	// if(config.outputs.linux) { targets.push(builder.Platform.LINUX); }

	// set the name of the output files
	const installerAppend = isInstaller ? `Installer` : ``;
	const unsignedAppend = isInstaller && isMac ? `-unsigned` : ``;
	const runnerName = `Eyas${installerAppend}${unsignedAppend}`;

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
				target: isInstaller ? `pkg` : `dir`,
				icon: paths.icon,
				provisioningProfile: process.env.PROVISIONING_PROFILE_PATH || ``,
				...isDev ? { identity: null } : {}, // don't sign in dev
				notarize: { teamId: process.env.APPLE_TEAM_ID || `` }
			},
			win: {
				target: isInstaller ? `msi` : `portable`,
				icon: paths.icon,
				sign: isDev ? null : paths.codesignWin
			},
			linux: {
				target: `AppImage`,
				icon: paths.icon,
				category: `Utility`
			},
			msi: {
				oneClick: false, // because there is no feedback to users otherwise
				runAfterFinish: false, // this gives the user an option, but we want mandatory
				createDesktopShortcut: true // so the user knows install process finished
			},
			pkg: {
				isRelocatable: false // always install in /Applications
			},
			fileAssociations: [
				{
					ext: `eyas`,
					name: `eyas-db`,
					icon: isWin ? paths.iconDbWin : paths.iconDbMac
				}
			],
			protocols: [
				{
					name: `Eyas`,
					schemes: [`eyas`],
					role: `Viewer`
				}
			]
		}
	});

	// copy just the final windows executables to the dist folder
	builtFiles.forEach(file => {
		// skip anything not an exe
		if (!file.endsWith(`.exe`)) { return; }

		const dest = path.join(distRoot, `runners`, `Start.exe`);
		console.log(`copying ${file} to ${dest}`);
		fs.copy(file, dest);
	});
})();
