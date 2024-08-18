#!/usr/bin/env node

/* global process */

'use strict';

// imports
const _path = require(`path`);
const roots = require(`./get-roots.js`);

// setup
let userConfig = {};
let asarPath = null;
const eyasExtension = `.eyas`;

/*
Retrieves the configuration for the test by one of the following methods

- Via url (eyas://) provided by clicking a link or entered by the user
- Path to *.eyas provided by double-clicking the file
- Path to *.eyas found in the same directory as the runner
- Path to .eyas.config.js loaded via the CLI
*/
async function getConfig(method, path) {
	// imports
	const { LOAD_TYPES } = require(`./constants.js`);

	// setup
	let configData = null;

	// WINDOWS: check if request is via file association
	const associationFilePath = process.argv.find(arg => arg.endsWith(eyasExtension));

	// WINDOWS: override the method and path if an association file was found
	if (associationFilePath) {
		method = LOAD_TYPES.ASSOCIATION;
		path = associationFilePath;
	}

	// if requesting a config via the web
	if (method === LOAD_TYPES.WEB) {
		configData = await getConfigViaUrl(path);
	}

	// if requesting a config via a file association
	if (method === LOAD_TYPES.ASSOCIATION) {
		configData = await getConfigViaAssociation(path);
	}

	// if requesting a config via a sibling file
	if (method === LOAD_TYPES.ROOT) {
		configData = await getConfigViaRoot();
	}

	// if requesting a config via the CLI
	if (method === LOAD_TYPES.CLI) {
		configData = await getConfigViaCli(path);
	}

	// pass the loaded config data to the parser for validation
	return validateConfig(configData);
};

// get the config via web requests
// * supports both eyas:// and https:// protocols
// * to test self-signed certs, add `cross-env NODE_TLS_REJECT_UNAUTHORIZED=0` before `npx electron`
async function getConfigViaUrl(path) {
	// imports
	const { isURL } = require(`validator`);

	// setup
	const defaultConfigName = `eyas.json`;

	// convert the eyas protocol to https if it's not already
	let url = path.replace(`eyas://`, `https://`);

	// convert the path to a URL object
	url = new URL(url);

	// the url must be valid
	if (!isURL(url.toString())) {
		throw new Error(`WEB: Invalid URL: ${url}`);
	}

	// if the path name does not end in `.json`
	if (!url.pathname.endsWith(`.json`)) {
		// update the url to look for the default config at the url root
		url.pathname = defaultConfigName;
	}

	// fetch the config file from the parsed url
	const response = await fetch(url.toString())
		.then(response => response.json())
		.catch(error => console.error(`WEB: Error fetching config:`, error.message));

	// log the response for testing
	console.log(response);

	return response;
}

// get the config via file association
async function getConfigViaAssociation(path) {
	// pass the path through to the asar loader AND return the config object
	return await getConfigFromAsar(path);
}

// get the config via a sibling file
async function getConfigViaRoot() {
	// imports
	const _fs = require(`fs`);

	// look for tests in the same directory as the runner
	const fileInRoot = _fs.readdir(roots.config).find(file => file.endsWith(eyasExtension));

	// if no file was found
	if (!fileInRoot) {
		throw new Error(`ROOT: No test found in ${roots.config}`);
	}

	// pass the path through to the asar loader AND return the config
	return await getConfigFromAsar(_path.join(roots.config, fileInRoot));
}

// get the config via the CLI
async function getConfigViaCli(path) {
	// setup
	let userConfig = null;

	// attempt to load the test config directly
	try {
		userConfig = require(_path.join(roots.config, configFileName));
	} catch (error) {
		throw new Error(`CLI: Error loading config: ${error.message}`);
	}

	return userConfig;
}

// copy the *.eyas file to a temporary location as an *.asar and load the config directly
// * config cannot be loaded from custom extension
// * renaming the file to *.asar in-place is poor UX
async function getConfigFromAsar(path) {
	// imports
	const _fs = require(`fs`);
	const _os = require(`os`);

	// setup
	const tempFileName = `converted_test.asar`;
	const configFileName = `.eyas.config.js`;
	let userConfig = null;

	// determine the path to where a copy of the *.eyas file will live
	const tempPath = _path.join(_os.tmpdir(), tempFileName);

	// copy the test file to the temp directory with the asar extension
	await _fs.copyFile(path, tempPath);

	// attempt to load the test config
	try {
		userConfig = require(_path.join(tempPath, configFileName));
	} catch (error) {
		throw new Error(`FILE: Error loading config: ${error.message}`);
	}

	// send back the data
	return userConfig;
}

// sets the default configuration based on selected config
function validateConfig(path, isNotCli = true) {
	// load a test
	// loadConfig(path, isNotCli);

	// object validation
	userConfig.outputs = userConfig.outputs || {};
	userConfig.meta = userConfig.meta || {};
	const expiresIn = validateExpiration(userConfig.outputs.expires);

	// configuration merge and validation step
	const eyasConfig = {
		source: asarPath || _path.resolve(roots.config, userConfig.source || `dist`),
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

	// OVERRIDE - linux support is not currently supported
	eyasConfig.outputs.linux = false;

	return eyasConfig;
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
		const { version } = require(_path.join(roots.module, `package.json`));
		return version;
	} catch (error) {
		console.error(`Error getting CLI version:`, error);
		return `0.0.0`;
	}
}

// attempts to return the current short hash
function getCommitHash() {
	const { execSync } = require(`child_process`);

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
	const { execSync } = require(`child_process`);

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
	const { execSync } = require(`child_process`);

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
	const { execSync } = require(`child_process`);

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
	const { execSync } = require(`child_process`);

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
	return require(`crypto`).randomUUID();
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
module.exports = validateConfig;