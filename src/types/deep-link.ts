import type { ConfigToLoad } from './core.js';
import type { FilePath } from './primitives.js';

/** Context required to handle protocol (deep-link) URLs */
export type DeepLinkContext = {
	getAppWindow: () => unknown;
	setConfigToLoad: (payload: ConfigToLoad) => void;
	loadConfig: (method: string, path: FilePath) => Promise<unknown>;
	startAFreshTest: () => void | Promise<void>;
	LOAD_TYPES: Record<string, string>;
}
