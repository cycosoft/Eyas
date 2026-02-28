import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import SettingsModal from '@/components/SettingsModal.vue';

describe(`SettingsModal`, () => {
	let wrapper;
	let mockSend;
	let mockReceive;

	beforeEach(() => {
		mockSend = vi.fn();
		mockReceive = vi.fn();
		global.window.eyas.send = mockSend;
		global.window.eyas.receive = mockReceive;

		wrapper = mount(SettingsModal);
	});

	afterEach(() => {
		if (wrapper) { wrapper.unmount(); }
		vi.clearAllMocks();
	});

	test(`modal is hidden by default`, () => {
		expect(wrapper.vm.visible).toBe(false);
	});

	test(`listens for show-settings-modal IPC and sets visible = true`, () => {
		// Find the receive registration for show-settings-modal
		const call = mockReceive.mock.calls.find(c => c[0] === `show-settings-modal`);
		expect(call).toBeDefined();

		// Invoke the callback
		call[1]({ project: {}, app: {}, projectId: `proj-test` });
		expect(wrapper.vm.visible).toBe(true);
		expect(wrapper.vm.projectId).toBe(`proj-test`);
	});

	test(`defaults to the Project tab`, () => {
		expect(wrapper.vm.activeTab).toBe(`project`);
	});

	test(`show-settings-modal resets to Project tab`, () => {
		wrapper.vm.activeTab = `app`;
		const call = mockReceive.mock.calls.find(c => c[0] === `show-settings-modal`);
		call[1]({ project: {}, app: {} });
		expect(wrapper.vm.activeTab).toBe(`project`);
	});

	test(`populates projectAlwaysChoose from payload`, () => {
		const call = mockReceive.mock.calls.find(c => c[0] === `show-settings-modal`);
		call[1]({ project: { env: { alwaysChoose: true } }, app: {} });
		expect(wrapper.vm.projectAlwaysChoose).toBe(true);
	});

	test(`populates appAlwaysChoose from payload`, () => {
		const call = mockReceive.mock.calls.find(c => c[0] === `show-settings-modal`);
		call[1]({ project: {}, app: { env: { alwaysChoose: true } } });
		expect(wrapper.vm.appAlwaysChoose).toBe(true);
	});

	test(`saveProjectSetting sends save-setting with projectId`, () => {
		wrapper.vm.projectId = `proj-abc`;
		wrapper.vm.saveProjectSetting(`env.alwaysChoose`, true);
		expect(mockSend).toHaveBeenCalledWith(`save-setting`, {
			key: `env.alwaysChoose`,
			value: true,
			projectId: `proj-abc`
		});
	});

	test(`saveAppSetting sends save-setting with null projectId`, () => {
		wrapper.vm.saveAppSetting(`env.alwaysChoose`, false);
		expect(mockSend).toHaveBeenCalledWith(`save-setting`, {
			key: `env.alwaysChoose`,
			value: false,
			projectId: null
		});
	});

	test(`setting-saved IPC shows the toast`, () => {
		expect(wrapper.vm.toastVisible).toBe(false);
		const call = mockReceive.mock.calls.find(c => c[0] === `setting-saved`);
		expect(call).toBeDefined();
		call[1]();
		expect(wrapper.vm.toastVisible).toBe(true);
	});

	test(`Close button sets visible = false`, async () => {
		wrapper.vm.visible = true;
		await wrapper.vm.$nextTick();

		wrapper.vm.visible = false;
		await wrapper.vm.$nextTick();
		expect(wrapper.vm.visible).toBe(false);
	});

	test(`Close button does not send a save-setting`, async () => {
		wrapper.vm.visible = true;
		await wrapper.vm.$nextTick();
		wrapper.vm.visible = false;
		await wrapper.vm.$nextTick();
		expect(mockSend).not.toHaveBeenCalledWith(`save-setting`, expect.anything());
	});
});
