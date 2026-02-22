import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import TestServerResumeModal from '@/components/TestServerResumeModal.vue';

describe(`TestServerResumeModal`, () => {
	let wrapper;
	let receiveCallback;

	beforeEach(() => {
		global.window.eyas = { send: vi.fn(), receive: vi.fn((channel, fn) => { receiveCallback = fn; }) };
		wrapper = mount(TestServerResumeModal);
	});

	afterEach(() => {
		if (wrapper) wrapper.unmount();
		vi.clearAllMocks();
	});

	test(`receives show-test-server-resume-modal and shows modal`, async () => {
		receiveCallback();
		await wrapper.vm.$nextTick();
		expect(wrapper.vm.visible).toBe(true);
	});

	test(`resume sends test-server-resume-confirm and closes modal`, async () => {
		receiveCallback();
		await wrapper.vm.$nextTick();
		expect(wrapper.vm.visible).toBe(true);

		wrapper.vm.resume();
		expect(global.window.eyas.send).toHaveBeenCalledWith(`test-server-resume-confirm`);
		expect(wrapper.vm.visible).toBe(false);
	});

	test(`close closes modal without sending event`, async () => {
		receiveCallback();
		await wrapper.vm.$nextTick();
		expect(wrapper.vm.visible).toBe(true);

		wrapper.vm.close();
		expect(global.window.eyas.send).not.toHaveBeenCalledWith(`test-server-resume-confirm`);
		expect(wrapper.vm.visible).toBe(false);
	});
});
