#!/usr/bin/env node
/* eslint-disable no-console */
/* global process */

'use strict';

// imports
const path = require(`path`);
const { execSync } = require(`child_process`);
const roots = require(`./get-roots.js`);
const _fs = require(`fs`);
const os = require(`os`);

// setup
let userConfig = {};

// set the default path for the user's config (outside of *.eyas)
let configPath = path.join(roots.config, `.eyas.config.js`);

// check for any *.eyas files at the roots.config level AND get the first one available
const testFileName = _fs.readdirSync(roots.config).find(file => file.endsWith(`.eyas`));
let asarPath = null;

// if a file was found
if (testFileName) {
	// copy testFileName and change the extension to .asar
	const asarFileName = `converted_test.asar`;

	// define the source and target paths
	const sourcePath = path.join(roots.config, testFileName);
	asarPath = path.join(os.tmpdir(), asarFileName);

	// copy the eyas file to the temp directory with the asar extension
	_fs.copyFileSync(sourcePath, asarPath);

	// overwrite the config path
	configPath = path.join(asarPath, `.eyas.config.js`);
}

// attempt to load the user's config
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
	source: asarPath || path.resolve(roots.config, userConfig.source || `dist`),
	domains: validateCustomDomain(userConfig.domain || userConfig.domains),
	title: (userConfig.title || `Eyas`).trim(),
	version: (userConfig.version || `${getBranchName()}.${getCommitHash()}` || `Unspecified Version`).trim(),
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
	const output = [/* { url: ``, title: `Staging` } */];

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

// attempts to return the current short hash
function getCommitHash() {
	try {
		return execSync(`git rev-parse --short HEAD`).toString().trim();
	} catch (error) {
		// eslint-disable-next-line no-console
		console.error(`Error getting commit hash:`, error);
		return null;
	}
}

// attempts to return the current branch name
function getBranchName() {
	try {
		return execSync(`git rev-parse --abbrev-ref HEAD`).toString().trim();
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