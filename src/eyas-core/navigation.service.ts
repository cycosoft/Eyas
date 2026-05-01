import { shell, dialog } from 'electron';
import semver from 'semver';
import { parseURL } from '@scripts/parse-url.js';
import { substituteEnvVariables, hasRemainingVariables } from '@scripts/variable-utils.js';
import * as settingsService from './settings-service.js';
import type { CoreContext } from '@registry/eyas-core.js';
import type { DomainUrl, IsActive } from '@registry/primitives.js';
import type { EnvironmentSettings } from '@registry/settings.js';
import {
	isAppClosed,
	shouldOpenExternal,
	loadUrlInTestLayer,
	getAppTitleWithContext,
	onTitleUpdate,
	hashDomains
} from './navigation.logic.js';
import { testServerService } from './test-server.service.js';

/**
 * Navigates the application window to the specified path or the default test domain.
 * @param ctx The core context.
 * @param path Optional path to navigate to.
 * @param openInBrowser Whether to open the path in an external browser.
 */
function navigate(ctx: CoreContext, path?: DomainUrl, openInBrowser?: IsActive, closeUi: IsActive = true): void {
	if (isAppClosed(ctx)) { return; }

	// if the path wasn't provided (default to local test source)
	const runningTestSource = !path;
	const targetPath = path || ctx.$testDomain;

	if (shouldOpenExternal(openInBrowser, runningTestSource)) {
		shell.openExternal(targetPath);
	} else {
		loadUrlInTestLayer(ctx, targetPath);
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

	// if the substitution returned null, the env url is required but not yet set
	if (output === null) {
		if (!ctx.$appWindow || ctx.$appWindow.isDestroyed()) { return; }

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
		navigate(ctx, parseURL(output)?.toString() as DomainUrl);
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
	ctx.$appWindow?.setContentSize(ctx.$currentViewport[0], ctx.$currentViewport[1]);
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
 * Navigates the test layer back in history.
 * @param ctx The core context.
 */
function goBack(ctx: CoreContext): void {
	const webContents = ctx.$testLayer?.webContents || ctx.$appWindow?.webContents;
	if (ctx.$isInitializing || !webContents || webContents.isDestroyed()) { return; }
	webContents.navigationHistory.goBack();
}

/**
 * Navigates the test layer forward in history.
 * @param ctx The core context.
 */
function goForward(ctx: CoreContext): void {
	const webContents = ctx.$testLayer?.webContents || ctx.$appWindow?.webContents;
	if (ctx.$isInitializing || !webContents || webContents.isDestroyed()) { return; }
	webContents.navigationHistory.goForward();
}

/**
 * Reloads the test layer, ignoring cache.
 * @param ctx The core context.
 */
function reload(ctx: CoreContext): void {
	const webContents = ctx.$testLayer?.webContents || ctx.$appWindow?.webContents;
	if (ctx.$isInitializing || !webContents || webContents.isDestroyed()) { return; }
	webContents.reloadIgnoringCache();
}

export const navigationService = {
	navigate,
	navigateVariable,
	startAFreshTest,
	getAppTitleWithContext,
	onTitleUpdate,
	goBack,
	goForward,
	reload
};
