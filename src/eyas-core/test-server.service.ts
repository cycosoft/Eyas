import { clipboard, shell } from 'electron';
import * as testServer from './test-server/test-server.js';
import * as testServerCerts from './test-server/test-server-certs.js';
import * as testServerTimeout from './test-server/test-server-timeout.js';
import { parseURL } from '@scripts/parse-url.js';
import * as settingsService from './settings-service.js';
import { TEST_SERVER_SESSION_DURATION_MS } from '@scripts/constants.js';
import { formatDuration } from '@scripts/time-utils.js';
import type { CoreContext } from '@registry/eyas-core.js';
import type { DomainUrl, FormattedDuration } from '@registry/primitives.js';

let $testServerMenuIntervalId: NodeJS.Timeout | null = null;

/**
 * Stops the test server and cleans up timeouts and menu intervals.
 * @param ctx The core context.
 */
async function stop(ctx: CoreContext): Promise<void> {
	if (ctx.$isInitializing) { return; }
	await testServer.stopTestServer();
	testServerTimeout.cancelTestServerTimeout();
	if ($testServerMenuIntervalId) {
		clearInterval($testServerMenuIntervalId);
		$testServerMenuIntervalId = null;
	}
	ctx.setMenu();
}

/**
 * Copies the test server URL to the clipboard.
 * @param ctx The core context.
 */
function copyUrl(ctx: CoreContext): void {
	if (ctx.$isInitializing) { return; }
	const state = testServer.getTestServerState();
	if (state) {
		const targetUrl = state.customUrl || state.url;
		if (targetUrl) {
			clipboard.writeText(targetUrl);
		}
	}
}

/**
 * Opens the test server in the default browser.
 * @param ctx The core context.
 * @param url Optional URL to open.
 */
function openInBrowser(ctx: CoreContext, url?: DomainUrl): void {
	if (ctx.$isInitializing) { return; }
	const state = testServer.getTestServerState();

	// use the provided url, or fall back to the test server state
	const targetUrl = url || state?.customUrl || state?.url;
	if (targetUrl) {
		shell.openExternal(targetUrl);
	}
}

/**
 * Shows the test server setup modal in the UI.
 * @param ctx The core context.
 */
async function showSetupModal(ctx: CoreContext): Promise<void> {
	if (ctx.$isInitializing) { return; }
	if (testServer.getTestServerState()) { return; }
	if (!ctx.$paths.testSrc) { return; }

	// reset the last options
	// ctx.resetTestServerSettings() is proxy for service.resetSettings()
	resetSettings(ctx);

	// Show simplified setup modal
	if (ctx.$eyasLayer) {
		const portHttp = await testServer.getAvailablePort(ctx.$testDomain, false);
		const portHttps = await testServer.getAvailablePort(ctx.$testDomain, true);
		const parsedTestDomain = parseURL(ctx.$testDomain);
		const hostnameForHosts = (parsedTestDomain instanceof URL ? parsedTestDomain.hostname : null) || `test.local`;
		const isWindows = process.platform === `win32`;

		const projectId = ctx.$config?.meta?.projectId || null;
		ctx.setTestServerHttpsEnabled(settingsService.get(`testServer.useHttps`, projectId ?? undefined) as boolean);
		const autoOpenBrowser = settingsService.get(`testServer.autoOpenBrowser`, projectId ?? undefined) as boolean;
		const useCustomDomain = settingsService.get(`testServer.useCustomDomain`, projectId ?? undefined) as boolean;

		ctx.uiEvent(`show-test-server-setup-modal`, {
			domain: `http://127.0.0.1`,
			portHttp,
			portHttps,
			hostnameForHosts,
			steps: [],
			useHttps: ctx.$testServerHttpsEnabled,
			autoOpenBrowser,
			useCustomDomain,
			projectId,
			isWindows
		});
	}
}

/**
 * Starts the test server with the specified options.
 * @param ctx The core context.
 * @param autoOpenBrowser Whether to automatically open the browser.
 * @param customDomain Optional custom domain to use.
 */
async function start(ctx: CoreContext, autoOpenBrowser = true, customDomain: DomainUrl | null = null): Promise<void> {
	let certs;
	if (ctx.$testServerHttpsEnabled) {
		try {
			certs = await testServerCerts.getCerts([`127.0.0.1`, `localhost`]);
		} catch (err) {
			console.error(`Live Test Server HTTPS cert generation failed:`, err);
			return;
		}
	}
	try {
		const options = {
			rootPath: ctx.$paths.testSrc || ``,
			useHttps: ctx.$testServerHttpsEnabled,
			certs: certs || undefined,
			customDomain: customDomain ?? undefined
		};
		await testServer.startTestServer(options);
		ctx.setLastTestServerOptions(options);
	} catch (err) {
		console.error(`Live Test server start failed:`, err);
		return;
	}
	testServerTimeout.startTestServerTimeout(ctx.onTestServerTimeout, TEST_SERVER_SESSION_DURATION_MS);
	$testServerMenuIntervalId = setInterval(() => { ctx.setMenu(); }, 60 * 1000);
	await ctx.setMenu();

	if (autoOpenBrowser) {
		openInBrowser(ctx);
	}

	const state = testServer.getTestServerState();
	if (state) {
		ctx.setTestServerEndTime(state.startedAt + TEST_SERVER_SESSION_DURATION_MS);
		ctx.uiEvent(`show-test-server-active-modal`, {
			domain: state.customUrl || state.url,
			startTime: state.startedAt,
			endTime: ctx.$testServerEndTime
		});
	}
}

/**
 * Handles the test server session timeout.
 * @param ctx The core context.
 */
function onTimeout(ctx: CoreContext): void {
	if (ctx.$appWindow && typeof ctx.$appWindow.flashFrame === `function`) {
		ctx.$appWindow.flashFrame(true);
	}
	stop(ctx);

	// Signal the UI that the session has expired
	ctx.uiEvent(`show-test-server-resume-modal`, formatDuration(TEST_SERVER_SESSION_DURATION_MS));
}

/**
 * Calculates the remaining time for the test server session.
 * @returns A formatted duration string.
 */
function getRemainingTime(): FormattedDuration {
	const s = testServer.getTestServerState();
	if (!s) { return ``; }
	const elapsed = Date.now() - s.startedAt;
	const remaining = TEST_SERVER_SESSION_DURATION_MS - elapsed;
	return formatDuration(remaining);
}

/**
 * Toggles the HTTPS setting for the test server.
 * @param ctx The core context.
 */
function toggleHttps(ctx: CoreContext): void {
	ctx.setTestServerHttpsEnabled(!ctx.$testServerHttpsEnabled);
	ctx.setMenu();
}

/**
 * Resets the test server settings.
 * @param ctx The core context.
 */
function resetSettings(ctx: CoreContext): void {
	ctx.setLastTestServerOptions(null);
}

export const testServerService = {
	stop,
	copyUrl,
	openInBrowser,
	showSetupModal,
	start,
	onTimeout,
	getRemainingTime,
	toggleHttps,
	resetSettings
};
