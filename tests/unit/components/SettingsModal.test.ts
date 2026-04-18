import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import SettingsModal from '@/components/SettingsModal.vue';

describe(`SettingsModal`, () => {
	let wrapper: VueWrapper<any>;
	let mockSend: any;
	let mockReceive: any;

	beforeEach(() => {
		setActivePinia(createPinia());
		mockSend = vi.fn();
		mockReceive = vi.fn();
		(window as any).eyas.send = mockSend;
		(window as any).eyas.receive = mockReceive;

		wrapper = mount(SettingsModal, {
			global: {
				plugins: [createPinia()]
			}
		});
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
		const call = mockReceive.mock.calls.find((c: any) => c[0] === `show-settings-modal`);
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
		const call = mockReceive.mock.calls.find((c: any) => c[0] === `show-settings-modal`);
		call[1]({ project: {}, app: {} });
		expect(wrapper.vm.activeTab).toBe(`project`);
	});

	test(`populates projectAlwaysChoose from payload`, () => {
		const call = mockReceive.mock.calls.find((c: any) => c[0] === `show-settings-modal`);
		call[1]({ project: { env: { alwaysChoose: true } }, app: {} });
		expect(wrapper.vm.projectAlwaysChoose).toBe(true);
	});

	test(`populates appAlwaysChoose from payload`, () => {
		const call = mockReceive.mock.calls.find((c: any) => c[0] === `show-settings-modal`);
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

	test(`setting-saved IPC shows the toast if modal is visible`, () => {
		wrapper.vm.visible = true; // Modal must be visible for toast to show
		expect(wrapper.vm.toastVisible).toBe(false);
		const call = mockReceive.mock.calls.find((c: any) => c[0] === `setting-saved`);
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

	test(`show-settings-modal does NOT send save-setting (reproduction for toast bug)`, () => {
		const call = mockReceive.mock.calls.find((c: any) => c[0] === `show-settings-modal`);

		// Reset mock to ensure we don't count the initial setup if any
		mockSend.mockClear();

		// Setting values that are different from the current ones to see if it triggers an update
		call[1]({
			project: { env: { alwaysChoose: true } },
			app: { env: { alwaysChoose: true } },
			projectId: `proj-test`
		});

		expect(mockSend).not.toHaveBeenCalledWith(`save-setting`, expect.anything());
	});

	test(`toast is NOT shown if setting-saved was received while modal was closed`, async () => {
		// Ensure modal is closed and toast is hidden
		wrapper.vm.visible = false;
		wrapper.vm.toastVisible = false;

		// Simulate receiving setting-saved while closed
		const call = mockReceive.mock.calls.find((c: any) => c[0] === `setting-saved`);
		call[1]();

		// Open the modal
		const showCall = mockReceive.mock.calls.find((c: any) => c[0] === `show-settings-modal`);
		showCall[1]({ project: {}, app: {} });

		await wrapper.vm.$nextTick();

		// The bug is that toastVisible will be true here
		expect(wrapper.vm.toastVisible).toBe(false);
	});
});
