#!/usr/bin/env node

/* global __dirname, process */

'use strict';

// imports
const path = require(`path`);

// setup
const isProd = __dirname.includes(`node_modules`);
const consumerRoot = process.cwd();
const moduleRoot = isProd
	? path.join(consumerRoot, `node_modules`, `@cycosoft`, `eyas`)
	: consumerRoot;
const eyasRoot = path.join(__dirname, `..`);
const isPackaged = __dirname.includes(`app.asar`);
const configRoot = isPackaged
	? process.env.PORTABLE_EXECUTABLE_DIR
	: consumerRoot;

// base paths
const roots = {
	dist: path.join(moduleRoot, `dist`),
	src: path.join(moduleRoot, `src`),
	eyasBuild: path.join(consumerRoot, `.eyas-preview`),
	eyasDist: path.join(consumerRoot, `.eyas-dist`),
	config: configRoot,
	eyas: eyasRoot,
	module: moduleRoot
};

// export the config for the project
module.exports = roots;
