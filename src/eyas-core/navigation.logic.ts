import { testServerService } from './test-server.service.js';
import { getAppTitle, sanitizePageTitle } from '@scripts/get-app-title.js';
import type { CoreContext } from '@registry/eyas-core.js';
import type { DomainUrl, AppTitle, HashString, IsActive } from '@registry/primitives.js';
import type { PreventableEvent } from '@registry/core.js';

/**
 * Checks if the application window and test layer are closed or destroyed.
 * @param ctx The core context.
 * @returns True if the app is closed.
 */
export function isAppClosed(ctx: CoreContext): IsActive {
	const isWindowClosed = !ctx.$appWindow || ctx.$appWindow.isDestroyed();
	const isLayerClosed = !ctx.$testLayer || ctx.$testLayer.webContents.isDestroyed();
	return isWindowClosed && isLayerClosed;
}

/**
 * Determines if the URL should be opened in an external browser.
 * @param openInBrowser Whether to open in an external browser.
 * @param runningTestSource Whether the path is the local test source.
 * @returns True if the URL should be opened externally.
 */
export function shouldOpenExternal(openInBrowser: IsActive | undefined, runningTestSource: IsActive): IsActive {
	if (!openInBrowser) { return false; }
	return !runningTestSource || !!testServerService.getState();
}

/**
 * Loads the URL in the test layer or app window.
 * @param ctx The core context.
 * @param path The URL to load.
 */
export function loadUrlInTestLayer(ctx: CoreContext, path: DomainUrl): void {
	const webContents = ctx.$testLayer?.webContents || ctx.$appWindow?.webContents;
	if (webContents && !webContents.isDestroyed()) {
		webContents.loadURL(path);
	}
}

/**
 * Calculates the application title with current page and environment context.
 * @param ctx The core context.
 * @param rawPageTitle The raw page title from the browser.
 * @returns The formatted application title.
 */
export function getAppTitleWithContext(ctx: CoreContext, rawPageTitle?: AppTitle): AppTitle {
	// prefer the test layer's webContents since it holds the actual test page URL
	const webContents = ctx.$testLayer?.webContents || ctx.$appWindow?.webContents;
	const rawUrl = (webContents && !webContents.isDestroyed()) ? webContents.getURL() : null;

	// ignore data: URLs in the address bar
	const url = (rawUrl?.startsWith(`data:`) ? undefined : rawUrl) || undefined;

	// Sanitize the page title against the raw URL (before data: nulling)
	const pageTitle = sanitizePageTitle(rawPageTitle, rawUrl || ``);

	// Return the built title
	return getAppTitle(ctx.$config?.title || ``, ctx.$config?.version || ``, url, pageTitle);
}

/**
 * Handles the page title update event from the browser.
 * @param ctx The core context.
 * @param evt The preventable event.
 * @param title The new page title.
 */
export function onTitleUpdate(ctx: CoreContext, evt: PreventableEvent, title: AppTitle): void {
	// Disregard the default behavior
	evt.preventDefault();

	// update the title, passing the new document.title
	ctx.$appWindow?.setTitle(getAppTitleWithContext(ctx, title));
}

/**
 * djb2 hash of a domains array — detects any structural change.
 * @param domains The domains array.
 * @returns Unsigned 32-bit hex string.
 */
export function hashDomains(domains: unknown[]): HashString {
	const str = JSON.stringify(domains);
	let h = 5381;
	for (let i = 0; i < str.length; i++) { h = (h * 33) ^ str.charCodeAt(i); }
	return (h >>> 0).toString(16);
}
