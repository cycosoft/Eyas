'use strict';

/**
 * Returns true only when url is a non-empty string starting with eyas://.
 * @param {unknown} url
 * @returns {boolean}
 */
function isEyasProtocolUrl(url) {
	return typeof url === 'string' && url.length > 0 && url.startsWith('eyas://');
}

/**
 * Handles an eyas protocol URL: either loads config and starts test (if window exists)
 * or defers by setting configToLoad (if window not yet ready).
 * @param {string} url - Full URL (e.g. eyas://host/path)
 * @param {{
 *   getAppWindow: () => unknown;
 *   setConfigToLoad: (payload: { method: string; path: string }) => void;
 *   loadConfig: (method: string, path: string) => Promise<unknown>;
 *   startAFreshTest: () => void;
 *   LOAD_TYPES: { WEB: string };
 * }} context
 * @returns {Promise<void>}
 */
async function handleEyasProtocolUrl(url, context) {
	if (!isEyasProtocolUrl(url)) {
		return;
	}
	const { getAppWindow, setConfigToLoad, loadConfig, startAFreshTest, LOAD_TYPES } = context;
	const appWindow = getAppWindow();
	if (appWindow) {
		await loadConfig(LOAD_TYPES.WEB, url);
		startAFreshTest();
	} else {
		setConfigToLoad({ method: LOAD_TYPES.WEB, path: url });
	}
}

/**
 * Returns the first command-line argument that starts with eyas://, or undefined.
 * @param {string[]} argv
 * @returns {string | undefined}
 */
function getEyasUrlFromCommandLine(argv) {
	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		if (typeof arg === 'string' && arg.startsWith('eyas://')) {
			return arg;
		}
	}
	return undefined;
}

module.exports = {
	isEyasProtocolUrl,
	handleEyasProtocolUrl,
	getEyasUrlFromCommandLine
};
