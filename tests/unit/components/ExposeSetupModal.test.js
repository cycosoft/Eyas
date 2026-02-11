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

	test(`receives show-expose-setup-modal and shows steps`, async () => {
		const payload = {
			domain: `http://127.0.0.1:3456`,
			hostnameForHosts: `local.test`,
			steps: [
				{ id: `ca`, label: `Install mkcert CA`, status: `pending`, canInitiate: true },
				{ id: `hosts`, label: `Add etc/hosts`, status: `pending`, canInitiate: false }
			]
		};
		receiveCallback(payload);
		await wrapper.vm.$nextTick();
		expect(wrapper.vm.visible).toBe(true);
		expect(wrapper.vm.steps).toHaveLength(2);
		expect(wrapper.vm.hostsLine).toContain(`127.0.0.1`);
		expect(wrapper.vm.hostsLine).toContain(`local.test`);
	});

	test(`continueStart sends expose-setup-continue and closes modal`, async () => {
		receiveCallback({ domain: `http://127.0.0.1`, hostnameForHosts: `local.test`, steps: [] });
		await wrapper.vm.$nextTick();
		wrapper.vm.continueStart();
		expect(global.window.eyas.send).toHaveBeenCalledWith(`expose-setup-continue`);
		expect(wrapper.vm.visible).toBe(false);
	});
});
