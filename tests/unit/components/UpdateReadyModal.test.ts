import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import type { VueWrapper } from '@vue/test-utils';
import UpdateReadyModal from '@/components/UpdateReadyModal.vue';
import { createPinia, setActivePinia } from 'pinia';
import type { WindowWithEyas, ChannelName } from '@registry/ipc.js';
import type { IsVisible } from '@registry/primitives.js';

describe(`UpdateReadyModal`, () => {
	let wrapper: VueWrapper;
	let mockSend: ReturnType<typeof vi.fn>;
	let receiveCallback: ((value: IsVisible) => void) | null = null;

	beforeEach(async () => {
		setActivePinia(createPinia());
		mockSend = vi.fn();
		receiveCallback = null;

		// Mock window.eyas
		(window as unknown as WindowWithEyas).eyas = {
			send: mockSend as unknown as (channel: ChannelName, ...args: unknown[]) => void,
			receive: vi.fn((channel: ChannelName, cb: (...args: unknown[]) => void) => {
				if (channel === `show-update-ready-modal`) {
					receiveCallback = cb as (value: IsVisible) => void;
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
					VBtn: { template: `<button @click="$emit('click')"><slot /></button>` }
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

	test(`hides when "Later" is clicked`, async () => {
		if (receiveCallback) receiveCallback(true);
		await wrapper.vm.$nextTick();

		const laterBtn = wrapper.find(`[data-qa="btn-update-later"]`);
		await laterBtn.trigger(`click`);

		expect(wrapper.find(`[data-qa="update-ready-modal-text"]`).exists()).toBe(false);
	});

	test(`sends install-update when "Update Eyas Now" is clicked`, async () => {
		if (receiveCallback) receiveCallback(true);
		await wrapper.vm.$nextTick();

		const updateBtn = wrapper.find(`[data-qa="btn-update-now"]`);
		await updateBtn.trigger(`click`);

		expect(mockSend).toHaveBeenCalledWith(`install-update`);
	});
});
