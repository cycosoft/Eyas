#!/usr/bin/env node

/* global process */

'use strict';

// Import dependencies
const bytenode = require(`bytenode`);
const path = require(`path`);
const fs = require(`fs-extra`);

// await fs.ensureDir(dist);
// fs.copy(packageFrom, packageTo);

// Compile the CLI with options
bytenode.compileFile({
	createLoader: true,
	loaderFilename: `%.js`,
	filename: path.join(process.cwd(), `src`, `cli`, `index.js`),
	output: path.join(process.cwd(), `dist`, `cli.jsc`)
});


// Copy related files to dist
const packageJson = `package.json`;
const packageFrom = path.join(process.cwd(), `src`, `resources`, packageJson);
const dist = path.join(process.cwd(), `dist`);
const packageTo = path.join(dist, packageJson);