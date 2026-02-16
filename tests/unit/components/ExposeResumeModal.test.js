import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import ExposeResumeModal from '@/components/ExposeResumeModal.vue';

describe(`ExposeResumeModal`, () => {
	let wrapper;
	let receiveCallback;

	beforeEach(() => {
		global.window.eyas = { send: vi.fn(), receive: vi.fn((channel, fn) => { receiveCallback = fn; }) };
		wrapper = mount(ExposeResumeModal);
	});

	afterEach(() => {
		if (wrapper) wrapper.unmount();
		vi.clearAllMocks();
	});

	test(`receives show-expose-resume-modal and shows modal`, async () => {
		receiveCallback();
		await wrapper.vm.$nextTick();
		expect(wrapper.vm.visible).toBe(true);
	});

	test(`resume sends expose-resume-confirm and closes modal`, async () => {
		receiveCallback();
		await wrapper.vm.$nextTick();
		expect(wrapper.vm.visible).toBe(true);

		wrapper.vm.resume();
		expect(global.window.eyas.send).toHaveBeenCalledWith(`expose-resume-confirm`);
		expect(wrapper.vm.visible).toBe(false);
	});

	test(`close closes modal without sending event`, async () => {
		receiveCallback();
		await wrapper.vm.$nextTick();
		expect(wrapper.vm.visible).toBe(true);

		wrapper.vm.close();
		expect(global.window.eyas.send).not.toHaveBeenCalledWith(`expose-resume-confirm`);
		expect(wrapper.vm.visible).toBe(false);
	});
});
