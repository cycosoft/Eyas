import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import TestServerActiveModal from '@/components/TestServerActiveModal.vue';

describe(`TestServerActiveModal`, () => {
	let wrapper;
	let receiveCallback;

	beforeEach(() => {
		global.window.eyas = { send: vi.fn(), receive: vi.fn((channel, fn) => { receiveCallback = fn; }) };
		vi.useFakeTimers();
		wrapper = mount(TestServerActiveModal);
	});

	afterEach(() => {
		if (wrapper) wrapper.unmount();
		vi.clearAllMocks();
		vi.restoreAllMocks();
		vi.useRealTimers();
	});

	test(`receives show-test-server-active-modal and displays modal`, async () => {
		const payload = {
			domain: `http://127.0.01:1234`,
			startTime: 1000,
			endTime: 50000
		};
		receiveCallback(payload);
		await wrapper.vm.$nextTick();
		expect(wrapper.vm.visible).toBe(true);
		expect(wrapper.vm.domain).toBe(`http://127.0.01:1234`);
	});

	test(`End Session button emits test-server-stop`, async () => {
		receiveCallback({ domain: `http://localhost`, startTime: 0, endTime: 1000 });
		await wrapper.vm.$nextTick();
		wrapper.vm.stopServer();
		expect(global.window.eyas.send).toHaveBeenCalledWith(`test-server-stop`);
		expect(wrapper.vm.visible).toBe(false);
	});

	test(`Open in Browser button emits test-server-open-browser`, async () => {
		receiveCallback({ domain: `http://localhost`, startTime: 0, endTime: 1000 });
		await wrapper.vm.$nextTick();
		wrapper.vm.openInBrowser();
		expect(global.window.eyas.send).toHaveBeenCalledWith(`test-server-open-browser`);
	});

	test(`Copy to clipboard functionality`, async () => {
		receiveCallback({ domain: `http://custom.local`, startTime: 0, endTime: 1000 });
		await wrapper.vm.$nextTick();
		const mockClipboard = { writeText: vi.fn() };
		Object.assign(navigator, { clipboard: mockClipboard });

		wrapper.vm.copyDomain();
		expect(navigator.clipboard.writeText).toHaveBeenCalledWith(`http://custom.local`);
		expect(wrapper.vm.copyIcon).toBe(`mdi-check`);

		vi.advanceTimersByTime(2000);
		expect(wrapper.vm.copyIcon).toBe(`mdi-content-copy`);
	});
});
