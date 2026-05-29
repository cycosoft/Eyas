import { describe, it, expect, vi } from 'vitest';
import type { ProgressBytes, EventType, IsComputable, TimestampMS, DomainUrl } from '@registry/primitives.js';

type ProgressEventInit = {
	lengthComputable: IsComputable;
	loaded: ProgressBytes;
	total: ProgressBytes;
};

// Mock electron before importing the file
vi.mock(`electron`, () => ({
	contextBridge: {
		exposeInMainWorld: vi.fn()
	},
	ipcRenderer: {
		send: vi.fn(),
		on: vi.fn()
	}
}));

import { ipcRenderer } from 'electron';


// Mock browser globals that are used in the file
const mockDocument = {
	createElement: vi.fn(() => ({
		textContent: ``
	})),
	documentElement: {
		appendChild: vi.fn()
	}
};

const mockProcess = {
	once: vi.fn(),
	on: vi.fn()
};

vi.stubGlobal(`document`, mockDocument);
vi.stubGlobal(`process`, mockProcess);

// Import the functions
// Note: We use .js extension as per project rules
import { injectWithAnonymousScope, extractFunctionBody, polyfillUploadProgress, setupFormSubmitListener } from '@scripts/test-preload.js';

describe(`test-preload`, () => {
	describe(`utility functions`, () => {
		it(`extractFunctionBody should extract the body of a function`, () => {
			function testFn(): TimestampMS {
				const x = 1;
				return x;
			}
			const body = extractFunctionBody(testFn);
			expect(body).toContain(`const x = 1;`);
			expect(body).toContain(`return x;`);
			expect(body).not.toContain(`function testFn()`);
		});

		it(`injectWithAnonymousScope should wrap function body in anonymous scope`, () => {
			function testFn(): void {
				const x = 1;
				void x;
			}
			const injected = injectWithAnonymousScope(testFn);
			expect(injected).toContain(`(() => {`);
			expect(injected).toContain(`const x = 1;`);
			expect(injected).toContain(`})();`);
		});
	});

	describe(`polyfillUploadProgress`, () => {
		it(`should be a function`, () => {
			expect(typeof polyfillUploadProgress).toBe(`function`);
		});

		it(`should modify XMLHttpRequest prototype when called`, () => {
			const originalSend = function(): void {};
			const mockXHR = {
				prototype: {
					send: originalSend
				}
			};

			vi.stubGlobal(`XMLHttpRequest`, mockXHR);
			vi.stubGlobal(`performance`, { now: vi.fn() });

			polyfillUploadProgress();

			expect(mockXHR.prototype.send).not.toBe(originalSend);
			expect(typeof mockXHR.prototype.send).toBe(`function`);
		});

		it(`should dispatch initial progress event and calculate fileBytes for strings`, () => {
			const originalSend = vi.fn();
			class MockXHR {
				upload = { dispatchEvent: vi.fn() };
				addEventListener = vi.fn();
				send(..._args: unknown[]): void {}
			}
			MockXHR.prototype.send = originalSend;

			vi.stubGlobal(`XMLHttpRequest`, MockXHR);
			vi.stubGlobal(`performance`, { now: vi.fn(() => 0) });
			vi.stubGlobal(`ProgressEvent`, class {
				type: EventType;
				lengthComputable: IsComputable;
				loaded: ProgressBytes;
				total: ProgressBytes;
				constructor(type: EventType, init: ProgressEventInit) {
					this.type = type;
					this.lengthComputable = init.lengthComputable;
					this.loaded = init.loaded;
					this.total = init.total;
				}
			});

			polyfillUploadProgress();

			const xhr = new MockXHR();
			const data = `test-data`;
			xhr.send(data);

			// Should have called dispatchEvent with (0, data.length)
			expect(xhr.upload.dispatchEvent).toHaveBeenCalledWith(expect.objectContaining({
				type: `progress`,
				loaded: 0,
				total: data.length
			}));

			// Should have called original send
			expect(originalSend).toHaveBeenCalled();
		});
	});

	describe(`setupFormSubmitListener`, () => {
		it(`should trigger save-login-attempt IPC on submit`, () => {
			const mockLocation = { origin: `https://test.eyas` };
			vi.stubGlobal(`location`, mockLocation);

			// Setup document event listener stub
			const listeners: Record<EventType, ((e: Event) => void)[]> = {};
			const mockWindow = {
				location: { origin: `https://test.eyas` as DomainUrl },
				addEventListener: vi.fn((event: EventType, cb: (e: Event) => void) => {
					if (!listeners[event]) { listeners[event] = []; }
					listeners[event].push(cb);
				})
			};
			vi.stubGlobal(`window`, mockWindow);

			setupFormSubmitListener();

			expect(mockWindow.addEventListener).toHaveBeenCalledWith(`submit`, expect.any(Function), true);

			// Simulate submit event
			const formSubmitHandler = listeners[`submit`][0];

			// Mock DOM inputs
			const usernameInput = { value: `testUser`, type: `text` };
			const passwordInput = { value: `testPass`, type: `password` };

			type DomSelector = string;
			const mockForm = {
				querySelectorAll: vi.fn((selector: DomSelector) => {
					if (selector.includes(`type="password"`)) {
						return [passwordInput];
					}
					return [usernameInput];
				})
			};

			const mockEvent = {
				target: mockForm,
				preventDefault: vi.fn()
			};

			formSubmitHandler(mockEvent as unknown as Event);

			expect(ipcRenderer.send).toHaveBeenCalledWith(`save-login-attempt`, expect.objectContaining({
				origin: `https://test.eyas`,
				username: `testUser`,
				passwordPlain: `testPass`
			}));
		});
	});
});

