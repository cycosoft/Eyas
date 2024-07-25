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
const eyasExtension = `.eyas`;
const tempFileName = `converted_test.asar`;
const configFileName = `.eyas.config.js`;
let userConfig = {};
let configPath = null;
let asarPath = null;

// sets the default configuration based on selected config
function parseConfig(requestedEyasPath) {
	// load a test
	loadConfig(requestedEyasPath);

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
			gitBranch: userConfig.meta.gitBranch || getBranchName(),
			gitHash: userConfig.meta.gitHash || getCommitHash(),
			gitUser: userConfig.meta.gitUser || getUserName(),
			compiled: userConfig.meta.compiled || new Date(),
			eyas: userConfig.meta.eyas || `0.0.0`,
			companyId: userConfig.meta.companyId || getCompanyId(),
			projectId: userConfig.meta.projectId || ``,
			testId: userConfig.meta.testId || ``
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

	return eyasConfig;
}

// determine how to auto load the user's test (*.eyas click, sibling *.eyas, or config + directory)
function loadConfig(requestedEyasPath) {
	// set path to the requested eyas file first
	asarPath = requestedEyasPath;

	// if not set
	if (!asarPath) {
		// try getting path from command line argument
		asarPath = process.argv.find(arg => arg.endsWith(eyasExtension));
	}

	// if the asarPath still isn't set
	if (!asarPath) {
		// try looking for sibling *.eyas files
		const siblingFileName = _fs.readdirSync(roots.config).find(file => file.endsWith(eyasExtension));

		// if a file was found
		if (siblingFileName) {
			// define the full path to the sibling file
			asarPath = path.join(roots.config, siblingFileName);
		}
	}

	// if a file was set
	if (asarPath) {
		// define the full path to the temp file that will be the source for the test
		const tempPath = path.join(os.tmpdir(), tempFileName);

		// copy the eyas file to the temp directory with the asar extension
		_fs.copyFileSync(asarPath, tempPath);

		// update the config path to the temp directory
		configPath = path.join(tempPath, configFileName);

		// update the asar path to the temp directory
		asarPath = tempPath;
	}

	// if the configPath never got set
	if (!configPath) {
		// default to looking for a config file in the same directory as the runner
		configPath = path.join(roots.config, configFileName);
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
}

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

// attempts to return the current user name
function getUserName() {
	try {
		return execSync(`git config user.name`).toString().trim();
	} catch (error) {
		// eslint-disable-next-line no-console
		console.error(`Error getting user name:`, error);
		return null;
	}
}

// attempt to hash the user's email domain
function getCompanyId() {
	try {
		const email = execSync(`git config user.email`).toString().trim();

		// get the root domain of the email without subdomains
		const domain = email
			.split(`@`) // split up the email
			.at(-1) // get the last part
			.split('.') // split up the domain
			.slice(-2) // get the last two parts
			.join('.'); // join them back together

		const hash = require(`crypto`).createHash(`sha256`).update(domain).digest(`hex`);
		return domain;
	} catch (error) {
		// eslint-disable-next-line no-console
		console.error(`Error getting user email:`, error);
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

// export the config for the project
module.exports = parseConfig;