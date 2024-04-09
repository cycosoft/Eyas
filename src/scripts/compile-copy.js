#!/usr/bin/env node

/* global process */

'use strict';

// Import dependencies
const fs = require(`fs-extra`);
const path = require(`path`);
const consumerRoot = process.cwd();
const distRoot = path.join(consumerRoot, `dist`);
const runnersRoot = path.join(consumerRoot, `.runners`);

// Allow for "root" await calls
(async () => {
	// copy mac .app to dist folder
	if(process.platform === `darwin`) {
		const from = path.join(runnersRoot, `mac-arm64`, `Eyas.app`);
		const to = path.join(distRoot, `runners`, `Eyas.app`);
		console.log(`copying ${from} to ${to}`);
		fs.copy(from, to);
	}
})();