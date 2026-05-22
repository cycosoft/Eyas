import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import type { VueWrapper } from '@vue/test-utils';
import NoUpdateModal from '@/components/NoUpdateModal.vue';
import { createPinia, setActivePinia } from 'pinia';
import type { WindowWithEyas, ChannelName } from '@registry/ipc.js';

describe(`NoUpdateModal`, () => {
	let wrapper: VueWrapper;
	let receiveCallback: (() => void) | null = null;

	beforeEach(async () => {
		setActivePinia(createPinia());
		receiveCallback = null;

		// Mock window.eyas
		(window as unknown as WindowWithEyas).eyas = {
			send: vi.fn(),
			receive: vi.fn((channel: ChannelName, cb: (...args: unknown[]) => void) => {
				if (channel === `show-no-update-modal`) {
					receiveCallback = cb as () => void;
				}
			})
		};

		vi.useFakeTimers();

		wrapper = mount(NoUpdateModal, {
			global: {
				stubs: {
					ModalWrapper: {
						name: `ModalWrapper`,
						template: `<div><slot v-if="modelValue" /></div>`,
						props: [`modelValue`]
					},
					VCard: { template: `<div><slot /></div>` },
					VCardTitle: { template: `<div><slot /></div>` },
					VCardText: { template: `<div><slot /></div>` },
					VCardActions: { template: `<div><slot /></div>` },
					VBtn: { template: `<button @click="$emit('click')"><slot /></button>` },
					VProgressLinear: { template: `<div></div>`, props: [`modelValue`] }
				}
			}
		});
	});

	afterEach(() => {
		if (wrapper) wrapper.unmount();
		vi.clearAllMocks();
		vi.useRealTimers();
	});

	test(`is hidden by default`, () => {
		expect(wrapper.find(`[data-qa="no-update-modal-text"]`).exists()).toBe(false);
	});

	test(`shows when show-no-update-modal is received`, async () => {
		if (receiveCallback) receiveCallback();
		await wrapper.vm.$nextTick();

		expect(wrapper.find(`[data-qa="no-update-modal-text"]`).exists()).toBe(true);
		expect(wrapper.find(`[data-qa="no-update-modal-text"]`).text()).toContain(`latest version of Eyas`);
	});

	test(`auto-closes after 4 seconds`, async () => {
		if (receiveCallback) receiveCallback();
		await wrapper.vm.$nextTick();

		expect(wrapper.find(`[data-qa="no-update-modal-text"]`).exists()).toBe(true);

		// Advance timers by 4000ms
		await vi.advanceTimersByTimeAsync(4000);
		await wrapper.vm.$nextTick();

		expect(wrapper.find(`[data-qa="no-update-modal-text"]`).exists()).toBe(false);
	});

	test(`closes immediately when OK button is clicked`, async () => {
		if (receiveCallback) receiveCallback();
		await wrapper.vm.$nextTick();

		expect(wrapper.find(`[data-qa="no-update-modal-text"]`).exists()).toBe(true);

		const okBtn = wrapper.find(`[data-qa="btn-no-update-ok"]`);
		await okBtn.trigger(`click`);
		await wrapper.vm.$nextTick();

		expect(wrapper.find(`[data-qa="no-update-modal-text"]`).exists()).toBe(false);
	});

	test(`closes immediately when clicking outside the modal`, async () => {
		if (receiveCallback) receiveCallback();
		await wrapper.vm.$nextTick();

		expect(wrapper.find(`[data-qa="no-update-modal-text"]`).exists()).toBe(true);

		const modalWrapper = wrapper.findComponent({ name: `ModalWrapper` });
		await modalWrapper.vm.$emit(`click:outside`);
		await wrapper.vm.$nextTick();

		expect(wrapper.find(`[data-qa="no-update-modal-text"]`).exists()).toBe(false);
	});
});
