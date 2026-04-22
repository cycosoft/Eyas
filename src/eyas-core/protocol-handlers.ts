import { protocol, session } from 'electron';
import _path from 'node:path';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import type { CoreContext } from '@registry/eyas-core.js';
import { parseURL } from '@scripts/parse-url.js';
import { safeJoin } from '@scripts/path-utils.js';
import type { DomainUrl, IsActive } from '@registry/primitives.js';


/**
 * Sets up listeners for the custom protocol for loading local test files and the UI.
 * This MUST be called before the app is ready.
 */
export function registerInternalProtocols(): void {
	// register the custom protocols for relative paths + crypto support
	protocol.registerSchemesAsPrivileged([
		{
			scheme: `eyas`, privileges: {
				standard: true,
				secure: true,
				allowServiceWorkers: true,
				supportFetchAPI: true,
				corsEnabled: true,
				stream: true
			}
		},

		{
			scheme: `ui`, privileges: {
				standard: true,
				secure: true
			}
		}
	]);
}

/**
 * Handles blocking requests when the user disables the network.
 * @param ctx The core context.
 * @param url The URL to check.
 * @returns True if the request should be blocked.
 */
function disableNetworkRequest(ctx: CoreContext, url: DomainUrl): IsActive {
	// exit if the network is not disabled
	if (ctx.$testNetworkEnabled) { return false; }

	// don't allow blocking the UI layer
	if (url.startsWith(`ui://`)) { return false; }

	return true;
}

/**
 * Configures the network handlers for the custom protocols.
 * @param ctx The core context.
 */
export function setupEyasNetworkHandlers(ctx: CoreContext): void {
	if (!ctx.$config) { return; }

	const ses = session.fromPartition(`persist:${ctx.$config.meta.testId}`);

	registerUiProtocolHandler(ctx, ses);
	registerEyasProtocolHandler(ctx, ses);
	registerHttpsProtocolHandler(ctx, ses);
}

/**
 * Registers the 'ui' protocol handler.
 * @param ctx The core context.
 * @param ses The session to register the handler on.
 */
export function registerUiProtocolHandler(ctx: CoreContext, ses: Electron.Session): void {
	// use the "ui" protocol to load the Eyas UI layer
	ses.protocol.handle(`ui`, request => {
		// drop the protocol from the request
		const parsed = parseURL(request.url.replace(`ui://`, `https://`));
		const relativePathToFile = (parsed instanceof URL ? parsed.pathname : ``);

		// build the expected path to the requested file
		const localFilePath = safeJoin(ctx.$paths.uiSource, relativePathToFile);

		// if the path is unsafe OR the file is missing
		if (!localFilePath || !fs.existsSync(localFilePath)) {
			return new Response(`Not Found`, { status: 404 });
		}

		// return the Eyas UI layer to complete the request
		return ses.fetch(pathToFileURL(localFilePath).toString());
	});
}

/**
 * Registers the 'eyas' protocol handler.
 * @param ctx The core context.
 * @param ses The session to register the handler on.
 */
export function registerEyasProtocolHandler(ctx: CoreContext, ses: Electron.Session): void {
	// use this protocol to load files relatively from the local file system
	ses.protocol.handle(`eyas`, request => {
		// validate this request
		if (disableNetworkRequest(ctx, request.url)) {
			return { cancel: true } as unknown as Response;
		}

		// grab the pathname from the request
		const parsed = parseURL(request.url.replace(`eyas://`, `https://`));
		const pathname = (parsed instanceof URL ? parsed.pathname : ``);

		// parse expected file attempting to load
		const fileIfNotDefined = `index.html`;

		// check if the pathname ends with a file + extension
		const hasExtension = pathname.split(`/`).pop()?.includes(`.`) || false;

		// build the relative path to the file
		const relativePathToFile = hasExtension
			? pathname
			: _path.join(pathname, fileIfNotDefined);

		// build the expected path to the file
		let localFilePath = safeJoin(ctx.$paths.testSrc || ``, relativePathToFile);

		if (
			// if the file is unsafe OR doesn't exist
			(!localFilePath || !fs.existsSync(localFilePath))
			// AND the requested path isn't the root path
			&& ctx.$paths.testSrc !== safeJoin(ctx.$paths.testSrc || ``, pathname)
		) {
			// load root file instead
			localFilePath = safeJoin(ctx.$paths.testSrc || ``, fileIfNotDefined);
		}

		// if the path is still unsafe (shouldn't happen with index.html, but for safety)
		if (!localFilePath) {
			return new Response(`Not Found`, { status: 404 });
		}

		// return the file from the local system to complete the request
		return ses.fetch(pathToFileURL(localFilePath).toString());
	});
}

/**
 * Registers the 'https' protocol handler for redirections.
 * @param ctx The core context.
 * @param ses The session to register the handler on.
 */
export function registerHttpsProtocolHandler(ctx: CoreContext, ses: Electron.Session): void {
	// listen for requests to the specified domains and redirect to the custom protocol
	ses.protocol.handle(`https`, async request => {
		// setup
		const parsedRequest = parseURL(request.url);
		if (!(parsedRequest instanceof URL)) {
			return ses.fetch(request);
		}
		const { hostname, pathname } = parsedRequest;
		let bypassCustomProtocolHandlers = true;

		// check if the request's hostname matches any of the test domains
		const domains = ctx.$config?.domains || [];
		const isManagedDomain = domains.some(d => {
			const parsed = parseURL(d.url);
			return hostname === (parsed instanceof URL ? parsed.hostname : null);
		});

		if (isManagedDomain) {
			// check if the config.source is a valid url
			const sourceOnWeb = parseURL(ctx.$config?.source || ``);

			// if the config.source is a url
			if (sourceOnWeb instanceof URL) {
				// redirect to the source domain with the same path
				const newUrl = sourceOnWeb.origin
					+ (sourceOnWeb.pathname + pathname)
						.replaceAll(`//`, `/`);
				return ses.fetch(newUrl, { bypassCustomProtocolHandlers });
			} else {
				// otherwise the config.source is a file, look locally
				const newUrl = request.url.replace(`https://`, `eyas://`);
				bypassCustomProtocolHandlers = false;
				return ses.fetch(newUrl, { bypassCustomProtocolHandlers });
			}
		}

		// make the request
		return ses.fetch(request, { bypassCustomProtocolHandlers });
	});
}

/**
 * Sets up web request interception to block requests when the network is disabled.
 * @param ctx The core context.
 */
export function setupWebRequestInterception(ctx: CoreContext): void {
	if (!ctx.$appWindow) { return; }

	ctx.$appWindow.webContents.session.webRequest.onBeforeRequest({ urls: [`<all_urls>`] }, (request, callback) => {
		// validate this request
		if (disableNetworkRequest(ctx, request.url)) {
			return callback({ cancel: true });
		}

		// allow the request to continue
		callback({ cancel: false });
	});
}
