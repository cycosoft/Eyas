import { shell, dialog } from 'electron';
import semver from 'semver';
import { parseURL } from '@scripts/parse-url.js';
import { substituteEnvVariables, hasRemainingVariables } from '@scripts/variable-utils.js';
import { getAppTitle, sanitizePageTitle } from '@scripts/get-app-title.js';
import { testServerService } from './test-server.service.js';
import * as settingsService from './settings-service.js';
import type { CoreContext } from '@registry/eyas-core.js';
import type { DomainUrl, AppTitle, HashString, IsActive } from '@registry/primitives.js';
import type { PreventableEvent } from '@registry/core.js';
import type { EnvironmentSettings } from '@registry/settings.js';
import { EYAS_HEADER_HEIGHT } from '@scripts/constants.js';

/**
 * Navigates the application window to the specified path or the default test domain.
 * @param ctx The core context.
 * @param path Optional path to navigate to.
 * @param openInBrowser Whether to open the path in an external browser.
 */
function navigate(ctx: CoreContext, path?: DomainUrl, openInBrowser?: IsActive, closeUi: IsActive = true): void {
	if (!ctx.$appWindow) { return; }

	// setup
	let runningTestSource = false;

	// if the path wasn't provided (default to local test source)
	if (!path) {
		// store that we're running the local test source
		runningTestSource = true;

		// if there's a custom domain, go there OR default to the local test source
		path = ctx.$testDomain;
	}

	if (
		// if requested to open in the browser AND
		openInBrowser &&
		(
			// not running the local test OR
			!runningTestSource ||
			// the test server is running AND we're running the local test
			(testServerService.getState() && runningTestSource)
		)
	) {
		// open the requested url in the default browser
		shell.openExternal(path);
	} else {
		// otherwise load the requested path in the app window
		const webContents = ctx.$testLayer?.webContents || ctx.$appWindow?.webContents;
		webContents?.loadURL(path);
	}

	// ensure the UI is closed so the user can interact with the content
	if (closeUi) {
		ctx.toggleEyasUI(false);
	}
}

/**
 * Navigates to a URL containing variables, substituting them with current environment data.
 * @param ctx The core context.
 * @param url The URL string containing variables (e.g. {url}/path).
 */
function navigateVariable(ctx: CoreContext, url: DomainUrl): void {
	const env = { url: ctx.$testDomainRaw || ``, key: ctx.$envKey };

	// substitute all Eyas-managed env variables (_env.url, _env.key, testdomain)
	const output = substituteEnvVariables(url, env);

	// if substitution returned null, the env url is required but not yet set
	if (output === null) {
		if (!ctx.$appWindow) { return; }

		// alert the user that they need to select an environment first
		dialog.showMessageBoxSync(ctx.$appWindow, {
			type: `warning`,
			buttons: [`OK`],
			title: `Select an Environment`,
			message: `You must select an environment before you can use this link`
		});

		return;
	}

	// if the url still has user-input variables
	if (hasRemainingVariables(output)) {
		// send request to the UI layer
		ctx.uiEvent(`show-variables-modal`, output);
	} else {
		// just pass through to navigate
		navigate(ctx, parseURL(output)?.toString());
	}
}

/**
 * Handles navigation logic for no domains or a single domain.
 * @param ctx The core context.
 * @returns True if navigation was handled.
 */
function handleSimpleDomainNavigation(ctx: CoreContext): IsActive {
	// if there are no custom domains defined
	if (!ctx.$config?.domains.length) {
		console.log(`No domains defined, navigating...`);
		// load the test using the default domain
		navigate(ctx);
		return true;
	}

	// if the user has a single custom domain
	if (ctx.$config?.domains.length === 1) {
		console.log(`Single domain defined, navigating...`);
		// update the default domain and env key
		const parsed = parseURL(ctx.$testDomainRaw || ``);
		ctx.setTestDomain(parsed instanceof URL ? (parsed.toString() as DomainUrl) : ctx.$testDomain);
		ctx.setEnvKey(ctx.$config.domains[0].key ?? null);

		// directly load the user's test using the new default domain
		navigate(ctx);
		return true;
	}

	return false;
}

/**
 * Handles navigation logic for multiple custom domains, potentially showing the environment chooser.
 * @param ctx The core context.
 * @param forceShow Whether to force show the environment chooser modal.
 */
