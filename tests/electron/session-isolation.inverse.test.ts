import { describe, test, expect, vi, beforeEach } from 'vitest';
import { session, BrowserWindow, WebContentsView } from 'electron';
import { windowService } from '@core/window.service.js';
import { setupEyasNetworkHandlers, setupWebRequestInterception } from '@core/protocol-handlers.js';
import { EYAS_UI_PARTITION, getTestPartition } from '@scripts/constants.js';
import type { CoreContext } from '@registry/eyas-core.js';
import type { SessionPartition } from '@registry/primitives.js';
import type { CoreMockPartitionSession, CoreMockMutableContext } from '@test-registry/eyas-core.mocks.js';

// Unlike index-refactor.test.ts (which returns one shared session for every
// partition), this mock returns a DISTINCT session object per partition string.
// That's what makes inverse assertions possible: we can prove a handler was
// NOT registered on a given session, not just that it was registered somewhere.
vi.mock(`electron`, () => {
	const sessions = new Map<SessionPartition, unknown>();

	function makeSession(): unknown {
		return {
			protocol: {
				handle: vi.fn()
			},
			webRequest: {
				onBeforeRequest: vi.fn()
			},
			fetch: vi.fn()
		};
	}

	function MockBrowserWindow(): unknown {
		return {
			getContentSize: vi.fn().mockReturnValue([800, 600]),
			loadURL: vi.fn(),
			setTitle: vi.fn(),
			isDestroyed: vi.fn().mockReturnValue(false),
			on: vi.fn(),
			webContents: {
				on: vi.fn(),
				isDestroyed: vi.fn().mockReturnValue(false)
			},
			contentView: {
				addChildView: vi.fn()
			}
		};
	}

	function MockWebContentsView(): unknown {
		return {
			setBounds: vi.fn(),
			setBackgroundColor: vi.fn(),
			webContents: {
				loadURL: vi.fn(),
				on: vi.fn(),
				isDestroyed: vi.fn().mockReturnValue(false)
			}
		};
	}

	return {
		session: {
			fromPartition: vi.fn((partition: SessionPartition) => {
				if (!sessions.has(partition)) {
					sessions.set(partition, makeSession());
				}
				return sessions.get(partition);
			})
		},
		BrowserWindow: vi.fn().mockImplementation(MockBrowserWindow),
		WebContentsView: vi.fn().mockImplementation(MockWebContentsView)
	};
});

vi.mock(`@core/metrics-events.js`, () => ({ MP_EVENTS: { core: { launch: `launch` } } }));

const TEST_ID = `custom-test-id`;

function getMockSession(partition: SessionPartition): CoreMockPartitionSession {
	return session.fromPartition(partition) as unknown as CoreMockPartitionSession;
}

