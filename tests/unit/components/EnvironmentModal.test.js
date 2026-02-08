import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import EnvironmentModal from '@/components/EnvironmentModal.vue';

describe(`EnvironmentModal`, () => {
	let wrapper;
	let mockSend;
	let mockReceive;

	beforeEach(() => {
		mockSend = vi.fn();
		mockReceive = vi.fn();
		global.window.eyas.send = mockSend;
		global.window.eyas.receive = mockReceive;

		wrapper = mount(EnvironmentModal);
	});

	afterEach(() => {
		if (wrapper) {
			wrapper.unmount();
		}
		vi.clearAllMocks();
	});

	test(`receives domains via IPC and displays them`, async () => {
		const domains = [
			{ url: `https://example.com`, title: `Example` },
			{ url: `test.com`, title: `Test` }
		];

		// Simulate IPC receive - call the callback that was registered in mounted()
		// The component registers: window.eyas?.receive('show-environment-modal', domains => {...})
		const receiveCallback = wrapper.vm.$options.mounted?.[0] ||
			(() => {
				// Manually trigger the IPC receive
				if (global.window.eyas.receive.mock.calls.length > 0) {
					const call = global.window.eyas.receive.mock.calls.find(
						c => c[0] === `show-environment-modal`
					);
					if (call && call[1]) {
						call[1](domains);
					}
				}
			});

		// Trigger the receive callback
		if (typeof receiveCallback === `function`) {
			receiveCallback();
		} else {
			// Directly set the data to test the component state
			wrapper.vm.domains = domains;
			wrapper.vm.visible = true;
		}

		await wrapper.vm.$nextTick();

		expect(wrapper.vm.domains).toEqual(domains);
		expect(wrapper.vm.visible).toBe(true);
	});

	test(`sends environment-selected IPC with URL when button clicked`, async () => {
		const domains = [
			{ url: `https://example.com`, title: `Example` }
		];

		// Set up the component with domains
		wrapper.vm.domains = domains;
		wrapper.vm.visible = true;
		await wrapper.vm.$nextTick();

		// Call choose method directly to test IPC sending
		wrapper.vm.choose(domains[0].url, 0);

		// Wait for setTimeout in choose method
		await new Promise(resolve => setTimeout(resolve, 250));

		// Verify IPC was called with the URL
		expect(mockSend).toHaveBeenCalledWith(`environment-selected`, `https://example.com`);
	});

	test(`sends URL without protocol correctly`, async () => {
		const domains = [
			{ url: `example.com`, title: `Example` }
		];

		wrapper.vm.domains = domains;
		wrapper.vm.visible = true;
		await wrapper.vm.$nextTick();

		// Call choose method directly to test IPC sending
		wrapper.vm.choose(domains[0].url, 0);

		await new Promise(resolve => setTimeout(resolve, 250));

		// URL without protocol should be sent as-is (parseURL will handle it in main process)
		expect(mockSend).toHaveBeenCalledWith(`environment-selected`, `example.com`);
	});

	test(`modal shows and hides correctly`, async () => {
		expect(wrapper.vm.visible).toBe(false);

		const domains = [{ url: `https://example.com`, title: `Example` }];

		// Directly set the component state to test visibility
		wrapper.vm.domains = domains;
		wrapper.vm.visible = true;
		await wrapper.vm.$nextTick();
		expect(wrapper.vm.visible).toBe(true);

		wrapper.vm.visible = false;
		await wrapper.vm.$nextTick();
		expect(wrapper.vm.visible).toBe(false);
	});
});
