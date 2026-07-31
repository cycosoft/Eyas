import type { DeepLinkContext } from '@registry/deep-link.js';
import type { EyasProtocolUrl, CommandLineArgs, DurationMS } from '@registry/primitives.js';
import type { ConfigToLoad } from '@registry/core.js';

/**
 * Returns true only when url is a non-empty string starting with eyas://.
 * @param {unknown} url
 * @returns {boolean}
 */
export function isEyasProtocolUrl(url: unknown): url is EyasProtocolUrl {
	return typeof url === `string` && url.length > 0 && url.startsWith(`eyas://`);
}

/**
 * Handles an eyas protocol URL: either loads config and starts test (if window exists)
 * or defers by setting configToLoad (if window not yet ready).
 * @param {string} url - Full URL (e.g. eyas://host/path)
 * @param {DeepLinkContext} context
 * @returns {Promise<void>}
 */
export async function handleEyasProtocolUrl(url: EyasProtocolUrl, context: DeepLinkContext): Promise<void> {
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
export function getEyasUrlFromCommandLine(argv: CommandLineArgs): EyasProtocolUrl | undefined {
	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		if (typeof arg === `string` && arg.startsWith(`eyas://`)) {
			return arg;
		}
	}
	return undefined;
}

/**
 * Waits for the launch method to become known before the early config peek
 * (EYAS-334). A given process launch is started by exactly one of: an
 * eyas:// URL (argv on Windows/Linux, the async `open-url` event on macOS),
 * a `.eyas` file association (argv, or `open-file` on macOS), or neither
 * (a plain launch). If `configToLoad` is already populated — the
 * synchronous argv-based cases — this returns immediately. The only case
 * that actually waits is a macOS launch whose `open-url`/`open-file` event
 * hasn't been delivered yet; `timeoutMs` bounds how long a plain (no
 * deep-link) macOS launch sits idle before falling through to AUTO/ROOT.
 * @param {() => ConfigToLoad} getConfigToLoad - Reads the current configToLoad
 * @param {DurationMS} timeoutMs - Max time to wait on macOS before giving up
 * @returns {Promise<void>}
 */
export async function awaitInitialDeepLink(getConfigToLoad: () => ConfigToLoad, timeoutMs: DurationMS): Promise<void> {
	if (getConfigToLoad().method) { return; }
	if (process.platform !== `darwin`) { return; }

	await new Promise<void>(resolve => {
		const start = Date.now();
		const poll = (): void => {
			if (getConfigToLoad().method || Date.now() - start >= timeoutMs) {
				resolve();
				return;
			}
			setTimeout(poll, 10);
		};
		poll();
	});
}
