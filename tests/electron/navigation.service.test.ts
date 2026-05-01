import { describe, test, expect, vi, beforeEach } from 'vitest';
import { shell, dialog } from 'electron';
import { navigationService } from '@core/navigation.service.js';
import { testServerService } from '@core/test-server.service.js';
import type { CoreContext } from '@registry/eyas-core.js';
import type { DomainUrl } from '@registry/primitives.js';
import type { PreventableEvent } from '@registry/core.js';

// Mock electron
vi.mock(`electron`, () => ({
	shell: {
		openExternal: vi.fn()
	},
	dialog: {
		showMessageBoxSync: vi.fn()
	}
}));

// Mock other modules
vi.mock(`@core/test-server.service.js`, () => ({
	testServerService: {
		getState: vi.fn(),
		clearPort: vi.fn(),
		resetSettings: vi.fn()
	}
}));

vi.mock(`@core/settings-service.js`, () => ({
	get: vi.fn(),
	save: vi.fn()
}));

vi.mock(`@scripts/parse-url.js`, () => ({
	parseURL: vi.fn(url => (url.startsWith(`http`) ? new URL(url) : null))
}));

vi.mock(`@scripts/variable-utils.js`, () => ({
	substituteEnvVariables: vi.fn((url, env) => url.replace(`{url}`, env.url)),
	hasRemainingVariables: vi.fn(() => false)
}));

vi.mock(`@scripts/get-app-title.js`, () => ({
	getAppTitle: vi.fn().mockReturnValue(`App Title`),
	sanitizePageTitle: vi.fn(title => title)
}));

import { substituteEnvVariables } from '@scripts/variable-utils.js';

