import _path from "node:path";
import roots from "./get-roots.js";
import { EXTENSION } from "./constants.js";
import validator from "validator";
import _fs from "node:fs";
import _os from "node:os";
import crypto from "node:crypto";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

// Types
import type { EyasConfig } from "../types/config.js";
import type { SourcePath, LabelString } from "../types/primitives.js";

// setup
const require = createRequire(import.meta.url);
const { isURL } = validator;
const baseConfigName = `.eyas.config`;

/**
 * Get the config via web requests ( supports both eyas:// and https:// protocols )
 * @param path The URL to fetch the config from
 * @returns The loaded configuration
 */
export async function getConfigViaUrl(path: SourcePath): Promise<EyasConfig> {
	// setup
	const defaultConfigName = `eyas.json`;

	// convert the eyas protocol to https if it's not already
	let urlString = path.replace(`eyas://`, `https://`);

	// trim any trailing slashes
	urlString = urlString.replace(/\/+$/, ``);

	// convert the path to a URL object
	let url: URL;
	try {
		url = new URL(urlString);
	} catch {
		throw new Error(`WEB: Invalid URL: ${urlString}`);
	}

	// the url must be valid
	if (!isURL(url.toString())) {
		throw new Error(`WEB: Invalid URL: ${url.toString()}`);
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

/**
 * Get the config via file association
 * @param path The path to the file
 * @returns The loaded configuration
 */
export async function getConfigViaAssociation(path: SourcePath): Promise<EyasConfig> {
	// pass the path through to the asar loader AND return the config object
	return await getConfigFromAsar(path);
}

/**
 * Get the config via a sibling file
 * @returns The loaded configuration or null if not found
 */
export async function getConfigViaRoot(): Promise<EyasConfig | null> {
	// look for tests in the same directory as the runner
	const fileInRoot = _fs.readdirSync(roots.config).find(file => file.endsWith(EXTENSION));

	// if no file was found
	if (!fileInRoot) {
		return null;
	}

	// pass the path through to the asar loader AND return the config
	return await getConfigFromAsar(_path.join(roots.config, fileInRoot));
}

/**
 * Get the config via the CLI
 * @returns The loaded configuration
 */
export async function getConfigViaCli(): Promise<EyasConfig> {
	// setup
	let loadedConfig: EyasConfig | null = null;
	const consumerPackageJsonPath = _path.join(roots.config, `package.json`);
	const cjsConfigPath = _path.join(roots.config, `${baseConfigName}.cjs`);
	const jsConfigPath = _path.join(roots.config, `${baseConfigName}.js`);
	type PackageJson = { type?: LabelString };
	let consumerPackageJson: PackageJson | null = null;

	// first load the consumer package.json
	try {
		consumerPackageJson = require(consumerPackageJsonPath);
	} catch {
		// do nothing
	}

	// if the consumer is a module
	if (consumerPackageJson?.type === `module`) {
		// attempt to load a *.cjs config if it exists
		if (_fs.existsSync(cjsConfigPath)) {
			try {
				loadedConfig = require(cjsConfigPath);
			} catch (error) {
				const err = error as Error;
				console.error(`CLI: Error loading .cjs config: ${err.message}`);
			}
		}
	}

	// if a cjs config was not loaded
	if (!loadedConfig) {
		// attempt to load the *.js config
		// Note: @vite-ignore is required here to prevent the bundler from
		// trying to statically analyze this runtime import of an external file.
		const configUrl = pathToFileURL(jsConfigPath).href;
		try {
			const loadedModule = await import(/* @vite-ignore */ configUrl);
			loadedConfig = loadedModule?.default || loadedModule;
			if (loadedConfig) {
				loadedConfig = { ...loadedConfig }; // ensure the object is extensible
			} else {
				loadedConfig = {};
			}
			loadedConfig._isConfigLoaded = true;
		} catch (error) {
			console.error(`CLI: Error loading config:`, error);
			loadedConfig = {};
		}
	} else if (loadedConfig) {
		loadedConfig = { ...loadedConfig }; // ensure cjs config is also extensible
	} else {
		loadedConfig = {};
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

/**
 * Copy the *.eyas file to a temporary location as an *.asar and load the config directly
 * @param path The path to the *.eyas file
 * @returns The loaded configuration
 */
async function getConfigFromAsar(path: SourcePath): Promise<EyasConfig> {
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
		if (loadedConfig) {
			loadedConfig = { ...loadedConfig }; // ensure the object is extensible
		}
	} catch (error) {
		const err = error as Error;
		console.error(`FILE: Error loading config: ${err.message}`);
		loadedConfig = {};
	}

	// set the path to the test in the config
	loadedConfig.source = tempPath;
	loadedConfig._isConfigLoaded = true;

	// send back the data
	return loadedConfig;
}
