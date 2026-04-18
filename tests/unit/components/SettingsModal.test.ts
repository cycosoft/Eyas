import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import type { VueWrapper } from '@vue/test-utils';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import SettingsModal from '@/components/SettingsModal.vue';
import type { Mock } from 'vitest';

type ComponentVM = {
	visible: boolean;
	toastVisible: boolean;
	projectId: string;
	activeTab: string;
	projectAlwaysChoose: boolean;
	appAlwaysChoose: boolean;
	saveProjectSetting: (key: string, value: unknown) => void;
	saveAppSetting: (key: string, value: unknown) => void;
	$nextTick: () => Promise<void>;
}

describe(`SettingsModal`, () => {
	let wrapper: VueWrapper;
	let mockSend: Mock;
	let mockReceive: Mock;

	beforeEach(() => {
		setActivePinia(createPinia());
		mockSend = vi.fn();
		mockReceive = vi.fn();
		const eyas = (window as unknown as { eyas: { send: Mock; receive: Mock } }).eyas;
		eyas.send = mockSend;
		eyas.receive = mockReceive;

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
		expect((wrapper.vm as unknown as ComponentVM).visible).toBe(false);
	});

	test(`listens for show-settings-modal IPC and sets visible = true`, () => {
		// Find the receive registration for show-settings-modal
		const call = mockReceive.mock.calls.find(c => c[0] === `show-settings-modal`);
		if (!call) throw new Error(`call not found`);
		expect(call).toBeDefined();

		// Invoke the callback
		call[1]({ project: {}, app: {}, projectId: `proj-test` });
		expect((wrapper.vm as unknown as ComponentVM).visible).toBe(true);
		expect((wrapper.vm as unknown as ComponentVM).projectId).toBe(`proj-test`);
	});

	test(`defaults to the Project tab`, () => {
		expect((wrapper.vm as unknown as ComponentVM).activeTab).toBe(`project`);
	});

	test(`show-settings-modal resets to Project tab`, () => {
		(wrapper.vm as unknown as ComponentVM).activeTab = `app`;
		const call = mockReceive.mock.calls.find(c => c[0] === `show-settings-modal`);
		if (!call) throw new Error(`call not found`);
		call[1]({ project: {}, app: {} });
		expect((wrapper.vm as unknown as ComponentVM).activeTab).toBe(`project`);
	});

	test(`populates projectAlwaysChoose from payload`, () => {
		const call = mockReceive.mock.calls.find(c => c[0] === `show-settings-modal`);
		if (!call) throw new Error(`call not found`);
		call[1]({ project: { env: { alwaysChoose: true } }, app: {} });
		expect((wrapper.vm as unknown as ComponentVM).projectAlwaysChoose).toBe(true);
	});

	test(`populates appAlwaysChoose from payload`, () => {
		const call = mockReceive.mock.calls.find(c => c[0] === `show-settings-modal`);
		if (!call) throw new Error(`call not found`);
		call[1]({ project: {}, app: { env: { alwaysChoose: true } } });
		expect((wrapper.vm as unknown as ComponentVM).appAlwaysChoose).toBe(true);
	});

	test(`saveProjectSetting sends save-setting with projectId`, () => {
		(wrapper.vm as unknown as ComponentVM).projectId = `proj-abc`;
		(wrapper.vm as unknown as ComponentVM).saveProjectSetting(`env.alwaysChoose`, true);
		expect(mockSend).toHaveBeenCalledWith(`save-setting`, {
			key: `env.alwaysChoose`,
			value: true,
			projectId: `proj-abc`
		});
	});

	test(`saveAppSetting sends save-setting with null projectId`, () => {
		(wrapper.vm as unknown as ComponentVM).saveAppSetting(`env.alwaysChoose`, false);
		expect(mockSend).toHaveBeenCalledWith(`save-setting`, {
			key: `env.alwaysChoose`,
			value: false,
			projectId: null
		});
	});

	test(`setting-saved IPC shows the toast if modal is visible`, () => {
		(wrapper.vm as unknown as ComponentVM).visible = true; // Modal must be visible for toast to show
		expect((wrapper.vm as unknown as ComponentVM).toastVisible).toBe(false);
		const call = mockReceive.mock.calls.find(c => c[0] === `setting-saved`);
		if (!call) throw new Error(`call not found`);
		expect(call).toBeDefined();
		call[1]();
		expect((wrapper.vm as unknown as ComponentVM).toastVisible).toBe(true);
	});

	test(`Close button sets visible = false`, async () => {
		(wrapper.vm as unknown as ComponentVM).visible = true;
		await (wrapper.vm as unknown as ComponentVM).$nextTick();

		(wrapper.vm as unknown as ComponentVM).visible = false;
		await (wrapper.vm as unknown as ComponentVM).$nextTick();
		expect((wrapper.vm as unknown as ComponentVM).visible).toBe(false);
	});

	test(`Close button does not send a save-setting`, async () => {
		(wrapper.vm as unknown as ComponentVM).visible = true;
		await (wrapper.vm as unknown as ComponentVM).$nextTick();
		(wrapper.vm as unknown as ComponentVM).visible = false;
		await (wrapper.vm as unknown as ComponentVM).$nextTick();
		expect(mockSend).not.toHaveBeenCalledWith(`save-setting`, expect.anything());
	});

	test(`show-settings-modal does NOT send save-setting (reproduction for toast bug)`, () => {
		const call = mockReceive.mock.calls.find(c => c[0] === `show-settings-modal`);
		if (!call) throw new Error(`call not found`);

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
		(wrapper.vm as unknown as ComponentVM).visible = false;
		(wrapper.vm as unknown as ComponentVM).toastVisible = false;

		// Simulate receiving setting-saved while closed
		const call = mockReceive.mock.calls.find(c => c[0] === `setting-saved`);
		if (!call) throw new Error(`call not found`);
		if (!call) throw new Error(`setting-saved call not found`);
		call[1]();

		// Open the modal
		const showCall = mockReceive.mock.calls.find(c => c[0] === `show-settings-modal`);
		if (!showCall) throw new Error(`show-settings-modal call not found`);
		showCall[1]({ project: {}, app: {} });

		await (wrapper.vm as unknown as ComponentVM).$nextTick();

		// The bug is that toastVisible will be true here
		expect((wrapper.vm as unknown as ComponentVM).toastVisible).toBe(false);
	});
});
