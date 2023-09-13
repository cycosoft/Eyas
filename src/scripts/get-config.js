#!/usr/bin/env node
/* eslint-disable no-console */

'use strict';

// imports
const path = require(`path`);
const { execSync } = require(`child_process`);
const roots = require(`./get-roots.js`);

// setup
let userConfig = {};
const configPath = path.join(roots.config, `eyas.config.js`);
try {
	// attempt to load the user's config
	userConfig = require(configPath);
} catch (error) {
	console.warn(``);
	console.warn(`⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️`);
	console.warn(`------ UNABLE TO LOAD USER SETTINGS ------`);
	console.warn(`-------- proceeding with defaults --------`);
	console.log(``);
	console.error(error);
	console.log(``);
	console.warn(`⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️`);
	console.log(``);
	userConfig = {};
}

// error checking for config
userConfig.test = userConfig.test || {};
userConfig.outputs = userConfig.outputs || {};

// configuration merge and validation step
const eyasConfig = {
	test: {
		source: userConfig.test.source || `dist`,
		port: userConfig.test.port || 3000,
		domain: userConfig.test.domain || null,
		routes: userConfig.test.routes || [],
		title: (userConfig.test.title || `Eyas`).trim(),
		version: (userConfig.test.version || getBranchName() || `Unspecified Version`).trim(),
		dimensions: userConfig.test.dimensions || [/* { label: ``, width: 0, height: 0 } */],
		menu: userConfig.test.menu || [/* { label: ``, url: `` } */]
	},

	// defaults to current platform
	outputs: {
		maxCompression: userConfig.outputs.maxCompression || false,
		windows: parseBoolean(userConfig.outputs.windows),
		mac: parseBoolean(userConfig.outputs.mac),
		linux: parseBoolean(userConfig.outputs.linux)
	}
};

// export the config for the project
module.exports = eyasConfig;

// attempts to return the current branch name
function getBranchName() {
	try {
		return execSync(`git rev-parse --abbrev-ref HEAD`).toString();
	} catch (error) {
		// eslint-disable-next-line no-console
		console.error(`Error getting branch name:`, error);
		return null;
	}
}

// return null if the value isn't true or false
function parseBoolean(value) {
	// config
	let output = null;

	// use passed value if set AND is a boolean
	if(value === true || value === false){
		output = value;
	}

	// return the output
	return output;
}