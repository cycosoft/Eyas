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

	// object validation
	userConfig.outputs = userConfig.outputs || {};
	userConfig.meta = userConfig.meta || {};
	const expiresIn = validateExpiration(userConfig.outputs.expires);

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
			expires: expiresIn // hours
		},

		meta: {
			expires: userConfig.meta.expires || getExpirationDate(expiresIn),
			gitBranch: userConfig.meta.gitBranch || getBranchName(),
			gitHash: userConfig.meta.gitHash || getCommitHash(),
			gitUser: userConfig.meta.gitUser || getUserName(),
			compiled: userConfig.meta.compiled || new Date(),
			eyas: userConfig.meta.eyas || getCliVersion(),
			companyId: userConfig.meta.companyId || getCompanyId(),
			projectId: userConfig.meta.projectId || getProjectId(),
			testId: userConfig.meta.testId || getTestId()
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

// get the version of the cli
function getCliVersion() {
	try {
		const { version } = require(path.join(roots.module, `package.json`));
		return version;
	} catch (error) {
		console.error(`Error getting CLI version:`, error);
		return `0.0.0`;
	}
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
		const crypto = require(`crypto`);
		const email = execSync(`git config user.email`).toString().trim();

		// get the root domain of the email without subdomains
		const domain = email
			.split(`@`) // split up the email
			.at(-1) // get the last part
			.split('.') // split up the domain
			.slice(-2) // get the last two parts
			.join('.'); // join them back together

		return crypto.createHash(`sha256`).update(domain).digest(`hex`);
	} catch (error) {
		// eslint-disable-next-line no-console
		console.error(`Error getting user email:`, error);
		return null;
	}
}

// get the project id from the git remote
function getProjectId() {
	try {
		const crypto = require(`crypto`);

		// Split output into lines and filter out empty lines
		const remotes = execSync(`git remote`, { encoding: `utf-8` })
			.split(`\n`)
			.filter(file => file);

		// using the first remote, get the remote url for git
		const remoteUrl = execSync(`git remote get-url --all ${remotes[0]}`).toString().trim();

		// hash the remote url and return it
		return crypto.createHash(`sha256`).update(remoteUrl).digest(`hex`);
	} catch (error) {
		// eslint-disable-next-line no-console
		console.error(`Error getting project id:`, error);
		return null;
	}
}

// create a unique id for the test
function getTestId() {
	const crypto = require(`crypto`);
	return crypto.randomUUID();
}

// validate the user input for the expiration
function validateExpiration(hours) {
	// default
	let output = hours;
	const defaultHours = 7 * 24; // 168 hours or 1 week
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
function getExpirationDate(expiresInHours) {
	const { addHours } = require(`date-fns/addHours`);
	const now = new Date();
	return addHours(now, expiresInHours);
}

// export the config for the project
module.exports = parseConfig;