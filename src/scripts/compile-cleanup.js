#!/usr/bin/env node

/* global process */

'use strict';

// Import dependencies
const fs = require(`fs-extra`);
const path = require(`path`);

// Allow for "root" await calls
(async () => {
	// Import dependencies
	const consumerRoot = process.cwd();
	const buildRoot = path.join(consumerRoot, `.build`);
	const runnersRoot = path.join(consumerRoot, `.runners`);

	// Remove the .build/ & .runners/ directories
	await fs.remove(buildRoot);
	await fs.remove(runnersRoot);
})();