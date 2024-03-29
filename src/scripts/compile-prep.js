#!/usr/bin/env node

'use strict';

// Import dependencies
const fs = require(`fs-extra`);

// Allow for "root" await calls
(async () => {
	// Import dependencies
	const roots = require(`./get-roots`);

	// Prep the .build/ & dist/ directories for module output
	await fs.emptyDir(roots.moduleBuild);
	await fs.emptyDir(roots.dist);
})();