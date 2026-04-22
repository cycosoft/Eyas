import { describe, test, expect, vi, beforeEach } from 'vitest';
import { dialog } from 'electron';
import fs from 'node:fs';
import _path from 'node:path';
import { appService } from '@core/app.service.js';
import type { CoreContext } from '@registry/eyas-core.js';
import type { PreventableEvent } from '@registry/core.js';
import { app } from 'electron';
import { isPast } from 'date-fns/isPast';
import { analyticsService } from '@core/analytics.service.js';
import * as settingsService from '@core/settings-service.js';
import { setupEyasNetworkHandlers } from '@core/protocol-handlers.js';

// Mock electron
vi.mock(`electron`, () => ({
	app: {
		setAsDefaultProtocolClient: vi.fn(),
		quit: vi.fn(),
		on: vi.fn()
	},
	dialog: {
		showMessageBox: vi.fn(),
		showErrorBox: vi.fn(),
		showMessageBoxSync: vi.fn()
	},
	nativeTheme: {
		themeSource: `system`
	}
}));

// Mock fs and path
vi.mock(`node:fs`, () => ({
	default: {
		existsSync: vi.fn(),
		statSync: vi.fn()
	},
	readFileSync: vi.fn().mockReturnValue(`{"version": "1.0.0"}`)
}));

vi.mock(`node:path`, () => ({
	default: {
		join: vi.fn((...args) => args.join(`/`)),
		resolve: vi.fn((...args) => args.join(`/`))
	},
	join: vi.fn((...args) => args.join(`/`)),
	resolve: vi.fn((...args) => args.join(`/`))
}));

// Mock date-fns
vi.mock(`date-fns/formatDistanceToNow`, () => ({
	formatDistanceToNow: vi.fn().mockReturnValue(`2 hours`)
}));

vi.mock(`date-fns/isPast`, () => ({
	isPast: vi.fn().mockReturnValue(false)
}));

vi.mock(`date-fns/format`, () => ({
	format: vi.fn().mockReturnValue(`formatted date`)
}));

vi.mock(`@core/analytics.service.js`, () => ({
	analyticsService: {
		init: vi.fn().mockResolvedValue(undefined),
		trackEvent: vi.fn().mockResolvedValue(undefined)
	}
}));

vi.mock(`@core/settings-service.js`, () => ({
	get: vi.fn().mockReturnValue(`system`),
	load: vi.fn().mockResolvedValue(undefined)
}));

vi.mock(`../scripts/get-config.js`, () => ({
	default: vi.fn().mockResolvedValue({})
}));

vi.mock(`@core/protocol-handlers.js`, () => ({
	setupEyasNetworkHandlers: vi.fn()
}));

describe(`app.service.ts unit tests`, () => {
	let mockCtx: CoreContext;

	beforeEach(() => {
		vi.clearAllMocks();

		mockCtx = {
			$appWindow: {
				webContents: {
					session: {
						clearCache: vi.fn(),
						clearStorageData: vi.fn(),
						getStoragePath: vi.fn().mockReturnValue(`/mock/storage`)
					}
				}
			},
			$config: {
				title: `Test App`,
				version: `1.0.0`,
				meta: {
					expires: new Date().toISOString(),
					gitBranch: `main`,
					gitHash: `abc123`,
					gitUser: `test-user`,
					compiled: Date.now(),
					eyas: `1.0.0`
				}
			},
			$paths: { icon: `icon.png`, testSrc: `foo/bar` },
			_appVersion: `1.0.0`,
			setMenu: vi.fn(),
			uiEvent: vi.fn(),
			trackEvent: vi.fn(),
			stopTestServer: vi.fn(),
			setConfig: vi.fn(),
			setConfigToLoad: vi.fn(),
			startAFreshTest: vi.fn(),
			$configToLoad: { method: `AUTO`, path: `` }
		} as unknown as CoreContext;
	});

	test(`showAbout should call dialog.showMessageBox`, () => {
		appService.showAbout(mockCtx);
		expect(dialog.showMessageBox).toHaveBeenCalledWith(mockCtx.$appWindow, expect.objectContaining({
			title: `About`,
			icon: `icon.png`
		}));
	});

	test(`clearCache should clear session data and set menu`, () => {
		appService.clearCache(mockCtx);
		expect(mockCtx.$appWindow?.webContents.session.clearCache).toHaveBeenCalled();
		expect(mockCtx.$appWindow?.webContents.session.clearStorageData).toHaveBeenCalled();
		expect(mockCtx.setMenu).toHaveBeenCalled();
	});

	test(`getSessionAge should return formatted duration`, () => {
		vi.mocked(fs.existsSync).mockReturnValue(true);
		vi.mocked(fs.statSync).mockReturnValue({ birthtime: new Date() } as unknown as fs.Stats);

		const age = appService.getSessionAge(mockCtx);
		expect(age).toBe(`2 hours`);
		expect(fs.existsSync).toHaveBeenCalledWith(`/mock/storage/Session Storage`);
	});

	test(`manageAppClose should prevent default and trigger exit modal`, () => {
		const evt = { preventDefault: vi.fn() } as unknown as PreventableEvent;
		appService.manageAppClose(mockCtx, evt);

		expect(evt.preventDefault).toHaveBeenCalled();
		expect(mockCtx.uiEvent).toHaveBeenCalledWith(`modal-exit-visible`, true);
		expect(mockCtx.trackEvent).toHaveBeenCalled();
	});

	test(`onTestServerTimeout should trigger ui event and stop server`, () => {
		appService.onTestServerTimeout(mockCtx);
		expect(mockCtx.uiEvent).toHaveBeenCalledWith(`test-server-timeout`);
		expect(mockCtx.stopTestServer).toHaveBeenCalled();
	});

	test(`setupProtocols should set eyas as default protocol client`, () => {
		appService.setupProtocols(mockCtx);
		expect(app.setAsDefaultProtocolClient).toHaveBeenCalledWith(`eyas`);
	});

	test(`checkExpiration should show dialog and quit if expired`, () => {
		vi.mocked(isPast).mockReturnValue(true);

		appService.checkExpiration(mockCtx);

		expect(dialog.showMessageBoxSync).toHaveBeenCalled();
		expect(app.quit).toHaveBeenCalled();
	});

	test(`checkExpiration should return early if not expired`, () => {
		vi.mocked(isPast).mockReturnValue(false);
		vi.clearAllMocks(); // clear previous calls

		appService.checkExpiration(mockCtx);

		expect(dialog.showMessageBoxSync).not.toHaveBeenCalled();
		expect(app.quit).not.toHaveBeenCalled();
	});

	test(`trackEvent should initialize and track with analyticsService`, async () => {
		await appService.trackEvent(mockCtx, `test-event`, { some: `data` });
		expect(analyticsService.init).toHaveBeenCalled();
		expect(analyticsService.trackEvent).toHaveBeenCalledWith(`test-event`, mockCtx.$config, mockCtx._appVersion, { some: `data` });
	});

	test(`handleReady should set config and load settings`, async () => {
		await appService.handleReady(mockCtx);

		expect(mockCtx.setConfig).toHaveBeenCalled();
		expect(settingsService.load).toHaveBeenCalled();
		expect(setupEyasNetworkHandlers).toHaveBeenCalledWith(mockCtx);
	});
});
