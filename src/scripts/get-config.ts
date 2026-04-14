// imports
import _path from "node:path";
import roots from "./get-roots.js";
import { LOAD_TYPES, EXTENSION } from "./constants.js";
import validator from "validator";
import _fs from "node:fs";
import _os from "node:os";
import { execSync } from "node:child_process";
import crypto from "node:crypto";
import * as dateFns from "date-fns";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

// setup
const require = createRequire(import.meta.url);
const { isURL } = validator;
const { addHours } = dateFns;
const baseConfigName = `.eyas.config`;

interface EyasConfig {
	source?: string;
	domain?: string | string[] | { url: string; title?: string }[];
	domains?: string | string[] | { url: string; title?: string }[];
	title?: string;
	version?: string;
	viewports?: { label: string; width: number; height: number }[];
	links?: { label: string; url: string }[];
	outputs?: {
		expires?: number;
	};
	meta?: Partial<EyasMeta>;
	_isConfigLoaded?: boolean;
}

interface EyasMeta {
	expires: Date;
	gitBranch: string | null;
	gitHash: string | null;
	gitUser: string | null;
	compiled: Date;
	eyas: string;
	companyId: string | null;
	projectId: string | null;
	testId: string;
	isConfigLoaded: boolean;
}

interface ValidatedConfig {
	source: string;
	domains: { url: string; title?: string }[];
	title: string;
	version: string;
	viewports: { label: string; width: number; height: number }[];
	links: { label: string; url: string }[];
	outputs: {
		expires: number;
	};
	meta: EyasMeta;
}

/*
Retrieves the configuration for the test by one of the following methods

- Via url (eyas://) provided by clicking a link or entered by the user
- Path to *.eyas provided by double-clicking the file
- Path to *.eyas found in the same directory as the runner
- Path to .eyas.config.js loaded via the CLI
*/
async function getConfig(method: string, path?: string): Promise<ValidatedConfig> {
	// setup
	let loadedConfig: EyasConfig | null = null;

	// if auto-detecting the method
	if (method === LOAD_TYPES.AUTO) {
		// check if request is via web
		const isWeb = process.argv.find(arg => arg.startsWith(`eyas://`));

		if (isWeb) {
			method = LOAD_TYPES.WEB;
			path = isWeb;
		}

		// check if request is via file association
		const associatedFile = process.argv.find(arg => arg.endsWith(EXTENSION));
		if (associatedFile) {
			method = LOAD_TYPES.ASSOCIATION;
			path = associatedFile;
		}

		// check if request is for root file
		if (!isWeb && !associatedFile) {
			method = LOAD_TYPES.ROOT; // check if request is for root config
		}
	}

	// if requesting a config via the web
	if (method === LOAD_TYPES.WEB) {
		loadedConfig = await getConfigViaUrl(path!);
	}

	// if requesting a config via a file association
	if (method === LOAD_TYPES.ASSOCIATION) {
		loadedConfig = await getConfigViaAssociation(path!);
	}

	// if requesting a config via a sibling file
	if (method === LOAD_TYPES.ROOT) {
		loadedConfig = await getConfigViaRoot();

		// if no *.eyas file was found
		if (!loadedConfig) {
			// fallback to the CLI method
			method = LOAD_TYPES.CLI;
		}
	}

	// if requesting a config via the CLI
	if (method === LOAD_TYPES.CLI) {
		loadedConfig = await getConfigViaCli();
	}

	// pass the loaded config data to the parser for validation
	return validateConfig(loadedConfig, !!loadedConfig?._isConfigLoaded);
}

// get the config via web requests ( supports both eyas:// and https:// protocols )
async function getConfigViaUrl(path: string): Promise<EyasConfig> {
	// setup
	const defaultConfigName = `eyas.json`;

	// convert the eyas protocol to https if it's not already
	let urlString = path.replace(`eyas://`, `https://`);

	// trim any trailing slashes
	urlString = urlString.replace(/\/+$/, ``);

	// convert the path to a URL object
	const url = new URL(urlString);

	// the url must be valid
	if (!isURL(url.toString())) {
		throw new Error(`WEB: Invalid URL: ${url}`);
	}

	// assume the url is a directory and cache for later use
	const urlAndPathOnly = url.toString();

	// append the default config name
	url.pathname = `${url.pathname}/${defaultConfigName}`;

	// fetch the config file from the parsed url
	const loadedConfig: EyasConfig = await fetch(url.toString())
		.then(response => {
			if (!response.ok) {
				throw new Error(`HTTP status ${response.status}`);
			}
			return response.json();
		})
		.catch(error => {
			console.error(`WEB: Error fetching config:`, error.message);
			return {}; // Return empty object on any fetch/parse error
		});

	// if the fetch failed, we will have an empty object
	if (!Object.keys(loadedConfig).length) {
		return {};
	}

	// create an extensible copy of the config
	const validatedConfig = { ...loadedConfig };

	// update the source path to the test
	validatedConfig.source = urlAndPathOnly;
	validatedConfig._isConfigLoaded = true;

	// send back the data
	return validatedConfig;
}