describe(`navigation.service.ts unit tests`, () => {
	let mockCtx: CoreContext;

	beforeEach(() => {
		vi.clearAllMocks();
		mockCtx = {
			$appWindow: {
				setTitle: vi.fn(),
				setContentSize: vi.fn(),
				isDestroyed: vi.fn().mockReturnValue(false),
				webContents: {
					getURL: vi.fn().mockReturnValue(`https://test.com`),
					navigationHistory: {
						canGoBack: vi.fn().mockReturnValue(true),
						canGoForward: vi.fn().mockReturnValue(true),
						goBack: vi.fn(),
						goForward: vi.fn()
					},
					isDestroyed: vi.fn().mockReturnValue(false),
					reloadIgnoringCache: vi.fn(),
					loadURL: vi.fn()
				}
			},
			$testLayer: {
				isDestroyed: vi.fn().mockReturnValue(false),
				webContents: {
					getURL: vi.fn().mockReturnValue(`https://test.com`),
					navigationHistory: {
						canGoBack: vi.fn().mockReturnValue(true),
						canGoForward: vi.fn().mockReturnValue(true),
						goBack: vi.fn(),
						goForward: vi.fn()
					},
					isDestroyed: vi.fn().mockReturnValue(false),
					reloadIgnoringCache: vi.fn(),
					loadURL: vi.fn()
				}
			},
			$testDomain: `https://default.com` as DomainUrl,
			$testDomainRaw: `https://default.com` as DomainUrl,
			$envKey: `prod`,
			$config: {
				domains: [],
				meta: { projectId: `test-project` }
			},
			$allViewports: [{ width: 100, height: 100 }],
			$currentViewport: [0, 0],
			$defaultViewports: [{ width: 800, height: 600 }],
			$paths: { testSrc: `` },
			_appVersion: `1.0.0`,
			toggleEyasUI: vi.fn(),
			setMenu: vi.fn(),
			setIsInitializing: vi.fn(),
			setIsEnvironmentPending: vi.fn(),
			uiEvent: vi.fn(),
			setTestDomain: vi.fn(),
			setTestDomainRaw: vi.fn(),
			setEnvKey: vi.fn(),
			setAllViewports: vi.fn(),
			stopTestServer: vi.fn()
		} as unknown as CoreContext;
	});

	test(`navigate should use default domain if path is missing`, () => {
		navigationService.navigate(mockCtx);
		expect(mockCtx.$testLayer?.webContents.loadURL).toHaveBeenCalledWith(`https://default.com`);
		expect(mockCtx.toggleEyasUI).toHaveBeenCalledWith(false);
	});

	test(`navigate should open in browser if requested and not local test`, () => {
		navigationService.navigate(mockCtx, `https://external.com` as DomainUrl, true);
		expect(shell.openExternal).toHaveBeenCalledWith(`https://external.com`);
		expect(mockCtx.$testLayer?.webContents.loadURL).not.toHaveBeenCalled();
		expect(mockCtx.toggleEyasUI).toHaveBeenCalledWith(false); // Default behavior
	});

	test(`navigate should NOT close UI if closeUi is false`, () => {
		navigationService.navigate(mockCtx, `https://external.com` as DomainUrl, true, false);
		expect(shell.openExternal).toHaveBeenCalledWith(`https://external.com`);
		expect(mockCtx.toggleEyasUI).not.toHaveBeenCalled();
	});

	test(`navigateVariable should substitute variables and navigate`, () => {
		navigationService.navigateVariable(mockCtx, `{url}/path` as DomainUrl);
		expect(mockCtx.$testLayer?.webContents.loadURL).toHaveBeenCalledWith(`https://default.com/path`);
	});

	test(`navigateVariable should show warning if env url is missing`, () => {
		mockCtx.$testDomainRaw = null;
		vi.mocked(substituteEnvVariables).mockReturnValueOnce(null);

		navigationService.navigateVariable(mockCtx, `{url}/path` as DomainUrl);
		expect(dialog.showMessageBoxSync).toHaveBeenCalled();
	});

	test(`startAFreshTest should reset state and navigate`, async () => {
		await navigationService.startAFreshTest(mockCtx);
		expect(testServerService.clearPort).toHaveBeenCalled();
		expect(mockCtx.setIsInitializing).toHaveBeenCalledWith(true);
		expect(mockCtx.$testLayer?.webContents.loadURL).toHaveBeenCalled();
	});

	test(`getAppTitleWithContext should return formatted title`, () => {
		const title = navigationService.getAppTitleWithContext(mockCtx, `Page Title`);
		expect(title).toBe(`App Title`);
	});

	test(`onTitleUpdate should prevent default and set window title`, () => {
		const evt = { preventDefault: vi.fn() };
		navigationService.onTitleUpdate(mockCtx, evt as PreventableEvent, `New Title`);
		expect(evt.preventDefault).toHaveBeenCalled();
		expect(mockCtx.$appWindow?.setTitle).toHaveBeenCalledWith(`App Title`);
	});

	test(`goBack should call webContents navigationHistory.goBack`, () => {
		const mockGoBack = vi.fn();
		const testLayer = mockCtx.$testLayer as NonNullable<CoreContext[`$testLayer`]>;
		testLayer.webContents.navigationHistory.goBack = mockGoBack;
		navigationService.goBack(mockCtx);
		expect(mockGoBack).toHaveBeenCalled();
	});

	test(`goForward should call webContents navigationHistory.goForward`, () => {
		const mockGoForward = vi.fn();
		const testLayer = mockCtx.$testLayer as NonNullable<CoreContext[`$testLayer`]>;
		testLayer.webContents.navigationHistory.goForward = mockGoForward;
		navigationService.goForward(mockCtx);
		expect(mockGoForward).toHaveBeenCalled();
	});

	test(`reload should call webContents reloadIgnoringCache`, () => {
		const mockReload = vi.fn();
		const testLayer = mockCtx.$testLayer as NonNullable<CoreContext[`$testLayer`]>;
		testLayer.webContents.reloadIgnoringCache = mockReload;
		navigationService.reload(mockCtx);
		expect(mockReload).toHaveBeenCalled();
	});
});
