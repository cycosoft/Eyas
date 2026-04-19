// imports
import { LOAD_TYPES } from "./constants.js";

// Types
import type { ValidatedConfig, EyasConfig } from "../types/config.js";
import type { LoadMethod, SourcePath } from "../types/primitives.js";

// Utilities
import {
	getConfigViaUrl,
	getConfigViaAssociation,
	getConfigViaRoot,
	getConfigViaCli
} from "./get-config.loaders.js";

import { validateConfig } from "./get-config.validation.js";

/*
Retrieves the configuration for the test by one of the following methods

- Via url (eyas://) provided by clicking a link or entered by the user
- Path to *.eyas provided by double-clicking the file
- Path to *.eyas found in the same directory as the runner
- Path to .eyas.config.js loaded via the CLI
*/
async function getConfig(method: LoadMethod, path?: SourcePath): Promise<ValidatedConfig> {
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
		const associatedFile = process.argv.find(arg => arg.endsWith(`.eyas`));
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
	if (method === LOAD_TYPES.WEB && path) {
		loadedConfig = await getConfigViaUrl(path);
	}

	// if requesting a config via a file association
	if (method === LOAD_TYPES.ASSOCIATION && path) {
		loadedConfig = await getConfigViaAssociation(path);
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

// export the config for the project
export default getConfig;
