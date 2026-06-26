import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import type { VueWrapper } from '@vue/test-utils';
import UpdateReadyModal from '@/components/UpdateReadyModal.vue';
import { createPinia, setActivePinia } from 'pinia';
import type { WindowWithEyas, ChannelName } from '@registry/ipc.js';
import type { IsVisible, IsExitFlow } from '@registry/primitives.js';
import useSettingsStore from '@/stores/settings.js';

describe(`UpdateReadyModal`, () => {
	let wrapper: VueWrapper;
	let mockSend: ReturnType<typeof vi.fn>;
	let receiveCallback: ((value: IsVisible, isExitFlow?: IsExitFlow) => void) | null = null;

	beforeEach(async () => {
		setActivePinia(createPinia());
		mockSend = vi.fn();
		receiveCallback = null;

		// Mock window.eyas
		(window as unknown as WindowWithEyas).eyas = {
			send: mockSend as unknown as (channel: ChannelName, ...args: unknown[]) => void,
			receive: vi.fn((channel: ChannelName, cb: (...args: unknown[]) => void) => {
				if (channel === `show-update-ready-modal`) {
					receiveCallback = cb as (value: IsVisible, isExitFlow?: IsExitFlow) => void;
				}
			})
		};

		wrapper = mount(UpdateReadyModal, {
			global: {
				stubs: {
					ModalWrapper: {
						template: `<div><slot v-if="modelValue" /></div>`,
						props: [`modelValue`]
					},
					VCard: { template: `<div><slot /></div>` },
					VCardTitle: { template: `<div><slot /></div>` },
					VCardText: { template: `<div><slot /></div>` },
					VCardActions: { template: `<div><slot /></div>` },
					VBtn: { template: `<button @click="$emit('click')"><slot /></button>` },
					VBtnGroup: { template: `<div><slot /></div>` },
					VMenu: {
						template: `<div><slot name="activator" :props="{}" /><slot /></div>`
					},
					VList: { template: `<div><slot /></div>` },
					VListItem: { template: `<div @click="$emit('click')"><slot /></div>` },
					VListItemTitle: { template: `<div><slot /></div>` }
				}
			}
		});
	});

	afterEach(() => {
		if (wrapper) wrapper.unmount();
		vi.clearAllMocks();
	});

	test(`is hidden by default`, () => {
		expect(wrapper.find(`[data-qa="update-ready-modal-text"]`).exists()).toBe(false);
	});

	test(`shows when show-update-ready-modal is received`, async () => {
		if (receiveCallback) receiveCallback(true);
		await wrapper.vm.$nextTick();

		expect(wrapper.find(`[data-qa="update-ready-modal-text"]`).exists()).toBe(true);
		expect(wrapper.find(`[data-qa="update-ready-modal-text"]`).text()).toContain(`ready to install`);
	});

	test(`hides and does not exit when "Cancel" is clicked`, async () => {
		if (receiveCallback) receiveCallback(true, true);
		await wrapper.vm.$nextTick();

		const cancelBtn = wrapper.find(`[data-qa="btn-update-cancel"]`);
		await cancelBtn.trigger(`click`);

		expect(wrapper.find(`[data-qa="update-ready-modal-text"]`).exists()).toBe(false);
		expect(mockSend).not.toHaveBeenCalledWith(`app-exit`);
	});

	test(`exits app when "Later" is clicked in exit flow`, async () => {
		const settingsStore = useSettingsStore();
		settingsStore.appSettings.allowBypassUpdates = true;

		if (receiveCallback) receiveCallback(true, true);
		await wrapper.vm.$nextTick();

		const laterBtn = wrapper.find(`[data-qa="btn-update-later"]`);
		await laterBtn.trigger(`click`);

		expect(mockSend).toHaveBeenCalledWith(`app-exit`);
	});

	test(`sends install-update when "Close & Update" is clicked`, async () => {
		if (receiveCallback) receiveCallback(true);
		await wrapper.vm.$nextTick();

		const updateBtn = wrapper.find(`[data-qa="btn-update-now"]`);
		await updateBtn.trigger(`click`);

		expect(mockSend).toHaveBeenCalledWith(`install-update`);
	});

	test(`hides "Later" dropdown button in normal flow even if bypass is enabled`, async () => {
		const settingsStore = useSettingsStore();
		settingsStore.appSettings.allowBypassUpdates = true;

		if (receiveCallback) receiveCallback(true, false);
		await wrapper.vm.$nextTick();

		expect(wrapper.find(`[data-qa="btn-update-menu"]`).exists()).toBe(false);
	});

	test(`hides "Later" dropdown button in normal flow if bypass is disabled`, async () => {
		const settingsStore = useSettingsStore();
		settingsStore.appSettings.allowBypassUpdates = false;

		if (receiveCallback) receiveCallback(true, false);
		await wrapper.vm.$nextTick();

		expect(wrapper.find(`[data-qa="btn-update-menu"]`).exists()).toBe(false);
	});

	test(`hides "Later" dropdown button in exit flow if bypass is disabled`, async () => {
		const settingsStore = useSettingsStore();
		settingsStore.appSettings.allowBypassUpdates = false;

		if (receiveCallback) receiveCallback(true, true);
		await wrapper.vm.$nextTick();

		expect(wrapper.find(`[data-qa="btn-update-menu"]`).exists()).toBe(false);
	});

	test(`shows "Later" dropdown button in exit flow if bypass is enabled`, async () => {
		const settingsStore = useSettingsStore();
		settingsStore.appSettings.allowBypassUpdates = true;

		if (receiveCallback) receiveCallback(true, true);
		await wrapper.vm.$nextTick();

		expect(wrapper.find(`[data-qa="btn-update-menu"]`).exists()).toBe(true);
	});
});