describe(`Session Isolation — inverse scenarios (what must NOT happen)`, () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe(`Scenario: Protocol handlers must not leak across sessions`, () => {
		test(`should NOT register the eyas or https handlers on the UI session`, () => {
			const ctx = {
				$config: { meta: { testId: TEST_ID } },
				$paths: { uiSource: ``, testSrc: `` }
			} as unknown as CoreContext;

			setupEyasNetworkHandlers(ctx);

			const uiSession = getMockSession(EYAS_UI_PARTITION);
			const registeredSchemes = uiSession.protocol.handle.mock.calls.map(call => call[0]);
			expect(registeredSchemes).not.toContain(`eyas`);
			expect(registeredSchemes).not.toContain(`https`);
			// only the ui scheme belongs here
			expect(registeredSchemes).toEqual([`ui`]);
		});

		test(`should NOT register the ui handler on the test session`, () => {
			const ctx = {
				$config: { meta: { testId: TEST_ID } },
				$paths: { uiSource: ``, testSrc: `` }
			} as unknown as CoreContext;

			setupEyasNetworkHandlers(ctx);

			const testSession = getMockSession(getTestPartition(TEST_ID));
			const registeredSchemes = testSession.protocol.handle.mock.calls.map(call => call[0]);
			expect(registeredSchemes).not.toContain(`ui`);
			expect(registeredSchemes).toEqual([`eyas`, `https`]);
		});

		test(`should NOT create or touch any session when config is missing`, () => {
			const ctx = { $config: null } as unknown as CoreContext;

			setupEyasNetworkHandlers(ctx);

			// no config means no testId — creating a session here would mint a
			// bogus partition (e.g. persist:undefined-test) on disk
			expect(session.fromPartition).not.toHaveBeenCalled();
		});
	});

	describe(`Scenario: Network interception must not attach to the UI session`, () => {
		test(`should NOT register onBeforeRequest on the UI session`, () => {
			const ctx = {
				$config: { meta: { testId: TEST_ID } }
			} as unknown as CoreContext;

			setupWebRequestInterception(ctx);

			const uiSession = getMockSession(EYAS_UI_PARTITION);
			const testSession = getMockSession(getTestPartition(TEST_ID));
			expect(uiSession.webRequest.onBeforeRequest).not.toHaveBeenCalled();
			expect(testSession.webRequest.onBeforeRequest).toHaveBeenCalledTimes(1);
		});

		test(`should NOT block ui:// requests even when the network is disabled`, () => {
			const ctx = {
				$config: { meta: { testId: TEST_ID } },
				$testNetworkEnabled: false
			} as unknown as CoreContext;

			setupWebRequestInterception(ctx);

			const testSession = getMockSession(getTestPartition(TEST_ID));
			const interceptor = testSession.webRequest.onBeforeRequest.mock.calls[0]?.[1];
			expect(interceptor).toBeDefined();

			// the UI must keep working while the user has the network toggled off
			const uiCallback = vi.fn();
			interceptor({ url: `ui://eyas.interface/index.html` }, uiCallback);
			expect(uiCallback).toHaveBeenCalledWith({ cancel: false });

			// sanity check the inverse isn't passing because blocking is broken entirely
			const webCallback = vi.fn();
			interceptor({ url: `https://example.com/` }, webCallback);
			expect(webCallback).toHaveBeenCalledWith({ cancel: true });
		});
	});

	describe(`Scenario: Preloads must not cross layer boundaries`, () => {
		test(`should NOT inject the test preload into the UI layer, nor the event bridge into the test layer`, () => {
			const ctx = {
				$appWindow: null,
				$currentViewport: [800, 600],
				$paths: { testPreload: `test-preload.js`, eventBridge: `event-bridge.js`, icon: `icon.png` },
				$config: { meta: { testId: TEST_ID } },
				setAppWindow: vi.fn(),
				setEyasLayer: vi.fn(),
				setTestLayer: vi.fn(),
				getAppTitle: vi.fn().mockReturnValue(`Eyas`)
			} as unknown as CoreContext;

			windowService.createAppWindow(ctx);
			(ctx as unknown as CoreMockMutableContext).$appWindow = new BrowserWindow();
			windowService.initEyasLayer(ctx, new BrowserWindow(), performance.now());

			const mockWebContentsView = vi.mocked(WebContentsView);
			const testLayerPrefs = mockWebContentsView.mock.calls[0]?.[0]?.webPreferences;
			const eyasLayerPrefs = mockWebContentsView.mock.calls[1]?.[0]?.webPreferences;
			expect(testLayerPrefs).toBeDefined();
			expect(eyasLayerPrefs).toBeDefined();

			// the future recorder preload (test layer) must never run inside Eyas's own chrome
			expect(eyasLayerPrefs?.preload).not.toBe(`test-preload.js`);
			// and the UI event bridge must never be exposed to the app under test
			expect(testLayerPrefs?.preload).not.toBe(`event-bridge.js`);
		});

		test(`should NOT place the test layer on the UI partition, even without a config`, () => {
			const ctx = {
				$appWindow: null,
				$currentViewport: [800, 600],
				$paths: { testPreload: `test-preload.js`, eventBridge: `event-bridge.js`, icon: `icon.png` },
				$config: null,
				setAppWindow: vi.fn(),
				setEyasLayer: vi.fn(),
				setTestLayer: vi.fn(),
				getAppTitle: vi.fn().mockReturnValue(`Eyas`)
			} as unknown as CoreContext;

			windowService.createAppWindow(ctx);

			const mockWebContentsView = vi.mocked(WebContentsView);
			const testLayerPartition = mockWebContentsView.mock.calls[0]?.[0]?.webPreferences?.partition;
			expect(testLayerPartition).toBeDefined();
			expect(testLayerPartition).not.toBe(EYAS_UI_PARTITION);
			// a missing testId must fall back to `default`, never serialize `undefined`
			expect(testLayerPartition).not.toContain(`undefined`);
		});
	});
});
