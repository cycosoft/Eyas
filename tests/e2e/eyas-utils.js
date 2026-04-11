/**
 * BRIDGE FILE - DO NOT ADD TO THIS FILE
 * This file allows CommonJS tests to use the ESM renamed eyas-utils.mjs.
 * Once all tests are converted to ESM (.mjs), this file should be deleted.
 *
 * NOTE: This will be flagged by lint (import/no-commonjs), which serves as a reminder to clean it up.
 */

const bridge = import(`./eyas-utils.mjs`);

async function wrap(name, ...args) {
	const m = await bridge;
	return m[name](...args);
}

module.exports = {
	launchEyas: (...args) => wrap(`launchEyas`, ...args),
	getUiView: (...args) => wrap(`getUiView`, ...args),
	ensureEnvironmentSelected: (...args) => wrap(`ensureEnvironmentSelected`, ...args),
	waitForMenuUpdate: (...args) => wrap(`waitForMenuUpdate`, ...args),
	exitEyas: (...args) => wrap(`exitEyas`, ...args),
	getMenuStructure: (...args) => wrap(`getMenuStructure`, ...args),
	clickSubMenuItem: (...args) => wrap(`clickSubMenuItem`, ...args),
	emitIpcMessage: (...args) => wrap(`emitIpcMessage`, ...args),
	getAppWindowUrl: (...args) => wrap(`getAppWindowUrl`, ...args),
	runUiScript: (...args) => wrap(`runUiScript`, ...args)
};
