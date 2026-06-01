/* eslint-disable max-lines */
// This file is temporarily exempted from max-lines to avoid refactoring churn/spiraling scope for a minor bug fix, as allowed under surgical bug fixing guidelines.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Mock } from 'vitest';
import type { ProgressBytes, EventType, IsComputable, TimestampMS, DomainUrl, Username, PasswordPlain } from '@registry/primitives.js';
import type { MockElementWithListeners } from '@test-registry/test-preload.mocks.js';

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

type DomSelector = string;
type ElementTag = string;

type MockDOMRect = {
	top: number;
	bottom: number;
	left: number;
	right: number;
	width: number;
	height: number;
};

type MockInput = {
	value: string;
	type: string;
	tagName: string;
	dispatchEvent: ReturnType<typeof vi.fn>;
	offsetWidth?: number;
	getBoundingClientRect?: () => MockDOMRect;
	addEventListener?: ReturnType<typeof vi.fn>;
	form?: unknown;
};

type MockElement = {
	tag: string;
	style: Record<string, string>;
	setAttribute: ReturnType<typeof vi.fn>;
	appendChild: ReturnType<typeof vi.fn>;
	addEventListener: ReturnType<typeof vi.fn>;
	remove: ReturnType<typeof vi.fn>;
	contains: ReturnType<typeof vi.fn>;
	src?: string;
	innerHTML?: string;
};


