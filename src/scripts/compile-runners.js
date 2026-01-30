#!/usr/bin/env node

/* global process */

'use strict';

require('dotenv').config({ path: [`.env.local`, `.env`] });
const path = require(`path`);
const { getElectronBuilderConfig } = require(`./electron-builder-config.js`);
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

	const config = getElectronBuilderConfig({
		isDev,
		isInstaller,
		isMac,
		isWin,
		paths,
		runnerName,
		appleTeamId: process.env.APPLE_TEAM_ID || ``,
		buildRoot,
		runnersRoot,
		provisioningProfile: process.env.PROVISIONING_PROFILE_PATH || ``
	});

	const builtFiles = await builder.build({
		targets: targets.length ? builder.createTargets(targets) : null,
		config
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
