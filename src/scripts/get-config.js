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
userConfig.outputs = userConfig.outputs || {};
userConfig.meta = userConfig.meta || {};

// configuration merge and validation step
const eyasConfig = {
	source: userConfig.source || `dist`,
	port: userConfig.port || 3000,
	domains: validateCustomDomain(userConfig.domain || userConfig.domains),
	title: (userConfig.title || `Eyas`).trim(),
	version: (userConfig.version || getBranchName() || `Unspecified Version`).trim(),
	viewports: userConfig.viewports || [/* { label: ``, width: 0, height: 0 } */],
	links: userConfig.links || [/* { label: ``, url: `` } */],

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

// TEMPORARY OVERRIDE - never allow linux
eyasConfig.outputs.linux = false;

// export the config for the project
module.exports = eyasConfig;

// validate the user input for the custom domain
function validateCustomDomain(input) {
	// default to an empty array
	const output = [/* { url: ``, port: 3000, title: `Staging` } */];

	// if the input is a string
	if (typeof input === `string`) {
		// convert to an array
		output.push({ url: input });
	}

	// if the input is an array
	if (Array.isArray(input)) {
		// loop through each item
		input.forEach(domain => {
			// if the domain is a string
			if (typeof domain === `string`) {
				// convert to an object
				output.push({ url: domain, title: domain });
			}

			// if the domain is an object
			if (typeof domain === `object`) {
				// add to the output
				output.push(domain);
			}
		});
	}

	// return validated input
	return output;
}

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
	const { addHours } = require(`date-fns/addHours`);
	const now = new Date();
	return addHours(now, 1);
}