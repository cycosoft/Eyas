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
const macExecutable = `.app/`;
const configRoot = path.join(__dirname.slice(0, __dirname.indexOf(macExecutable) + macExecutable.length), `..`);

// base paths
const roots = {
	preBuild: path.join(moduleRoot, `.pre-build`),
	moduleBuild: path.join(moduleRoot, `.build`),
	dist: path.join(moduleRoot, `dist`),
	src: path.join(moduleRoot, `src`),
	eyasBuild: path.join(consumerRoot, `.eyas-preview`),
	eyasDist: path.join(consumerRoot, `.eyas-dist`),
	runners: path.join(consumerRoot, `.runners`),
	config: configRoot,
	eyas: eyasRoot,
	module: moduleRoot
};

// export the config for the project
module.exports = roots;