import { injectWithAnonymousScope, extractFunctionBody, polyfillUploadProgress, setupFormSubmitListener, setupAutofill, __resetAutofillCache } from '@scripts/test-preload.js';


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

	describe(`setupAutofill`, () => {
		beforeEach(() => {
			__resetAutofillCache();
			vi.restoreAllMocks();
		});
		it(`should NOT show dropdown for non-login input`, async () => {
			const ipc = ipcRenderer;
			ipc.invoke = vi.fn().mockImplementation(channel => {
				if (channel === `get-credentials`) return Promise.resolve([]);
				if (channel === `is-dark-theme`) return Promise.resolve(false);
				return Promise.resolve();
			});

			const listeners: Record<EventType, ((e: Event) => void)[]> = {};
			const mockWindow = {
				location: { origin: `https://test.eyas` },
				addEventListener: vi.fn((event: EventType, cb: (e: Event) => void) => {
					if (!listeners[event]) { listeners[event] = []; }
					listeners[event].push(cb);
				})
			};
			vi.stubGlobal(`window`, mockWindow);

			// Document stub (reuse existing mockDoc)
			const mockDoc = {
				createElement: vi.fn(() => ({ style: {}, appendChild: vi.fn(), setAttribute: vi.fn(), addEventListener: vi.fn(), contains: vi.fn(() => false), remove: vi.fn() })),
				documentElement: { appendChild: vi.fn() },
				body: { appendChild: vi.fn() },
				addEventListener: vi.fn((event: EventType, cb: (e: Event) => void) => {
					if (!listeners[event]) { listeners[event] = []; }
					listeners[event].push(cb);
				})
			};
			vi.stubGlobal(`document`, mockDoc);

			setupAutofill();

			// Simulate focusin event on input without password field
			const focusHandler = listeners[`focusin`][0];

			const nonLoginInput: MockInput = { value: ``, type: `text`, tagName: `INPUT`, dispatchEvent: vi.fn(), offsetWidth: 100, getBoundingClientRect: vi.fn(() => ({ top:0,bottom:0,left:0,right:0,width:100,height:20 })), addEventListener: vi.fn() };
			const mockForm = { querySelectorAll: vi.fn(() => []) };
			nonLoginInput.form = mockForm; // assign form without password field

			const mockEvent = { target: nonLoginInput };

			await focusHandler(mockEvent as unknown as Event);

			expect(ipc.invoke).not.toHaveBeenCalled();
			expect(mockDoc.createElement).not.toHaveBeenCalled();
		});

		it(`should NOT show dropdown when focusing a password field`, async () => {
			const ipc = ipcRenderer;
			ipc.invoke = vi.fn().mockImplementation(channel => {
				if (channel === `get-credentials`) return Promise.resolve([]);
				if (channel === `is-dark-theme`) return Promise.resolve(false);
				return Promise.resolve();
			});

			const listeners: Record<EventType, ((e: Event) => void)[]> = {};
			const mockWindow = {
				location: { origin: `https://test.eyas` },
				addEventListener: vi.fn((event: EventType, cb: (e: Event) => void) => {
					if (!listeners[event]) { listeners[event] = []; }
					listeners[event].push(cb);
				})
			};
			vi.stubGlobal(`window`, mockWindow);

			const mockDoc = {
				createElement: vi.fn(() => ({ style: {}, appendChild: vi.fn(), setAttribute: vi.fn(), addEventListener: vi.fn(), contains: vi.fn(() => false), remove: vi.fn() })),
				documentElement: { appendChild: vi.fn() },
				body: { appendChild: vi.fn() },
				addEventListener: vi.fn((event: EventType, cb: (e: Event) => void) => {
					if (!listeners[event]) { listeners[event] = []; }
					listeners[event].push(cb);
				})
			};
			vi.stubGlobal(`document`, mockDoc);

			setupAutofill();

			const focusHandler = listeners[`focusin`][0];

			const passwordInput: MockInput = { value: ``, type: `password`, tagName: `INPUT`, dispatchEvent: vi.fn(), offsetWidth: 100, getBoundingClientRect: vi.fn(() => ({ top:0,bottom:0,left:0,right:0,width:100,height:20 })), addEventListener: vi.fn() };
			const mockForm = { querySelectorAll: vi.fn((selector: DomSelector) => {
				if (selector.includes(`type="password"`)) {
					return [passwordInput];
				}
				return [];
			}) };
			passwordInput.form = mockForm;

			const mockEvent = { target: passwordInput };

			await focusHandler(mockEvent as unknown as Event);

			expect(ipc.invoke).not.toHaveBeenCalled();
			expect(mockDoc.createElement).not.toHaveBeenCalled();
		});

		it(`should autofill single credential on input focus`, async () => {
			const ipc = ipcRenderer;
			type ReturnCred = { username: Username; passwordPlain: PasswordPlain };
			ipc.invoke = vi.fn().mockImplementation(channel => {
				if (channel === `get-credentials`) {
					return Promise.resolve([
						{ username: `user1` as Username, passwordPlain: `pass1` as PasswordPlain } as ReturnCred
					]);
				}
				if (channel === `is-dark-theme`) return Promise.resolve(false);
				return Promise.resolve();
			});

			const listeners: Record<EventType, ((e: Event) => void)[]> = {};
			const mockWindow = {
				location: { origin: `https://test.eyas` as DomainUrl },
				addEventListener: vi.fn((event: EventType, cb: (e: Event) => void) => {
					if (!listeners[event]) { listeners[event] = []; }
					listeners[event].push(cb);
				})
			};
			vi.stubGlobal(`window`, mockWindow);

			// Setup document stub
			const mockDoc = {
				createElement: vi.fn(() => ({ style: {}, appendChild: vi.fn(), setAttribute: vi.fn(), addEventListener: vi.fn(), remove: vi.fn(), contains: vi.fn(() => false) })),
				documentElement: { appendChild: vi.fn() },
				body: { appendChild: vi.fn() },
				addEventListener: vi.fn((event: EventType, cb: (e: Event) => void) => {
					if (!listeners[event]) { listeners[event] = []; }
					listeners[event].push(cb);
				})
			};
			vi.stubGlobal(`document`, mockDoc);

			setupAutofill();

			// Simulate focusin event
			const focusHandler = listeners[`focusin`][0];

			// Mock target input
			const usernameInput: MockInput = {
				value: ``,
				type: `text`,
				tagName: `INPUT`,
				dispatchEvent: vi.fn(),
				offsetWidth: 100,
				getBoundingClientRect: vi.fn(() => ({ top: 0, bottom: 0, left: 0, right: 0, width: 100, height: 20 })),
				addEventListener: vi.fn()
			};
			const passwordInput: MockInput = { value: ``, type: `password`, tagName: `INPUT`, dispatchEvent: vi.fn() };

			const mockForm = {
				querySelectorAll: vi.fn((selector: DomSelector) => {
					if (selector.includes(`type="password"`)) {
						return [passwordInput];
					}
					return [usernameInput];
				})
			};
			usernameInput.form = mockForm;

			const mockEvent = {
				target: usernameInput
			};

			await focusHandler(mockEvent as unknown as Event);

			expect(ipc.invoke).toHaveBeenCalledWith(`get-credentials`, { origin: `https://test.eyas` });
			expect(ipc.invoke).toHaveBeenCalledWith(`is-dark-theme`);
			expect(mockDoc.createElement).toHaveBeenCalledWith(`div`);
			expect(usernameInput.value).toBe(``);
			expect(passwordInput.value).toBe(``);
		});

		it(`should show dropdown on click even if input is already focused`, async () => {
			const ipc = ipcRenderer;
			ipc.invoke = vi.fn().mockImplementation(channel => {
				if (channel === `get-credentials`) {
					return Promise.resolve([
						{ username: `user1`, passwordPlain: `pass1` }
					]);
				}
				if (channel === `is-dark-theme`) return Promise.resolve(false);
				return Promise.resolve();
			});

			const listeners: Record<EventType, ((e: Event) => void)[]> = {};
			const mockWindow = {
				location: { origin: `https://test.eyas` },
				addEventListener: vi.fn()
			};
			vi.stubGlobal(`window`, mockWindow);

			// Setup document stub
			const mockDoc = {
				createElement: vi.fn(() => ({ style: {}, appendChild: vi.fn(), setAttribute: vi.fn(), addEventListener: vi.fn(), contains: vi.fn(() => false), remove: vi.fn() })),
				documentElement: { appendChild: vi.fn() },
				body: { appendChild: vi.fn() },
				addEventListener: vi.fn((event: EventType, cb: (e: Event) => void) => {
					if (!listeners[event]) { listeners[event] = []; }
					listeners[event].push(cb);
				})
			};
			vi.stubGlobal(`document`, mockDoc);

			setupAutofill();

			// Simulate click event
			const clickHandler = listeners[`click`].find(cb => cb.toString().includes(`handleAutofillTrigger`));
			if (!clickHandler) throw new Error(`click handler not found`);

			const usernameInput: MockInput = {
				value: ``,
				type: `text`,
				tagName: `INPUT`,
				dispatchEvent: vi.fn(),
				offsetWidth: 100,
				getBoundingClientRect: vi.fn(() => ({ top: 0, bottom: 0, left: 0, right: 0, width: 100, height: 20 })),
				addEventListener: vi.fn()
			};

			const passwordInput: MockInput = { value: ``, type: `password`, tagName: `INPUT`, dispatchEvent: vi.fn() };
			const mockForm = { querySelectorAll: vi.fn((selector: DomSelector) => {
				if (selector.includes(`type="password"`)) return [passwordInput];
				return [usernameInput];
			}) };
			usernameInput.form = mockForm;
			const mockEvent = {
				target: usernameInput
			};
			await clickHandler(mockEvent as unknown as Event);

			expect(ipc.invoke).toHaveBeenCalledWith(`get-credentials`, { origin: `https://test.eyas` });
			expect(ipc.invoke).toHaveBeenCalledWith(`is-dark-theme`);
			expect(mockDoc.createElement).toHaveBeenCalledWith(`div`);
		});

		it(`should render password mask with lighter grey and include logo`, async () => {
			const ipc = ipcRenderer;
			ipc.invoke = vi.fn().mockImplementation(channel => {
				if (channel === `get-credentials`) {
					return Promise.resolve([
						{ username: `user1` as Username, passwordPlain: `pass1` as PasswordPlain }
					]);
				}
				if (channel === `is-dark-theme`) return Promise.resolve(false);
				return Promise.resolve();
			});

			const listeners: Record<EventType, ((e: Event) => void)[]> = {};
			const mockWindow = {
				location: { origin: `https://test.eyas` as DomainUrl },
				addEventListener: vi.fn((event: EventType, cb: (e: Event) => void) => {
					if (!listeners[event]) listeners[event] = [];
					listeners[event].push(cb);
				})
			};
			vi.stubGlobal(`window`, mockWindow);

			const createdElements: MockElement[] = [];
			const mockDoc = {
				createElement: vi.fn((tag: ElementTag) => {
					const el: MockElement = { tag, style: {}, setAttribute: vi.fn(), appendChild: vi.fn(), addEventListener: vi.fn(), remove: vi.fn(), contains: vi.fn(() => false) };
					if (tag === `img`) {
						el.src = ``;
					}
					createdElements.push(el);
					return el;
				}),
				documentElement: { appendChild: vi.fn() },
				body: { appendChild: vi.fn() },
				addEventListener: vi.fn((event: EventType, cb: (e: Event) => void) => {
					if (!listeners[event]) listeners[event] = [];
					listeners[event].push(cb);
				})
			};
			vi.stubGlobal(`document`, mockDoc);

			setupAutofill();

			const focusHandler = listeners[`focusin`][0];

			const usernameInput: MockInput = {
				value: ``,
				type: `text`,
				tagName: `INPUT`,
				dispatchEvent: vi.fn(),
				offsetWidth: 100,
				getBoundingClientRect: vi.fn(() => ({ top: 0, bottom: 0, left: 0, right: 0, width: 100, height: 20 })),
				addEventListener: vi.fn()
			};
			const passwordInput: MockInput = { value: ``, type: `password`, tagName: `INPUT`, dispatchEvent: vi.fn() };
			const mockForm = {
				querySelectorAll: vi.fn((selector: DomSelector) => {
					if (selector.includes(`type="password"`)) return [passwordInput];
					return [usernameInput];
				})
			};
			usernameInput.form = mockForm;

			const mockEvent = { target: usernameInput };
			await focusHandler(mockEvent as unknown as Event);

			// Verify password mask color in innerHTML (default light theme is #888)
			const itemDiv = createdElements.find(e => e.tag === `div` && e.innerHTML);
			expect(itemDiv).toBeDefined();
			expect(itemDiv?.innerHTML).toContain(`color:#888`);

			// Verify logo element containing inline SVG
			const logoDiv = createdElements.find(e => e.tag === `div` && e.innerHTML && e.innerHTML.includes(`<svg`));
			expect(logoDiv).toBeDefined();
		});

		it(`should temporarily fill form on hover with a dummy password and restore on mouseleave`, async () => {
			const ipc = ipcRenderer;
			type ReturnCred = { username: Username; passwordPlain: PasswordPlain };
			ipc.invoke = vi.fn().mockImplementation(channel => {
				if (channel === `get-credentials`) {
					return Promise.resolve([
						{ username: `user1` as Username, passwordPlain: `pass1` as PasswordPlain } as ReturnCred
					]);
				}
				if (channel === `is-dark-theme`) return Promise.resolve(false);
				return Promise.resolve();
			});

			const listeners: Record<EventType, ((e: Event) => void)[]> = {};
			const mockWindow = {
				location: { origin: `https://test.eyas` as DomainUrl },
				addEventListener: vi.fn((event: EventType, cb: (e: Event) => void) => {
					if (!listeners[event]) { listeners[event] = []; }
					listeners[event].push(cb);
				})
			};
			vi.stubGlobal(`window`, mockWindow);

			const createdElements: MockElementWithListeners[] = [];
			const mockDoc = {
				createElement: vi.fn((tag: ElementTag) => {
					const el: MockElementWithListeners = {
						tag,
						style: {},
						setAttribute: vi.fn(),
						appendChild: vi.fn(),
						addEventListener: vi.fn((event: EventType, cb: (e: Event) => void) => {
							const extra = el;
							if (!extra.listeners) extra.listeners = {};
							if (!extra.listeners[event]) extra.listeners[event] = [];
							extra.listeners[event].push(cb);
						}),
						remove: vi.fn(),
						contains: vi.fn(() => false)
					};
					createdElements.push(el);
					return el;
				}),
				documentElement: { appendChild: vi.fn() },
				body: { appendChild: vi.fn() },
				addEventListener: vi.fn((event: EventType, cb: (e: Event) => void) => {
					if (!listeners[event]) listeners[event] = [];
					listeners[event].push(cb);
				})
			};
			vi.stubGlobal(`document`, mockDoc);

			setupAutofill();

			const focusHandler = listeners[`focusin`][0];

			const usernameInput: MockInput = {
				value: `originalUser`,
				type: `text`,
				tagName: `INPUT`,
				dispatchEvent: vi.fn(),
				offsetWidth: 100,
				getBoundingClientRect: vi.fn(() => ({ top: 0, bottom: 0, left: 0, right: 0, width: 100, height: 20 })),
				addEventListener: vi.fn()
			};
			const passwordInput: MockInput = { value: `originalPass`, type: `password`, tagName: `INPUT`, dispatchEvent: vi.fn() };
			const mockForm = {
				querySelectorAll: vi.fn((selector: DomSelector) => {
					if (selector.includes(`type="password"`)) return [passwordInput];
					return [usernameInput];
				})
			};
			usernameInput.form = mockForm;

			const mockEvent = { target: usernameInput };
			await focusHandler(mockEvent as unknown as Event);

			// Find the item div element
			const itemDiv = createdElements.find(e => e.tag === `div` && e.innerHTML && e.innerHTML.includes(`user1`));
			expect(itemDiv).toBeDefined();

			const itemListeners = itemDiv?.listeners;
			expect(itemListeners).toBeDefined();

			// Trigger mouseenter
			const mouseenter = itemListeners?.mouseenter?.[0];
			expect(mouseenter).toBeDefined();
			if (mouseenter) {
				mouseenter(new Event(`mouseenter`));
			}
			expect(usernameInput.value).toBe(`user1`);

			// Get the dummy password from the dropdown item HTML
			const innerHTML = itemDiv?.innerHTML;
			expect(innerHTML).toBeDefined();
			if (innerHTML) {
				const match = innerHTML.match(/class="password-mask"[^>]*>([^<]+)/);
				expect(match).toBeDefined();
				if (match) {
					const dummyPasswordInDropdown = match[1];
					expect(dummyPasswordInDropdown).toBeDefined();
					expect(dummyPasswordInDropdown).not.toBe(`pass1`);
					expect(passwordInput.value).toBe(dummyPasswordInDropdown);
				}
			}

			// Trigger mouseleave
			const mouseleave = itemListeners?.mouseleave?.[0];
			expect(mouseleave).toBeDefined();
			if (mouseleave) {
				mouseleave(new Event(`mouseleave`));
			}
			expect(usernameInput.value).toBe(`originalUser`);
			expect(passwordInput.value).toBe(`originalPass`);
		});

		it(`should populate the real password upon mousedown (click) selection`, async () => {
			const ipc = ipcRenderer;
			type ReturnCred = { username: Username; passwordPlain: PasswordPlain };
			ipc.invoke = vi.fn().mockImplementation(channel => {
				if (channel === `get-credentials`) {
					return Promise.resolve([
						{ username: `user1` as Username, passwordPlain: `pass1` as PasswordPlain } as ReturnCred
					]);
				}
				if (channel === `is-dark-theme`) return Promise.resolve(false);
				return Promise.resolve();
			});

			const listeners: Record<EventType, ((e: Event) => void)[]> = {};
			const mockWindow = {
				location: { origin: `https://test.eyas` as DomainUrl },
				addEventListener: vi.fn((event: EventType, cb: (e: Event) => void) => {
					if (!listeners[event]) { listeners[event] = []; }
					listeners[event].push(cb);
				})
			};
			vi.stubGlobal(`window`, mockWindow);

			const createdElements: MockElementWithListeners[] = [];
			const mockDoc = {
				createElement: vi.fn((tag: ElementTag) => {
					const el: MockElementWithListeners = {
						tag,
						style: {},
						setAttribute: vi.fn(),
						appendChild: vi.fn(),
						addEventListener: vi.fn((event: EventType, cb: (e: Event) => void) => {
							const extra = el;
							if (!extra.listeners) extra.listeners = {};
							if (!extra.listeners[event]) extra.listeners[event] = [];
							extra.listeners[event].push(cb);
						}),
						remove: vi.fn(),
						contains: vi.fn(() => false)
					};
					createdElements.push(el);
					return el;
				}),
				documentElement: { appendChild: vi.fn() },
				body: { appendChild: vi.fn() },
				addEventListener: vi.fn((event: EventType, cb: (e: Event) => void) => {
					if (!listeners[event]) listeners[event] = [];
					listeners[event].push(cb);
				})
			};
			vi.stubGlobal(`document`, mockDoc);

			setupAutofill();

			const focusHandler = listeners[`focusin`][0];

			const usernameInput: MockInput = {
				value: `originalUser`,
				type: `text`,
				tagName: `INPUT`,
				dispatchEvent: vi.fn(),
				offsetWidth: 100,
				getBoundingClientRect: vi.fn(() => ({ top: 0, bottom: 0, left: 0, right: 0, width: 100, height: 20 })),
				addEventListener: vi.fn()
			};
			const passwordInput: MockInput = { value: `originalPass`, type: `password`, tagName: `INPUT`, dispatchEvent: vi.fn() };
			const mockForm = {
				querySelectorAll: vi.fn((selector: DomSelector) => {
					if (selector.includes(`type="password"`)) return [passwordInput];
					return [usernameInput];
				})
			};
			usernameInput.form = mockForm;

			const mockEvent = { target: usernameInput };
			await focusHandler(mockEvent as unknown as Event);

			// Find the item div element
			const itemDiv = createdElements.find(e => e.tag === `div` && e.innerHTML && e.innerHTML.includes(`user1`));
			expect(itemDiv).toBeDefined();

			// Trigger mousedown (click selection)
			const mockMouseDownEvent = {
				preventDefault: vi.fn()
			};
			const itemListeners = itemDiv?.listeners;
			expect(itemListeners).toBeDefined();
			const mousedown = itemListeners?.mousedown?.[0];
			expect(mousedown).toBeDefined();
			if (mousedown) {
				mousedown(mockMouseDownEvent as unknown as Event);
			}

			// Should populate real values
			expect(usernameInput.value).toBe(`user1`);
			expect(passwordInput.value).toBe(`pass1`);
			expect(usernameInput.dispatchEvent).toHaveBeenCalledWith(expect.any(Event));
			expect(passwordInput.dispatchEvent).toHaveBeenCalledWith(expect.any(Event));
		});

		it(`should apply dark theme styles when is-dark-theme returns true`, async () => {
			const ipc = ipcRenderer;
			ipc.invoke = vi.fn().mockImplementation(channel => {
				if (channel === `get-credentials`) {
					return Promise.resolve([
						{ username: `user1` as Username, passwordPlain: `pass1` as PasswordPlain }
					]);
				}
				if (channel === `is-dark-theme`) return Promise.resolve(true);
				return Promise.resolve();
			});

			const listeners: Record<EventType, ((e: Event) => void)[]> = {};
			const mockWindow = {
				location: { origin: `https://test.eyas` as DomainUrl },
				addEventListener: vi.fn((event: EventType, cb: (e: Event) => void) => {
					if (!listeners[event]) listeners[event] = [];
					listeners[event].push(cb);
				})
			};
			vi.stubGlobal(`window`, mockWindow);

			const createdElements: MockElement[] = [];
			const mockDoc = {
				createElement: vi.fn((tag: ElementTag) => {
					const el: MockElement = { tag, style: {}, setAttribute: vi.fn(), appendChild: vi.fn(), addEventListener: vi.fn(), remove: vi.fn(), contains: vi.fn(() => false) };
					createdElements.push(el);
					return el;
				}),
				documentElement: { appendChild: vi.fn() },
				body: { appendChild: vi.fn() },
				addEventListener: vi.fn((event: EventType, cb: (e: Event) => void) => {
					if (!listeners[event]) listeners[event] = [];
					listeners[event].push(cb);
				})
			};
			vi.stubGlobal(`document`, mockDoc);

			setupAutofill();

			const focusHandler = listeners[`focusin`][0];

			const usernameInput: MockInput = {
				value: ``,
				type: `text`,
				tagName: `INPUT`,
				dispatchEvent: vi.fn(),
				offsetWidth: 100,
				getBoundingClientRect: vi.fn(() => ({ top: 0, bottom: 0, left: 0, right: 0, width: 100, height: 20 })),
				addEventListener: vi.fn()
			};
			const passwordInput: MockInput = { value: ``, type: `password`, tagName: `INPUT`, dispatchEvent: vi.fn() };
			const mockForm = {
				querySelectorAll: vi.fn((selector: DomSelector) => {
					if (selector.includes(`type="password"`)) return [passwordInput];
					return [usernameInput];
				})
			};
			usernameInput.form = mockForm;

			const mockEvent = { target: usernameInput };
			await focusHandler(mockEvent as unknown as Event);

			// Verify the dropdown element styling includes the dark theme values
			const dropdownDiv = createdElements.find(e => e.tag === `div` && ((e.setAttribute as Mock).mock.calls.some(call => typeof call[1] === `string` && call[1].includes(`background:rgba(30, 30, 30, 0.85)`))));
			expect(dropdownDiv).toBeDefined();

			// Verify item mask color in innerHTML (dark theme is #aaa)
			const itemDiv = createdElements.find(e => e.tag === `div` && e.innerHTML && e.innerHTML.includes(`user1`));
			expect(itemDiv).toBeDefined();
			expect(itemDiv?.innerHTML).toContain(`color:#aaa`);
		});

		it(`should hide dropdown when active input fires focusout`, async () => {
			const ipc = ipcRenderer;
			type ReturnCred = { username: Username; passwordPlain: PasswordPlain };
			ipc.invoke = vi.fn().mockImplementation(channel => {
				if (channel === `get-credentials`) {
					return Promise.resolve([
						{ username: `user1` as Username, passwordPlain: `pass1` as PasswordPlain } as ReturnCred
					]);
				}
				if (channel === `is-dark-theme`) return Promise.resolve(false);
				return Promise.resolve();
			});

			const listeners: Record<EventType, ((e: Event) => void)[]> = {};
			const mockWindow = {
				location: { origin: `https://test.eyas` as DomainUrl },
				addEventListener: vi.fn((event: EventType, cb: (e: Event) => void) => {
					if (!listeners[event]) { listeners[event] = []; }
					listeners[event].push(cb);
				})
			};
			vi.stubGlobal(`window`, mockWindow);

			// Setup document stub
			const removeMock = vi.fn();
			const mockDoc = {
				createElement: vi.fn(() => ({ style: {}, appendChild: vi.fn(), setAttribute: vi.fn(), addEventListener: vi.fn(), remove: removeMock, contains: vi.fn(() => false) })),
				documentElement: { appendChild: vi.fn() },
				body: { appendChild: vi.fn() },
				addEventListener: vi.fn((event: EventType, cb: (e: Event) => void) => {
					if (!listeners[event]) { listeners[event] = []; }
					listeners[event].push(cb);
				})
			};
			vi.stubGlobal(`document`, mockDoc);

			setupAutofill();

			const focusHandler = listeners[`focusin`][0];
			const focusoutHandler = listeners[`focusout`][0];
			expect(focusoutHandler).toBeDefined();

			const usernameInput: MockInput = {
				value: ``,
				type: `text`,
				tagName: `INPUT`,
				dispatchEvent: vi.fn(),
				offsetWidth: 100,
				getBoundingClientRect: vi.fn(() => ({ top: 0, bottom: 0, left: 0, right: 0, width: 100, height: 20 })),
				addEventListener: vi.fn()
			};
			const passwordInput: MockInput = { value: ``, type: `password`, tagName: `INPUT`, dispatchEvent: vi.fn() };

			const mockForm = {
				querySelectorAll: vi.fn((selector: DomSelector) => {
					if (selector.includes(`type="password"`)) {
						return [passwordInput];
					}
					return [usernameInput];
				})
			};
			usernameInput.form = mockForm;

			const mockEvent = {
				target: usernameInput
			};

			// Show dropdown first
			await focusHandler(mockEvent as unknown as Event);
			expect(mockDoc.createElement).toHaveBeenCalledWith(`div`);

			// Now trigger focusout
			await focusoutHandler(mockEvent as unknown as Event);
			expect(removeMock).toHaveBeenCalled();
		});

		it(`should close dropdown when window scrolls but NOT when scrolling inside dropdown`, async () => {
			const ipc = ipcRenderer;
			type ReturnCred = { username: Username; passwordPlain: PasswordPlain };
			ipc.invoke = vi.fn().mockImplementation(channel => {
				if (channel === `get-credentials`) {
					return Promise.resolve([
						{ username: `user1` as Username, passwordPlain: `pass1` as PasswordPlain } as ReturnCred
					]);
				}
				if (channel === `is-dark-theme`) return Promise.resolve(false);
				return Promise.resolve();
			});

			const listeners: Record<EventType, ((e: Event) => void)[]> = {};
			const mockWindow = {
				location: { origin: `https://test.eyas` as DomainUrl },
				addEventListener: vi.fn((event: EventType, cb: (e: Event) => void) => {
					if (!listeners[event]) { listeners[event] = []; }
					listeners[event].push(cb);
				})
			};
			vi.stubGlobal(`window`, mockWindow);

			// Setup document stub
			const removeMock = vi.fn();
			const containsMock = vi.fn();
			const mockDropdownEl = {
				style: {},
				appendChild: vi.fn(),
				setAttribute: vi.fn(),
				addEventListener: vi.fn(),
				remove: removeMock,
				contains: containsMock
			};
			const mockDoc = {
				createElement: vi.fn(() => mockDropdownEl),
				documentElement: { appendChild: vi.fn() },
				body: { appendChild: vi.fn() },
				addEventListener: vi.fn((event: EventType, cb: (e: Event) => void) => {
					if (!listeners[event]) { listeners[event] = []; }
					listeners[event].push(cb);
				})
			};
			vi.stubGlobal(`document`, mockDoc);

			setupAutofill();

			const focusHandler = listeners[`focusin`][0];
			const scrollHandler = listeners[`scroll`][0];
			expect(scrollHandler).toBeDefined();

			const usernameInput: MockInput = {
				value: ``,
				type: `text`,
				tagName: `INPUT`,
				dispatchEvent: vi.fn(),
				offsetWidth: 100,
				getBoundingClientRect: vi.fn(() => ({ top: 0, bottom: 0, left: 0, right: 0, width: 100, height: 20 })),
				addEventListener: vi.fn()
			};
			const passwordInput: MockInput = { value: ``, type: `password`, tagName: `INPUT`, dispatchEvent: vi.fn() };

			const mockForm = {
				querySelectorAll: vi.fn((selector: DomSelector) => {
					if (selector.includes(`type="password"`)) {
						return [passwordInput];
					}
					return [usernameInput];
				})
			};
			usernameInput.form = mockForm;

			const mockEvent = {
				target: usernameInput
			};

			// Show dropdown first
			await focusHandler(mockEvent as unknown as Event);
			expect(mockDoc.createElement).toHaveBeenCalledWith(`div`);

			// 1. Simulate scroll inside the dropdown
			containsMock.mockReturnValue(true);
			await scrollHandler({ target: {} } as unknown as Event);
			expect(removeMock).not.toHaveBeenCalled();

			// 2. Simulate scroll outside the dropdown
			containsMock.mockReturnValue(false);
			await scrollHandler({ target: {} } as unknown as Event);
			expect(removeMock).toHaveBeenCalled();
		});

		it(`should clear cached credentials when credentials-updated IPC is received`, async () => {
			const ipc = ipcRenderer;
			let credentialsUpdatedHandler: (() => void) | null = null;
			ipc.on = vi.fn().mockImplementation((channel, cb) => {
				if (channel === `credentials-updated`) {
					credentialsUpdatedHandler = cb;
				}
				return ipc;
			});

			type ReturnCred = { username: Username; passwordPlain: PasswordPlain };
			let invokeCount = 0;
			ipc.invoke = vi.fn().mockImplementation(channel => {
				if (channel === `get-credentials`) {
					invokeCount++;
					return Promise.resolve([
						{ username: `user1` as Username, passwordPlain: `pass1` as PasswordPlain } as ReturnCred
					]);
				}
				if (channel === `is-dark-theme`) return Promise.resolve(false);
				return Promise.resolve();
			});

			const listeners: Record<EventType, ((e: Event) => void)[]> = {};
			const mockWindow = {
				location: { origin: `https://test.eyas` as DomainUrl },
				addEventListener: vi.fn()
			};
			vi.stubGlobal(`window`, mockWindow);

			// Setup document stub
			const mockDoc = {
				createElement: vi.fn(() => ({ style: {}, appendChild: vi.fn(), setAttribute: vi.fn(), addEventListener: vi.fn(), contains: vi.fn(() => false), remove: vi.fn() })),
				documentElement: { appendChild: vi.fn() },
				body: { appendChild: vi.fn() },
				addEventListener: vi.fn((event: EventType, cb: (e: Event) => void) => {
					if (!listeners[event]) { listeners[event] = []; }
					listeners[event].push(cb);
				})
			};
			vi.stubGlobal(`document`, mockDoc);

			setupAutofill();

			// Ensure credentials-updated IPC listener was registered
			expect(ipc.on).toHaveBeenCalledWith(`credentials-updated`, expect.any(Function));
			expect(credentialsUpdatedHandler).toBeTypeOf(`function`);

			const focusHandler = listeners[`focusin`][0];

			const usernameInput: MockInput = {
				value: ``,
				type: `text`,
				tagName: `INPUT`,
				dispatchEvent: vi.fn(),
				offsetWidth: 100,
				getBoundingClientRect: vi.fn(() => ({ top: 0, bottom: 0, left: 0, right: 0, width: 100, height: 20 })),
				addEventListener: vi.fn()
			};
			const passwordInput: MockInput = { value: ``, type: `password`, tagName: `INPUT`, dispatchEvent: vi.fn() };
			const mockForm = {
				querySelectorAll: vi.fn((selector: DomSelector) => {
					if (selector.includes(`type="password"`)) {
						return [passwordInput];
					}
					return [usernameInput];
				})
			};
			usernameInput.form = mockForm;

			const mockEvent = { target: usernameInput };

			// 1. First trigger should call invoke (invokeCount = 1)
			await focusHandler(mockEvent as unknown as Event);
			expect(invokeCount).toBe(1);

			// Reset mocks to clear call counts/calls on createElement etc.
			mockDoc.createElement.mockClear();

			// 2. Second trigger should use cache, so invokeCount remains 1
			await focusHandler(mockEvent as unknown as Event);
			expect(invokeCount).toBe(1);

			// 3. Trigger the credentials-updated IPC callback
			(credentialsUpdatedHandler as unknown as () => void)?.();

			// 4. Third trigger should query IPC again (invokeCount = 2)
			await focusHandler(mockEvent as unknown as Event);
			expect(invokeCount).toBe(2);
		});
	});
});


