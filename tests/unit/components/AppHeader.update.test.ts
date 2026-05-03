import { describe, test, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { mount } from '@vue/test-utils';
import type { VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import AppHeader from '@/components/AppHeader.vue';
import type { WindowWithEyas, ChannelName, UpdateStatus } from '@registry/ipc.js';

describe(`AppHeader Update Button`, () => {
	let wrapper: VueWrapper;
	let mockSend: Mock;
	let updateCallback: ((status: UpdateStatus) => void) | null = null;

	beforeEach(() => {
		vi.useFakeTimers();
		setActivePinia(createPinia());
		mockSend = vi.fn();
		updateCallback = null;

		(window as unknown as WindowWithEyas).eyas = {
			send: mockSend,
			receive: vi.fn((channel: ChannelName, cb: (...args: unknown[]) => void) => {
				if (channel === `update-status-updated`) {
					updateCallback = cb as (status: UpdateStatus) => void;
				}
			})
		};

		wrapper = mount(AppHeader, {
			global: {
				stubs: {
					VAppBar: { template: `<div><slot /></div>` },
					VMenu: { template: `<div><slot /></div>` },
					VList: { template: `<div><slot /></div>` },
					VListItem: { template: `<div @click="$emit('click')"><slot /></div>` },
					VBtn: { template: `<button :disabled="$attrs.disabled" :variant="$attrs.variant" :ripple="$attrs.ripple" @click="$emit('click', $event)" @mouseenter="$emit('mouseenter', $event)"><slot /></button>` },
					VIcon: true,
					VImg: true
				}
			}
		});
	});

	afterEach(() => {
		if (wrapper) { wrapper.unmount(); }
		vi.clearAllMocks();
		vi.useRealTimers();
	});

	test(`renders the check for updates button by default`, () => {
		const btn = wrapper.find(`[data-qa="btn-broadcast"]`);
		expect(btn.exists()).toBe(true);
		expect(btn.find(`v-icon-stub`).attributes(`icon`)).toBe(`mdi-progress-check`);
		expect(btn.attributes(`variant`)).toBe(`plain`);
		expect(btn.attributes(`ripple`)).toBe(`false`);
	});

	test(`calls check-for-updates when clicked in idle state`, async () => {
		const btn = wrapper.find(`[data-qa="btn-broadcast"]`);
		await btn.trigger(`click`);

		expect(mockSend).toHaveBeenCalledWith(`check-for-updates`);
	});

	test(`shows checking state`, async () => {
		if (updateCallback) { updateCallback(`checking`); }
		await wrapper.vm.$nextTick();

		const btn = wrapper.find(`[data-qa="btn-broadcast"]`);
		expect(btn.find(`v-icon-stub`).attributes(`icon`)).toBe(`mdi-progress-clock`);
		expect(btn.attributes(`title`)).toBe(`Checking for updates...`);
		expect(btn.attributes()).toHaveProperty(`disabled`);
		expect(btn.attributes(`color`)).toBe(`primary`);
		expect(btn.attributes(`variant`)).toBe(`text`);
		expect(btn.attributes(`ripple`)).toBe(`true`);
		expect(btn.classes()).toContain(`blink-animation`);
	});

	test(`enforces a minimum duration for the checking state`, async () => {
		if (updateCallback) {
			updateCallback(`checking`);
			updateCallback(`error`);
		}
		await wrapper.vm.$nextTick();

		const btn = wrapper.find(`[data-qa="btn-broadcast"]`);
		expect(btn.find(`v-icon-stub`).attributes(`icon`)).toBe(`mdi-progress-clock`);

		vi.advanceTimersByTime(500);
		await wrapper.vm.$nextTick();
		expect(btn.find(`v-icon-stub`).attributes(`icon`)).toBe(`mdi-progress-close`);
	});

	test(`shows downloading state`, async () => {
		if (updateCallback) { updateCallback(`downloading`); }
		await wrapper.vm.$nextTick();

		const btn = wrapper.find(`[data-qa="btn-broadcast"]`);
		expect(btn.find(`v-icon-stub`).attributes(`icon`)).toBe(`mdi-progress-download`);
		expect(btn.attributes(`title`)).toBe(`Downloading update...`);
		expect(btn.attributes()).toHaveProperty(`disabled`);
		expect(btn.attributes(`variant`)).toBe(`text`);
		expect(btn.attributes(`ripple`)).toBe(`true`);
		expect(btn.classes()).toContain(`blink-animation`);
	});

	test(`shows downloaded state and installs on click`, async () => {
		if (updateCallback) { updateCallback(`downloaded`); }
		await wrapper.vm.$nextTick();

		const btn = wrapper.find(`[data-qa="btn-broadcast"]`);
		expect(btn.find(`v-icon-stub`).attributes(`icon`)).toBe(`mdi-progress-alert`);
		expect(btn.attributes(`title`)).toBe(`Update available - Click to restart`);
		expect(btn.attributes(`color`)).toBe(`success`);
		expect(btn.attributes(`variant`)).toBe(`text`);
		expect(btn.attributes(`ripple`)).toBe(`true`);

		await btn.trigger(`click`);
		expect(mockSend).toHaveBeenCalledWith(`request-update-ready-modal`);
	});

	test(`shows error state`, async () => {
		if (updateCallback) { updateCallback(`error`); }
		await wrapper.vm.$nextTick();

		const btn = wrapper.find(`[data-qa="btn-broadcast"]`);
		expect(btn.find(`v-icon-stub`).attributes(`icon`)).toBe(`mdi-progress-close`);
		expect(btn.attributes(`title`)).toBe(`Update check failed`);
		expect(btn.attributes(`color`)).toBe(`error`);
		expect(btn.attributes(`variant`)).toBe(`plain`);
		expect(btn.attributes(`ripple`)).toBe(`false`);
	});

	test(`calls check-for-updates when clicked in error state`, async () => {
		if (updateCallback) { updateCallback(`error`); }
		await wrapper.vm.$nextTick();

		const btn = wrapper.find(`[data-qa="btn-broadcast"]`);
		await btn.trigger(`click`);

		expect(mockSend).toHaveBeenCalledWith(`check-for-updates`);
	});
});
