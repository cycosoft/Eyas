#!/usr/bin/env node

/* global process, __dirname */

'use strict';

// Entry Point
(async () => {
	const packager = require(`electron-packager`);

	const appPaths = await packager({
		dir: `./build`
	});

	console.log(`Electron app bundles created:\n${appPaths.join(`\n`)}`);
})();