// get the config via file association
async function getConfigViaAssociation(path: string): Promise<EyasConfig> {
	// pass the path through to the asar loader AND return the config object
	return await getConfigFromAsar(path);
}

// get the config via a sibling file
async function getConfigViaRoot(): Promise<EyasConfig | null> {
	// look for tests in the same directory as the runner
	const fileInRoot = _fs.readdirSync(roots.config).find(file => file.endsWith(EXTENSION));

	// if no file was found
	if (!fileInRoot) {
		return null;
	}

	// pass the path through to the asar loader AND return the config
	return await getConfigFromAsar(_path.join(roots.config, fileInRoot));
}

// get the config via the CLI
async function getConfigViaCli(): Promise<EyasConfig> {
	// setup
	let loadedConfig: EyasConfig | null = null;
	const consumerPackageJsonPath = _path.join(roots.config, `package.json`);
	const cjsConfigPath = _path.join(roots.config, `${baseConfigName}.cjs`);
	const jsConfigPath = _path.join(roots.config, `${baseConfigName}.js`);
	let consumerPackageJson: { type?: string } | null = null;

	// first load the consumer package.json
	try {
		consumerPackageJson = require(consumerPackageJsonPath);
	} catch {
		// do nothing
	}

	// if the consumer is a module
	if (consumerPackageJson?.type === `module`) {
		// attempt to load a *.cjs config
		try {
			loadedConfig = require(cjsConfigPath);
		} catch (error: any) {
			// alert the user about potential issues
			console.warn(`CLI: Error loading config: ${error.message}`);
			console.warn(`⚠️ CLI: Please rename ".eyas.config.js" to ".eyas.config.cjs"`);
		}
	}

	// if a cjs config was not loaded
	if (!loadedConfig) {
		// attempt to load the *.js config
		try {
			const loadedModule = await import(pathToFileURL(jsConfigPath).href);
			loadedConfig = loadedModule?.default || loadedModule;
			loadedConfig = { ...loadedConfig! }; // ensure the object is extensible
			loadedConfig._isConfigLoaded = true;
		} catch (error: any) {
			console.error(`CLI: Error loading config: ${error.message}`);
			loadedConfig = {};
		}
	} else {
		// ensure cjs config is also extensible and marked
		loadedConfig = { ...loadedConfig };
	}

	// if a source was provided
	if (loadedConfig.source) {
		// resolve it to the full path
		loadedConfig.source = _path.resolve(roots.config, loadedConfig.source);
	}

	// mark the config as loaded
	loadedConfig._isConfigLoaded = true;

	// send back the data
	return loadedConfig;
}

// copy the *.eyas file to a temporary location as an *.asar and load the config directly
// * config cannot be loaded from custom extension
// * renaming the file to *.asar in-place is poor UX
async function getConfigFromAsar(path: string): Promise<EyasConfig> {
	// setup
	const tempFileName = `eyas-config-${crypto.randomUUID()}.asar`;
	let loadedConfig: EyasConfig;

	// determine the path to where a copy of the *.eyas file will live
	const tempPath = _path.join(_os.tmpdir(), tempFileName);

	// copy the test file to the temp directory with the asar extension
	_fs.copyFileSync(path, tempPath);

	// attempt to load the test config
	try {
		const configPath = _path.join(tempPath, `${baseConfigName}.js`);
		// Use require for ASAR paths as import() does not support them
		const tempConfig = require(configPath);
		loadedConfig = tempConfig?.default || tempConfig;
		loadedConfig = { ...loadedConfig! }; // ensure the object is extensible
	} catch (error: any) {
		console.error(`FILE: Error loading config: ${error.message}`);
		loadedConfig = {};
	}

	// set the path to the test in the config
	loadedConfig.source = tempPath;
	loadedConfig._isConfigLoaded = true;

	// send back the data
	return loadedConfig;
}

