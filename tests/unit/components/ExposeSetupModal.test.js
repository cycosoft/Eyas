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

	test(`receives show-expose-setup-modal and displays modal`, async () => {
		const payload = {
			domain: `http://127.0.0.1`,
			port: 12345,
			hostnameForHosts: `local.test`,
			steps: [],
			useHttps: false
		};
		receiveCallback(payload);
		await wrapper.vm.$nextTick();
		expect(wrapper.vm.visible).toBe(true);
		expect(wrapper.vm.steps).toHaveLength(0);
		expect(wrapper.vm.hostsLine).toContain(`127.0.0.1`);
		expect(wrapper.vm.hostsLine).toContain(`local.test`);
		expect(wrapper.vm.port).toBe(12345);
	});

	test(`continueStart sends expose-setup-continue with useHttps and closes modal`, async () => {
		receiveCallback({ domain: `http://127.0.0.1`, hostnameForHosts: `local.test`, steps: [], useHttps: true });
		await wrapper.vm.$nextTick();
		expect(wrapper.vm.useHttps).toBe(true);

		wrapper.vm.useHttps = false;
		wrapper.vm.continueStart();
		expect(global.window.eyas.send).toHaveBeenCalledWith(`expose-setup-continue`, { useHttps: false });
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
});
