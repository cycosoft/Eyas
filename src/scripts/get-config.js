#!/usr/bin/env node
/* eslint-disable no-console */

'use strict';

// imports
const path = require(`path`);
const { execSync } = require(`child_process`);
const roots = require(`./get-roots.js`);

// setup
let userConfig = {};
const configPath = path.join(roots.config, `.eyas.config.js`);
try {
	// attempt to load the user's config
	userConfig = require(configPath);
} catch (error) {
	console.warn(``);
	console.warn(`⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️`);
	console.warn(`------ UNABLE TO LOAD USER SETTINGS ------`);
	console.warn(`-------- proceeding with defaults --------`);
	console.log(``);
	console.error(error);
	console.log(``);
	console.warn(`⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️ ⚠️`);
	console.log(``);
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
		viewports: userConfig.test.viewports || [/* { label: ``, width: 0, height: 0 } */],
		menu: userConfig.test.menu || [/* { label: ``, url: `` } */]
	},

	// defaults to current platform
	outputs: {
		expires: validateExpiration(userConfig.outputs.expires), // hours
		compression: userConfig.outputs.compression || `normal`, // store, normal, maximum
		windows: userConfig.outputs.windows || false,
		mac: userConfig.outputs.mac || false,
		linux: userConfig.outputs.linux || false
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

// validate the user input for the expiration
function validateExpiration(hours) {
	// default
	let output = hours;
	const defaultHours = 7 * 24;
	const minHours = 1;
	const maxHours = 30 * 24;

	// if not a number
	if (isNaN(output)) {
		console.log(`not a number`);
		output = defaultHours;
	}

	// cast to a number
	output = Number(output);
	console.log(`cast to number:`, output);

	// must be a whole number
	if (!Number.isInteger(output)) {
		console.log(`not a whole number`);
		output = Math.ceil(output);
	}

	// must be above the minimum
	if (output < minHours) {
		console.log(`below minimum`);
		output = minHours;
	}

	// must be below the maximum
	if (output > maxHours) {
		console.log(`above maximum`);
		output = maxHours;
	}

	return output;
}