// returns the validated configuration based on the loaded config
function validateConfig(rawConfig: EyasConfig | null, isConfigLoaded = false): ValidatedConfig {
	// setup
	const loadedConfig = rawConfig || {};
	const outputs = loadedConfig.outputs || {};
	const meta = loadedConfig.meta || {};
	const expiresIn = validateExpiration(outputs.expires);

	// configuration merge and validation step
	const validatedConfig: ValidatedConfig = {
		// use given value or resolve to default location
		source: loadedConfig.source || _path.resolve(roots.config, `dist`),
		domains: validateCustomDomain(loadedConfig.domain || loadedConfig.domains),
		title: (loadedConfig.title || `Eyas`).trim(),
		version: (loadedConfig.version || `${getBranchName()}.${getCommitHash()}` || `Unspecified Version`).trim(),
		viewports: loadedConfig.viewports || [/* { label: ``, width: 0, height: 0 } */],
		links: loadedConfig.links || [/* { label: ``, url: `` } */],

		outputs: {
			expires: expiresIn // hours
		},

		// data that is provided by the CLI step, not the user.
		meta: {
			expires: meta.expires || getExpirationDate(expiresIn),
			gitBranch: meta.gitBranch || getBranchName(),
			gitHash: meta.gitHash || getCommitHash(),
			gitUser: meta.gitUser || getUserName(),
			compiled: meta.compiled || new Date(),
			eyas: meta.eyas || getCliVersion(),
			companyId: meta.companyId || getCompanyId(),
			projectId: meta.projectId || getProjectId(),
			testId: meta.testId || getTestId(),
			isConfigLoaded
		}
	};


	return validatedConfig;
}

// validate the user input for the custom domain
function validateCustomDomain(input?: string | string[] | { url: string; title?: string }[]): { url: string; title?: string }[] {
	// default to an empty array
	const output: { url: string; title?: string }[] = [/* { url: ``, title: `Staging` } */];

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
function getCliVersion(): string {
	try {
		const { version } = JSON.parse(_fs.readFileSync(_path.join(roots.module, `package.json`), `utf-8`));
		return version;
	} catch (error) {
		console.error(`Error getting CLI version:`, error);
		return `0.0.0`;
	}
}

// attempts to return the current short hash
function getCommitHash(): string | null {
	try {
		return execSync(`git rev-parse --short HEAD`).toString().trim();
	} catch (error) {

		console.error(`Error getting commit hash:`, error);
		return null;
	}
}

// attempts to return the current branch name
function getBranchName(): string | null {
	try {
		return execSync(`git rev-parse --abbrev-ref HEAD`).toString().trim();
	} catch (error) {

		console.error(`Error getting branch name:`, error);
		return null;
	}
}

// attempts to return the current user name
function getUserName(): string | null {
	try {
		return execSync(`git config user.name`).toString().trim();
	} catch (error) {

		console.error(`Error getting user name:`, error);
		return null;
	}
}

// attempt to hash the user's email domain
function getCompanyId(): string | null {
	try {
		const email = execSync(`git config user.email`).toString().trim();

		// get the root domain of the email without subdomains
		const domain = email
			.split(`@`) // split up the email
			.at(-1)! // get the last part
			.split(`.`) // split up the domain
			.slice(-2) // get the last two parts
			.join(`.`); // join them back together

		return crypto.createHash(`sha256`).update(domain).digest(`hex`);
	} catch (error) {

		console.error(`Error getting user email:`, error);
		return null;
	}
}

// get the project id from the git remote
function getProjectId(): string | null {
	try {
		// Split output into lines and filter out empty lines
		const remotes = execSync(`git remote`, { encoding: `utf-8` })
			.split(`\n`)
			.filter(file => file);

		// using the first remote, get the remote url for git
		const remoteUrl = execSync(`git remote get-url --all ${remotes[0]}`).toString().trim();

		// hash the remote url and return it
		return crypto.createHash(`sha256`).update(remoteUrl).digest(`hex`);
	} catch (error) {

		console.error(`Error getting project id:`, error);
		return null;
	}
}

// create a unique id for the test
function getTestId(): string {
	return crypto.randomUUID();
}

// validate the user input for the expiration
function validateExpiration(hours?: any): number {
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
function getExpirationDate(expiresInHours: number): Date {
	const now = new Date();
	return addHours(now, expiresInHours);
}

// export the config for the project
export default getConfig;
