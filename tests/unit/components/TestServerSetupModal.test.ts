import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import type { VueWrapper } from '@vue/test-utils';
import TestServerSetupModal from '@/components/TestServerSetupModal.vue';
import type { TestServerSetupModalVM, WindowWithEyas } from '@/types/eyas-interface.js';
import type { ChannelName } from '@/types/primitives.js';

// Removed local type definition

describe(`TestServerSetupModal`, () => {
	let wrapper: VueWrapper;
	let receiveCallback: (payload: unknown) => void;

	beforeEach(() => {
		(window as unknown as WindowWithEyas).eyas = {
			send: vi.fn(),
			receive: vi.fn((channel: ChannelName, fn: (payload: unknown) => void) => {
				receiveCallback = fn;
			})
		};
		wrapper = mount(TestServerSetupModal);
	});

	afterEach(() => {
		if (wrapper) wrapper.unmount();
		vi.clearAllMocks();
	});

	test(`receives show-test-server-setup-modal and displays modal with default hostname`, async () => {
		const payload = {
			domain: `http://127.0.0.1`,
			portHttp: 12345,
			portHttps: 54321,
			steps: [],
			useHttps: false
		};
		receiveCallback(payload);
		await (wrapper.vm as unknown as TestServerSetupModalVM).$nextTick();
		expect((wrapper.vm as unknown as TestServerSetupModalVM).visible).toBe(true);
		expect((wrapper.vm as unknown as TestServerSetupModalVM).steps).toHaveLength(0);
		expect((wrapper.vm as unknown as TestServerSetupModalVM).hostsLine).toContain(`127.0.0.1`);
		expect((wrapper.vm as unknown as TestServerSetupModalVM).hostsLine).toContain(`test.local`); // Default fallback
		expect((wrapper.vm as unknown as TestServerSetupModalVM).portHttp).toBe(12345);
		expect((wrapper.vm as unknown as TestServerSetupModalVM).portHttps).toBe(54321);
		expect((wrapper.vm as unknown as TestServerSetupModalVM).port).toBe(12345); // Defaults to useHttps = false
		expect((wrapper.vm as unknown as TestServerSetupModalVM).autoOpenBrowser).toBe(true);
		expect((wrapper.vm as unknown as TestServerSetupModalVM).useCustomDomain).toBe(false);
	});

	test(`displays modal with custom hostname`, async () => {
		const payload = {
			domain: `http://127.0.0.1`,
			portHttp: 12345,
			hostnameForHosts: `my.custom.app`,
			steps: [],
			useHttps: false
		};
		receiveCallback(payload);
		await (wrapper.vm as unknown as TestServerSetupModalVM).$nextTick();
		expect((wrapper.vm as unknown as TestServerSetupModalVM).visible).toBe(true);
		expect((wrapper.vm as unknown as TestServerSetupModalVM).hostsLine).toContain(`127.0.0.1`);
		expect((wrapper.vm as unknown as TestServerSetupModalVM).hostsLine).toContain(`my.custom.app`);
	});

	test(`continueStart sends test-server-setup-continue with useHttps and closes modal`, async () => {
		receiveCallback({ domain: `http://127.0.0.1`, hostnameForHosts: `local.test`, steps: [], useHttps: true });
		await (wrapper.vm as unknown as TestServerSetupModalVM).$nextTick();
		expect((wrapper.vm as unknown as TestServerSetupModalVM).useHttps).toBe(true);

		(wrapper.vm as unknown as TestServerSetupModalVM).useHttps = false;
		(wrapper.vm as unknown as TestServerSetupModalVM).autoOpenBrowser = false;
		(wrapper.vm as unknown as TestServerSetupModalVM).useCustomDomain = true;
		(wrapper.vm as unknown as TestServerSetupModalVM).continueStart();
		const eyas = (window as unknown as WindowWithEyas).eyas;
		expect(eyas.send).toHaveBeenCalledWith(`test-server-setup-continue`, {
			useHttps: false,
			autoOpenBrowser: false,
			useCustomDomain: true
		});
		expect((wrapper.vm as unknown as TestServerSetupModalVM).visible).toBe(false);
	});

	test(`cancel closes modal without sending event`, async () => {
		receiveCallback({ domain: `http://127.0.0.1`, hostnameForHosts: `local.test`, steps: [] });
		await (wrapper.vm as unknown as TestServerSetupModalVM).$nextTick();
		expect((wrapper.vm as unknown as TestServerSetupModalVM).visible).toBe(true);

		(wrapper.vm as unknown as TestServerSetupModalVM).cancel();
		const eyas = (window as unknown as WindowWithEyas).eyas;
		expect(eyas.send).not.toHaveBeenCalledWith(`test-server-setup-continue`);
		expect((wrapper.vm as unknown as TestServerSetupModalVM).visible).toBe(false);
	});

	test(`displays Windows hosts path when isWindows is true`, async () => {
		const payload = {
			domain: `http://127.0.0.1`,
			steps: [],
			isWindows: true
		};
		receiveCallback(payload);
		await (wrapper.vm as unknown as TestServerSetupModalVM).$nextTick();
		expect((wrapper.vm as unknown as TestServerSetupModalVM).isWindows).toBe(true);
	});

	test(`displays macOS/Linux hosts path when isWindows is false`, async () => {
		const payload = {
			domain: `http://127.0.0.1`,
			steps: [],
			isWindows: false
		};
		receiveCallback(payload);
		await (wrapper.vm as unknown as TestServerSetupModalVM).$nextTick();
		expect((wrapper.vm as unknown as TestServerSetupModalVM).isWindows).toBe(false);
	});

	test(`toggling useCustomDomain reveals hosts file instructions`, async () => {
		receiveCallback({ domain: `http://127.0.0.1`, steps: [] });
		await (wrapper.vm as unknown as TestServerSetupModalVM).$nextTick();

		expect(document.querySelector(`[data-qa="hosts-file-instructions"]`)).toBeNull();
		await wrapper.setData({ internalUseCustomDomain: true });
		expect(document.querySelector(`[data-qa="hosts-file-instructions"]`)).not.toBeNull();
	});

	test(`clicking hosts file instructions copies text and changes icon temporarily`, async () => {
		vi.useFakeTimers();
		receiveCallback({ domain: `http://127.0.0.1`, hostnameForHosts: `my.custom.url`, steps: [] });
		await (wrapper.vm as unknown as TestServerSetupModalVM).$nextTick();
		await wrapper.setData({ internalUseCustomDomain: true });

		const mockClipboard = { writeText: vi.fn() };
		Object.assign(navigator, { clipboard: mockClipboard });

		const sheet = document.querySelector(`.hosts-copy-block`);
		expect((wrapper.vm as unknown as TestServerSetupModalVM).copyIcon).toBe(`mdi-content-copy`);

		if (sheet) {
			sheet.dispatchEvent(new Event(`click`));
		}
		await (wrapper.vm as unknown as TestServerSetupModalVM).$nextTick();
		expect(navigator.clipboard.writeText).toHaveBeenCalledWith(`127.0.0.1\tmy.custom.url`);
		expect((wrapper.vm as unknown as TestServerSetupModalVM).copyIcon).toBe(`mdi-check`);

		vi.advanceTimersByTime(2000);
		expect((wrapper.vm as unknown as TestServerSetupModalVM).copyIcon).toBe(`mdi-content-copy`);
		vi.useRealTimers();
	});

	test(`displayDomain returns 127.0.0.1 when useCustomDomain is false`, async () => {
		receiveCallback({ domain: `http://127.0.0.1`, steps: [] });
		await (wrapper.vm as unknown as TestServerSetupModalVM).$nextTick();
		expect((wrapper.vm as unknown as TestServerSetupModalVM).useCustomDomain).toBe(false);
		expect((wrapper.vm as unknown as TestServerSetupModalVM).displayDomain).toBe(`127.0.0.1`);
	});

	test(`displayDomain returns custom hostname when useCustomDomain is true`, async () => {
		receiveCallback({ domain: `http://127.0.0.1`, hostnameForHosts: `my.custom.url`, steps: [] });
		await (wrapper.vm as unknown as TestServerSetupModalVM).$nextTick();
		(wrapper.vm as unknown as TestServerSetupModalVM).internalUseCustomDomain = true;
		await (wrapper.vm as unknown as TestServerSetupModalVM).$nextTick();
		expect((wrapper.vm as unknown as TestServerSetupModalVM).displayDomain).toBe(`my.custom.url`);
	});

	test(`displayPort computed property correctly hides standard protocol ports`, async () => {
		receiveCallback({ domain: `http://127.0.0.1`, portHttp: 80, portHttps: 443, steps: [] });
		await (wrapper.vm as unknown as TestServerSetupModalVM).$nextTick();
		expect((wrapper.vm as unknown as TestServerSetupModalVM).useHttps).toBe(false);
		expect((wrapper.vm as unknown as TestServerSetupModalVM).displayPort).toBe(``);

		await wrapper.setData({ internalUseHttps: true });
		expect((wrapper.vm as unknown as TestServerSetupModalVM).useHttps).toBe(true);
		expect((wrapper.vm as unknown as TestServerSetupModalVM).displayPort).toBe(``);

		await wrapper.setData({ internalUseHttps: false, portHttp: 8080 });
		expect((wrapper.vm as unknown as TestServerSetupModalVM).displayPort).toBe(`:8080`);

		await wrapper.setData({ internalUseHttps: true, portHttps: 8443 });
		expect((wrapper.vm as unknown as TestServerSetupModalVM).displayPort).toBe(`:8443`);
	});
});
