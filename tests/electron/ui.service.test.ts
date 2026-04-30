import { describe, test, expect, vi, beforeEach } from 'vitest';
import { uiService } from '@core/ui.service.js';
import { EYAS_HEADER_HEIGHT } from '@scripts/constants.js';
import type { CoreContext } from '@registry/eyas-core.js';
import type { ChannelName } from '@registry/primitives.js';
import type { AppSettings } from '@registry/core.js';
import type { ProjectSettings } from '@registry/settings.js';

// Mock settings service
vi.mock(`@core/settings-service.js`, () => ({
	getAppSettings: vi.fn(),
	getProjectSettings: vi.fn()
}));

import * as settingsService from '@core/settings-service.js';

describe(`ui.service.ts unit tests`, () => {
	let mockCtx: CoreContext;

	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();

		mockCtx = {
			$eyasLayer: {
				setBounds: vi.fn(),
				webContents: {
					focus: vi.fn(),
					isFocused: vi.fn().mockReturnValue(true),
					send: vi.fn()
				}
			},
			$currentViewport: [800, 600],
			$pendingStartupModal: null,
			$latestChangelogVersion: `1.1.0`,
			setPendingStartupModal: vi.fn().mockImplementation(modal => {
				mockCtx.$pendingStartupModal = modal;
			}),
			toggleEyasUI: vi.fn(),
			uiEvent: vi.fn(),
			triggerBufferedModal: vi.fn()
		} as unknown as CoreContext;
	});

	test(`toggleEyasUI(true) should restore full bounds and focus the layer`, () => {
		uiService.toggleEyasUI(mockCtx, true);
		expect(mockCtx.$eyasLayer?.setBounds).toHaveBeenCalledWith({ x: 0, y: 0, width: 800, height: 600 });
		expect(mockCtx.$eyasLayer?.webContents.focus).toHaveBeenCalled();
	});

	test(`toggleEyasUI(false) should close modals but NOT shrink by default`, () => {
		uiService.toggleEyasUI(mockCtx, false);
		expect(mockCtx.$eyasLayer?.webContents.send).toHaveBeenCalledWith(`close-modals`);
		expect(mockCtx.$eyasLayer?.setBounds).not.toHaveBeenCalled();
	});

	test(`toggleEyasUI(false, true) should close modals and shrink immediately`, () => {
		uiService.toggleEyasUI(mockCtx, false, true);
		expect(mockCtx.$eyasLayer?.webContents.send).toHaveBeenCalledWith(`close-modals`);
		expect(mockCtx.$eyasLayer?.setBounds).toHaveBeenCalledWith({ x: 0, y: 0, width: 800, height: EYAS_HEADER_HEIGHT });
	});

	test(`focusUI should focus the webContents`, () => {
		uiService.focusUI(mockCtx);
		expect(mockCtx.$eyasLayer?.webContents.focus).toHaveBeenCalledTimes(1);
	});

	test(`uiEvent should buffer if Whats New is required`, () => {
		vi.mocked(settingsService.getAppSettings).mockReturnValue({ lastSeenVersion: `1.0.0` });

		uiService.uiEvent(mockCtx, `some-event` as ChannelName, `arg1`);

		expect(mockCtx.setPendingStartupModal).toHaveBeenCalledWith({
			eventName: `some-event`,
			args: [`arg1`]
		});
		expect(mockCtx.$eyasLayer?.webContents.send).not.toHaveBeenCalled();
	});

	test(`uiEvent should not buffer if event is show-whats-new`, () => {
		vi.mocked(settingsService.getAppSettings).mockReturnValue({ lastSeenVersion: `1.0.0` });

		uiService.uiEvent(mockCtx, `show-whats-new` as ChannelName);

		expect(mockCtx.setPendingStartupModal).not.toHaveBeenCalled();
		expect(mockCtx.$eyasLayer?.webContents.send).toHaveBeenCalledWith(`show-whats-new`);
	});

	test(`triggerBufferedModal should clear and trigger`, () => {
		mockCtx.$pendingStartupModal = { eventName: `buffered-event` as ChannelName, args: [`buffered-arg`] };
		vi.mocked(settingsService.getAppSettings).mockReturnValue({ lastSeenVersion: `1.1.0` }); // No more Whats New

		uiService.triggerBufferedModal(mockCtx);

		expect(mockCtx.setPendingStartupModal).toHaveBeenCalledWith(null);
		expect(mockCtx.$eyasLayer?.webContents.send).toHaveBeenCalledWith(`buffered-event`, `buffered-arg`);
	});

	test(`checkStartupSequence should show Whats New if required`, () => {
		vi.mocked(settingsService.getAppSettings).mockReturnValue({ lastSeenVersion: `1.0.0` });

		uiService.checkStartupSequence(mockCtx);

		expect(mockCtx.$eyasLayer?.webContents.send).toHaveBeenCalledWith(`show-whats-new`);
	});

	test(`checkStartupSequence should release buffer if Whats New not required`, () => {
		vi.mocked(settingsService.getAppSettings).mockReturnValue({ lastSeenVersion: `1.1.0` });
		mockCtx.$pendingStartupModal = { eventName: `buffered` as ChannelName, args: [] };

		uiService.checkStartupSequence(mockCtx);

		expect(mockCtx.setPendingStartupModal).toHaveBeenCalledWith(null);
		expect(mockCtx.$eyasLayer?.webContents.send).toHaveBeenCalledWith(`buffered`);
	});

	test(`isWhatsNewRequired should return false if --skip-whats-new is present`, () => {
		const originalArgs = process.argv;
		process.argv = [...originalArgs, `--skip-whats-new`];

		expect(uiService.isWhatsNewRequired(mockCtx)).toBe(false);

		process.argv = originalArgs;
	});

	test(`isWhatsNewRequired should return true if versions mismatch`, () => {
		vi.mocked(settingsService.getAppSettings).mockReturnValue({ lastSeenVersion: `1.0.0` });
		expect(uiService.isWhatsNewRequired(mockCtx)).toBe(true);
	});

	test(`isWhatsNewRequired should return false if versions match`, () => {
		vi.mocked(settingsService.getAppSettings).mockReturnValue({ lastSeenVersion: `1.1.0` });
		expect(uiService.isWhatsNewRequired(mockCtx)).toBe(false);
	});

	test(`showSettings should trigger show-settings-modal with settings data`, () => {
		vi.mocked(settingsService.getAppSettings).mockReturnValue({ lastSeenVersion: `1.1.0` } as unknown as AppSettings);
		vi.mocked(settingsService.getProjectSettings).mockReturnValue({ testId: `test-proj` } as unknown as ProjectSettings);

		uiService.showSettings(mockCtx);

		expect(mockCtx.$eyasLayer?.webContents.send).toHaveBeenCalledWith(`show-settings-modal`, {
			project: { testId: `test-proj` } as unknown as ProjectSettings,
			app: { lastSeenVersion: `1.1.0` } as unknown as AppSettings,
			projectId: undefined
		});
	});
});
