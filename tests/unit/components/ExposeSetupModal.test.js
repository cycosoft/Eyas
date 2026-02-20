import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import ExposeSetupModal from '@/components/ExposeSetupModal.vue';

describe(`ExposeSetupModal`, () => {
	let wrapper;
	let receiveCallback;

	beforeEach(() => {
		global.window.eyas = { send: vi.fn(), receive: vi.fn((channel, fn) => { receiveCallback = fn; }) };
		wrapper = mount(ExposeSetupModal);
	});

	afterEach(() => {
		if (wrapper) wrapper.unmount();
		vi.clearAllMocks();
	});

	test(`receives show-expose-setup-modal and displays modal with default hostname`, async () => {
		const payload = {
			domain: `http://127.0.0.1`,
			portHttp: 12345,
			portHttps: 54321,
			steps: [],
			useHttps: false
		};
		receiveCallback(payload);
		await wrapper.vm.$nextTick();
		expect(wrapper.vm.visible).toBe(true);
		expect(wrapper.vm.steps).toHaveLength(0);
		expect(wrapper.vm.hostsLine).toContain(`127.0.0.1`);
		expect(wrapper.vm.hostsLine).toContain(`test.local`); // Default fallback
		expect(wrapper.vm.portHttp).toBe(12345);
		expect(wrapper.vm.portHttps).toBe(54321);
		expect(wrapper.vm.port).toBe(12345); // Defaults to useHttps = false
		expect(wrapper.vm.autoOpenBrowser).toBe(true);
		expect(wrapper.vm.useCustomDomain).toBe(false);
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
		await wrapper.vm.$nextTick();
		expect(wrapper.vm.visible).toBe(true);
		expect(wrapper.vm.hostsLine).toContain(`127.0.0.1`);
		expect(wrapper.vm.hostsLine).toContain(`my.custom.app`);
	});

	test(`continueStart sends expose-setup-continue with useHttps and closes modal`, async () => {
		receiveCallback({ domain: `http://127.0.0.1`, hostnameForHosts: `local.test`, steps: [], useHttps: true });
		await wrapper.vm.$nextTick();
		expect(wrapper.vm.useHttps).toBe(true);

		wrapper.vm.useHttps = false;
		wrapper.vm.autoOpenBrowser = false;
		wrapper.vm.useCustomDomain = true;
		wrapper.vm.continueStart();
		expect(global.window.eyas.send).toHaveBeenCalledWith(`expose-setup-continue`, {
			useHttps: false,
			autoOpenBrowser: false,
			useCustomDomain: true
		});
		expect(wrapper.vm.visible).toBe(false);
	});

	test(`cancel closes modal without sending event`, async () => {
		receiveCallback({ domain: `http://127.0.0.1`, hostnameForHosts: `local.test`, steps: [] });
		await wrapper.vm.$nextTick();
		expect(wrapper.vm.visible).toBe(true);

		wrapper.vm.cancel();
		expect(global.window.eyas.send).not.toHaveBeenCalledWith(`expose-setup-continue`);
		expect(wrapper.vm.visible).toBe(false);
	});

	test(`displays Windows hosts path when isWindows is true`, async () => {
		const payload = {
			domain: `http://127.0.0.1`,
			steps: [],
			isWindows: true
		};
		receiveCallback(payload);
		await wrapper.vm.$nextTick();
		expect(wrapper.vm.isWindows).toBe(true);
	});

	test(`displays macOS/Linux hosts path when isWindows is false`, async () => {
		const payload = {
			domain: `http://127.0.0.1`,
			steps: [],
			isWindows: false
		};
		receiveCallback(payload);
		await wrapper.vm.$nextTick();
		expect(wrapper.vm.isWindows).toBe(false);
	});

	test(`toggling useCustomDomain reveals hosts file instructions`, async () => {
		receiveCallback({ domain: `http://127.0.0.1`, steps: [] });
		await wrapper.vm.$nextTick();

		expect(document.querySelector(`[data-qa="hosts-file-instructions"]`)).toBeNull();
		await wrapper.setData({ useCustomDomain: true });
		expect(document.querySelector(`[data-qa="hosts-file-instructions"]`)).not.toBeNull();
	});

	test(`clicking hosts file instructions copies text and changes icon temporarily`, async () => {
		vi.useFakeTimers();
		receiveCallback({ domain: `http://127.0.0.1`, hostnameForHosts: `my.custom.url`, steps: [] });
		await wrapper.vm.$nextTick();
		await wrapper.setData({ useCustomDomain: true });

		const mockClipboard = { writeText: vi.fn() };
		Object.assign(navigator, { clipboard: mockClipboard });

		const sheet = document.querySelector(`.hosts-copy-block`);
		expect(wrapper.vm.copyIcon).toBe(`mdi-content-copy`);

		sheet.dispatchEvent(new Event(`click`));
		await wrapper.vm.$nextTick();
		expect(navigator.clipboard.writeText).toHaveBeenCalledWith(`127.0.0.1\tmy.custom.url`);
		expect(wrapper.vm.copyIcon).toBe(`mdi-check`);

		vi.advanceTimersByTime(2000);
		expect(wrapper.vm.copyIcon).toBe(`mdi-content-copy`);
		vi.useRealTimers();
	});

	test(`displayDomain returns 127.0.0.1 when useCustomDomain is false`, async () => {
		receiveCallback({ domain: `http://127.0.0.1`, steps: [] });
		await wrapper.vm.$nextTick();
		expect(wrapper.vm.useCustomDomain).toBe(false);
		expect(wrapper.vm.displayDomain).toBe(`127.0.0.1`);
	});

	test(`displayDomain returns custom hostname when useCustomDomain is true`, async () => {
		receiveCallback({ domain: `http://127.0.0.1`, hostnameForHosts: `my.custom.url`, steps: [] });
		await wrapper.vm.$nextTick();
		wrapper.vm.useCustomDomain = true;
		await wrapper.vm.$nextTick();
		expect(wrapper.vm.displayDomain).toBe(`my.custom.url`);
	});

	test(`displayPort computed property correctly hides standard protocol ports`, async () => {
		receiveCallback({ domain: `http://127.0.0.1`, portHttp: 80, portHttps: 443, steps: [] });
		await wrapper.vm.$nextTick();
		expect(wrapper.vm.useHttps).toBe(false);
		expect(wrapper.vm.displayPort).toBe(``);

		await wrapper.setData({ useHttps: true });
		expect(wrapper.vm.useHttps).toBe(true);
		expect(wrapper.vm.displayPort).toBe(``);

		await wrapper.setData({ useHttps: false, portHttp: 8080 });
		expect(wrapper.vm.displayPort).toBe(`:8080`);

		await wrapper.setData({ useHttps: true, portHttps: 8443 });
		expect(wrapper.vm.displayPort).toBe(`:8443`);
	});
});
