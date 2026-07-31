import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import AppHeader from '@/components/AppHeader.vue';
import useRecordingStore from '@/stores/recording.js';
import { isItemLocked } from '@/components/AppHeader.playback.js';
import { state } from '@/components/AppHeader.logic.js';
import type { WindowWithEyas } from '@registry/ipc.js';
import type { AppHeaderVM } from '@registry/components.js';

const stubs = {
	VAppBar: { template: `<div><slot /></div>` }, VMenu: { template: `<div><slot /></div>` }, VList: { template: `<div><slot /></div>` },
	VListItem: { template: `<div @click="$emit('click')"><slot /></div>` },
	VBtn: { template: `<button :disabled="$attrs.disabled" @click="$emit('click', $event)" @mouseenter="$emit('mouseenter', $event)"><slot /></button>` },
	VIcon: true, VImg: true,
	VSystemBar: { template: `<div class="v-system-bar" v-bind="$attrs"><slot /></div>` }
};

describe(`AppHeader playback lock`, () => {
	let wrapper: VueWrapper;

	beforeEach(() => {
		setActivePinia(createPinia());
		Object.assign(state, { isHeaderHovered: false, menu: false, envMenu: false, activeGroup: null });
		(window as unknown as WindowWithEyas).eyas = { send: vi.fn(), receive: vi.fn() };
		wrapper = mount(AppHeader, { global: { stubs } });
	});

	afterEach(() => {
		if (wrapper) wrapper.unmount();
		vi.clearAllMocks();
	});

	test(`isItemLocked() is false for a normal item when not replaying`, () => {
		expect(isItemLocked({ title: `About`, value: `about` })).toBe(false);
	});

	test(`isItemLocked() locks known items while a recording is replaying`, () => {
		useRecordingStore().setPlaybackStatus({ status: `playing` });

		for (const value of [`about`, `settings`, `check-updates`, `changelog`, `test-server`, `cache`]) {
			expect(isItemLocked({ title: value, value })).toBe(true);
		}
	});

	test(`isItemLocked() does NOT lock 'exit' or devtools items while replaying`, () => {
		useRecordingStore().setPlaybackStatus({ status: `playing` });

		expect(isItemLocked({ title: `Exit`, value: `exit` })).toBe(false);
		expect(isItemLocked({ title: `Developer Tools`, value: `devtools-test` })).toBe(false);
		expect(isItemLocked({ title: `Developer Tools (Eyas)`, value: `devtools-ui` })).toBe(false);
	});

	test(`isItemLocked() locks the entire Links group while replaying, regardless of item value`, () => {
		useRecordingStore().setPlaybackStatus({ status: `playing` });
		state.activeGroup = `Links`;

		expect(isItemLocked({ title: `Some Link`, value: `launch-link:{"url":"https://example.com"}` })).toBe(true);
	});

	test(`isItemLocked() no longer locks items once playback stops`, () => {
		useRecordingStore().setPlaybackStatus({ status: `playing` });
		expect(isItemLocked({ title: `About`, value: `about` })).toBe(true);

		useRecordingStore().setPlaybackStatus({ status: `stopped` });
		expect(isItemLocked({ title: `About`, value: `about` })).toBe(false);
	});

	test(`browser control buttons are disabled while replaying`, async () => {
		const vm = wrapper.vm as unknown as AppHeaderVM;
		useRecordingStore().setPlaybackStatus({ status: `playing` });
		await wrapper.vm.$nextTick();

		expect(wrapper.find(`[data-qa="btn-browser-back"]`).attributes(`disabled`)).toBeDefined();
		expect(wrapper.find(`[data-qa="btn-browser-forward"]`).attributes(`disabled`)).toBeDefined();
		expect(wrapper.find(`[data-qa="btn-browser-reload"]`).attributes(`disabled`)).toBeDefined();
		expect(wrapper.find(`[data-qa="btn-browser-home"]`).attributes(`disabled`)).toBeDefined();
		expect(vm).toBeDefined();
	});
});
