import { describe, it, expect, vi } from 'vitest';

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
import { injectWithAnonymousScope, extractFunctionBody, polyfillUploadProgress } from '../../src/scripts/test-preload.js';

describe(`test-preload`, () => {
	describe(`utility functions`, () => {
		it(`extractFunctionBody should extract the body of a function`, () => {
			function testFn(): number {
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
				console.log(`test`);
			}
			const injected = injectWithAnonymousScope(testFn);
			expect(injected).toContain(`(() => {`);
			expect(injected).toContain(`console.log(\`test\`);`);
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
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const mockXHR = function (this: any): void {
				this.upload = { dispatchEvent: vi.fn() };
				this.addEventListener = vi.fn();
			};
			mockXHR.prototype.send = originalSend;

			vi.stubGlobal(`XMLHttpRequest`, mockXHR);
			vi.stubGlobal(`performance`, { now: vi.fn(() => 0) });
			vi.stubGlobal(`ProgressEvent`, class {
				type: string;
				lengthComputable: boolean;
				loaded: number;
				total: number;
				constructor(type: string, init: { lengthComputable: boolean, loaded: number, total: number }) {
					this.type = type;
					this.lengthComputable = init.lengthComputable;
					this.loaded = init.loaded;
					this.total = init.total;
				}
			});

			polyfillUploadProgress();

			const xhr = new (mockXHR as any)();
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
});
