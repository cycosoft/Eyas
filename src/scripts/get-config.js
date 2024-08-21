#!/usr/bin/env node

/* global process */

'use strict';

// imports
const _path = require(`path`);
const roots = require(`./get-roots.js`);
const { LOAD_TYPES, EXTENSION } = require(`./constants.js`);

// setup
let asarPath = null;
const configFileName = `.eyas.config.js`;

/*
Retrieves the configuration for the test by one of the following methods

- Via url (eyas://) provided by clicking a link or entered by the user
- Path to *.eyas provided by double-clicking the file
- Path to *.eyas found in the same directory as the runner
- Path to .eyas.config.js loaded via the CLI
*/
async function getConfig(method, path) {
	// setup
	let loadedConfig = null;

	// WINDOWS: check if request is via file association
	const associationFilePath = process.argv.find(arg => arg.endsWith(EXTENSION));

	// WINDOWS: override the method and path if an association file was found
	if (associationFilePath) {
		method = LOAD_TYPES.ASSOCIATION;
		path = associationFilePath;
	}

	// if requesting a config via the web
	if (method === LOAD_TYPES.WEB) {
		loadedConfig = await getConfigViaUrl(path);
	}

	// if requesting a config via a file association
	if (method === LOAD_TYPES.ASSOCIATION) {
		loadedConfig = getConfigViaAssociation(path);
	}

	// if requesting a config via a sibling file
	if (method === LOAD_TYPES.ROOT) {
		loadedConfig = getConfigViaRoot();

		// if no *.eyas file was found
		if(!loadedConfig) {
			// fallback to the CLI method
			method = LOAD_TYPES.CLI;
		}
	}

	// if requesting a config via the CLI
	if (method === LOAD_TYPES.CLI) {
		loadedConfig = getConfigViaCli(path);
	}

	// pass the loaded config data to the parser for validation
	return validateConfig(loadedConfig);
};

// get the config via web requests ( supports both eyas:// and https:// protocols )
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
	const loadedConfig = await fetch(url.toString())
		.then(response => response.json())
		.catch(error => console.error(`WEB: Error fetching config:`, error.message));

	// update the source path to the test
	loadedConfig.source = url.origin;

	// send back the data
	return loadedConfig;
}

// get the config via file association
function getConfigViaAssociation(path) {
	// pass the path through to the asar loader AND return the config object
	return getConfigFromAsar(path);
}

// get the config via a sibling file
function getConfigViaRoot() {
	// imports
	const _fs = require(`fs`);

	// look for tests in the same directory as the runner
	const fileInRoot = _fs.readdirSync(roots.config).find(file => file.endsWith(EXTENSION));

	// if no file was found
	if (!fileInRoot) {
		return null;
	}

	// pass the path through to the asar loader AND return the config
	return getConfigFromAsar(_path.join(roots.config, fileInRoot));
}

// get the config via the CLI
function getConfigViaCli(path) {
	// setup
	let loadedConfig = null;

	// attempt to load the test config directly
	try {
		loadedConfig = require(_path.join(roots.config, configFileName));
	} catch (error) {
		throw new Error(`CLI: Error loading config: ${error.message}`);
	}

	// if a source was provided
	if (loadedConfig.source) {
		// resolve it to the full path
		loadedConfig.source = _path.resolve(roots.config, loadedConfig.source);
	}

	// send back the data
	return loadedConfig;
}

// copy the *.eyas file to a temporary location as an *.asar and load the config directly
// * config cannot be loaded from custom extension
// * renaming the file to *.asar in-place is poor UX
function getConfigFromAsar(path) {
	// imports
	const _fs = require(`fs`);
	const _os = require(`os`);

	// setup
	const tempFileName = `converted_test.asar`;
	let loadedConfig = null;

	// determine the path to where a copy of the *.eyas file will live
	const tempPath = _path.join(_os.tmpdir(), tempFileName);

	// copy the test file to the temp directory with the asar extension
	_fs.copyFileSync(path, tempPath);

	// attempt to load the test config
	try {
		loadedConfig = require(_path.join(tempPath, configFileName));
	} catch (error) {
		throw new Error(`FILE: Error loading config: ${error.message}`);
	}

	// set the path to the test in the config
	loadedConfig.source = tempPath;

	// send back the data
	return loadedConfig;
}

// returns the validated configuration based on the loaded config
function validateConfig(loadedConfig) {
	// object validation
	loadedConfig ||= {};
	loadedConfig.outputs ||= {};
	loadedConfig.meta ||= {};
	const expiresIn = validateExpiration(loadedConfig.outputs.expires);

	// configuration merge and validation step
	const validatedConfig = {
		// use given value or resolve to default location
		source: loadedConfig.source || _path.resolve(roots.config, `dist`),
		domains: validateCustomDomain(loadedConfig.domain || loadedConfig.domains),
		title: (loadedConfig.title || `Eyas`).trim(),
		version: (loadedConfig.version || `${getBranchName()}.${getCommitHash()}` || `Unspecified Version`).trim(),
		viewports: loadedConfig.viewports || [/* { label: ``, width: 0, height: 0 } */],
		links: loadedConfig.links || [/* { label: ``, url: `` } */],

		outputs: {
			// platform
			windows: loadedConfig.outputs.windows || false,
			mac: loadedConfig.outputs.mac || false,
			linux: loadedConfig.outputs.linux || false,

			// options
			expires: expiresIn // hours
		},

		// data that is provided by the CLI step, not the user.
		meta: {
			expires: loadedConfig.meta.expires || getExpirationDate(expiresIn),
			gitBranch: loadedConfig.meta.gitBranch || getBranchName(),
			gitHash: loadedConfig.meta.gitHash || getCommitHash(),
			gitUser: loadedConfig.meta.gitUser || getUserName(),
			compiled: loadedConfig.meta.compiled || new Date(),
			eyas: loadedConfig.meta.eyas || getCliVersion(),
			companyId: loadedConfig.meta.companyId || getCompanyId(),
			projectId: loadedConfig.meta.projectId || getProjectId(),
			testId: loadedConfig.meta.testId || getTestId()
		}
	};

	// set the default platform if none are specified
	if (!validatedConfig.outputs.windows && !validatedConfig.outputs.mac && !validatedConfig.outputs.linux) {
		if(process.platform === `win32`) { validatedConfig.outputs.windows = true; }
		if(process.platform === `darwin`) { validatedConfig.outputs.mac = true; }
		if(process.platform === `linux`) { validatedConfig.outputs.linux = true; }
	}

	// OVERRIDE - linux support is not currently supported
	validatedConfig.outputs.linux = false;

	return validatedConfig;
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
module.exports = getConfig;