function handleMultiDomainNavigation(ctx: CoreContext, forceShow: IsActive): void {
	if (!ctx.$config || ctx.$config.domains.length <= 1) { return; }

	const currentHash = hashDomains(ctx.$config.domains);
	const envSettings = settingsService.get(`env`, ctx.$config.meta.projectId ?? undefined) as EnvironmentSettings | undefined;
	const alwaysChoose = envSettings?.alwaysChoose;
	const lastChoice = envSettings?.lastChoice;
	const lastHash = envSettings?.lastChoiceHash;

	// skip the modal if the user opted out AND the domain list hasn't changed AND it's not a forced show
	if (!forceShow && alwaysChoose && lastChoice && lastHash === currentHash) {
		// auto-select the previously chosen environment
		ctx.setTestDomainRaw(lastChoice.url);
		const parsed = parseURL(lastChoice.url);
		ctx.setTestDomain(parsed instanceof URL ? (parsed.toString() as DomainUrl) : ctx.$testDomain);
		ctx.setEnvKey(lastChoice.key ?? null);
		navigate(ctx);
	} else {
		// display the environment chooser modal
		ctx.setIsEnvironmentPending(true);
		ctx.uiEvent(`show-environment-modal`, ctx.$config.domains, {
			projectId: ctx.$config.meta.projectId ?? undefined,
			alwaysChoose: !!alwaysChoose,
			domainsHash: currentHash,
			forceShow
		});
		ctx.setMenu();
	}
}

/**
 * Checks for a version mismatch between the runner and the test builder.
 * @param ctx The core context.
 */
function checkVersionMismatch(ctx: CoreContext): void {
	// if the runner is older than the version that built the test
	if (ctx.$config?.meta.eyas && semver.lt(ctx._appVersion, ctx.$config.meta.eyas)) {
		// send request to the UI layer
		ctx.uiEvent(`show-version-mismatch-modal`, ctx._appVersion, ctx.$config.meta.eyas);
	}
}

/**
 * Refreshes the application state and navigates to the test source.
 * @param ctx The core context.
 * @param forceShow Whether to force show the environment chooser.
 */
async function startAFreshTest(ctx: CoreContext, forceShow = false): Promise<void> {
	await resetFreshTestState(ctx);
	initFreshTestViewports(ctx);
	ctx.setMenu();
	setupFreshTestSource(ctx);

	if (!handleSimpleDomainNavigation(ctx)) {
		handleMultiDomainNavigation(ctx, forceShow);
	}

	checkVersionMismatch(ctx);
}

/**
 * Resets the test state including server and initialization flags.
 * @param ctx The core context.
 */
async function resetFreshTestState(ctx: CoreContext): Promise<void> {
	// stop test server when test changes
	if (testServerService.getState()) {
		await ctx.stopTestServer();
	}

	// clear the cached port for the test server
	testServerService.clearPort();

	// reset initialization state
	ctx.setIsInitializing(true);

	// Reset test server settings
	testServerService.resetSettings(ctx);
}

/**
 * Initializes the viewports based on the configuration and defaults.
 * @param ctx The core context.
 */
function initFreshTestViewports(ctx: CoreContext): void {
	// set the available viewports
	ctx.setAllViewports([...(ctx.$config?.viewports || []), ...ctx.$defaultViewports]);

	// reset the current viewport to the first in the list
	ctx.$currentViewport[0] = ctx.$allViewports[0].width;
	ctx.$currentViewport[1] = ctx.$allViewports[0].height;
	ctx.$appWindow?.setContentSize(ctx.$currentViewport[0], ctx.$currentViewport[1] + EYAS_HEADER_HEIGHT);
}

/**
 * Sets up the source path and domain information for the test.
 * @param ctx The core context.
 */
function setupFreshTestSource(ctx: CoreContext): void {
	// reset the path to the test source
	ctx.$paths.testSrc = ctx.$config?.source || ``;

	// check if $config.source is a url
	const sourceOnWeb = parseURL(ctx.$config?.source || ``);
	if (sourceOnWeb) {
		ctx.setTestDomainRaw(ctx.$config?.source || ``);
		ctx.setTestDomain(sourceOnWeb.toString() as DomainUrl);
		ctx.setEnvKey(null); // source URLs have no key
	}
}

/**
 * Calculates the application title with current page and environment context.
 * @param ctx The core context.
 * @param rawPageTitle The raw page title from the browser.
 * @returns The formatted application title.
 */
function getAppTitleWithContext(ctx: CoreContext, rawPageTitle?: AppTitle): AppTitle {
	const webContents = ctx.$testLayer?.webContents || ctx.$appWindow?.webContents;
	const rawUrl = webContents ? webContents.getURL() : null;

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
function onTitleUpdate(ctx: CoreContext, evt: PreventableEvent, title: AppTitle): void {
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
function hashDomains(domains: unknown[]): HashString {
	const str = JSON.stringify(domains);
	let h = 5381;
	for (let i = 0; i < str.length; i++) { h = (h * 33) ^ str.charCodeAt(i); }
	return (h >>> 0).toString(16);
}

export const navigationService = {
	navigate,
	navigateVariable,
	startAFreshTest,
	getAppTitleWithContext,
	onTitleUpdate
};
