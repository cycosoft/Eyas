#!/usr/bin/env node
/* eslint-disable no-console */
/* global process */

'use strict';

// imports
const path = require(`path`);
const { execSync } = require(`child_process`);
const roots = require(`./get-roots.js`);

// setup
let userConfig = {};

// attempt to load the user's config
const configPath = path.join(roots.config, `.eyas.config.js`);
try {
	userConfig = require(configPath);
} catch (error) {
	console.warn(``);
	console.warn(`⚠️  ⚠️  ⚠️  ⚠️  ⚠️  ⚠️  ⚠️  ⚠️  ⚠️  ⚠️  ⚠️  ⚠️  ⚠️  ⚠️  ⚠️  ⚠️`);
	console.warn(`------ UNABLE TO LOAD USER SETTINGS ------`);
	console.warn(`-------- proceeding with defaults --------`);
	console.log(``);
	console.error(error);
	console.log(``);
	console.warn(`⚠️  ⚠️  ⚠️  ⚠️  ⚠️  ⚠️  ⚠️  ⚠️  ⚠️  ⚠️  ⚠️  ⚠️  ⚠️  ⚠️  ⚠️  ⚠️`);
	console.log(``);
}

// error checking for config
userConfig.test = userConfig.test || {};
userConfig.outputs = userConfig.outputs || {};
userConfig.meta = userConfig.meta || {};

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

	outputs: {
		// platform
		windows: userConfig.outputs.windows || false,
		mac: userConfig.outputs.mac || false,
		linux: userConfig.outputs.linux || false,

		// options
		expires: validateExpiration(userConfig.outputs.expires) // hours
	},

	meta: {
		expires: userConfig.meta.expires || getPreviewExpiration(),
		gitBranch: userConfig.meta.gitBranch || `Preview`,
		gitHash: userConfig.meta.gitHash || `Preview`,
		gitUser: userConfig.meta.gitUser || `Preview`,
		compiled: userConfig.meta.compiled || new Date()
	}
};

// set the default platform if none are specified
if (!eyasConfig.outputs.windows && !eyasConfig.outputs.mac && !eyasConfig.outputs.linux) {
	if(process.platform === `win32`) { eyasConfig.outputs.windows = true; }
	if(process.platform === `darwin`) { eyasConfig.outputs.mac = true; }
	if(process.platform === `linux`) { eyasConfig.outputs.linux = true; }
}

// TEMPORARY OVERRIDE TO DISABLE ALL BUILDS
eyasConfig.outputs.windows = process.platform === `win32`;
eyasConfig.outputs.mac = false;
eyasConfig.outputs.linux = false;

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
		output = defaultHours;
	}

	// cast to a number
	output = Number(output);

	// must be a whole number
	if (!Number.isInteger(output)) {
		output = Math.ceil(output);
	}

	// must be above the minimum
	if (output < minHours) {
		output = minHours;
	}

	// must be below the maximum
	if (output > maxHours) {
		output = maxHours;
	}

	return output;
}

// get the default preview expiration
function getPreviewExpiration() {
	const addHours = require(`date-fns/addHours`);
	const now = new Date();
	return addHours(now, 1);
}