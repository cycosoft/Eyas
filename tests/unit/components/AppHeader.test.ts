import { describe, test, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { mount } from '@vue/test-utils';
import type { VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import AppHeader from '@/components/AppHeader.vue';
import type { WindowWithEyas } from '@registry/ipc.js';
import type { AppHeaderVM } from '@registry/components.js';
import type { ChannelName } from '@registry/primitives.js';

describe(`AppHeader`, () => {
	let wrapper: VueWrapper;
	let uiShownCallback: (() => void) | null = null;
	let mockSend: Mock;

	beforeEach(() => {
		vi.useFakeTimers();
		setActivePinia(createPinia());
		mockSend = vi.fn();
		uiShownCallback = null;
		(window as unknown as WindowWithEyas).eyas = {
			send: mockSend,
			receive: vi.fn((channel: ChannelName, cb: () => void) => {
				if (channel === `ui-shown`) {
					uiShownCallback = cb;
				}
			})
		};

		wrapper = mount(AppHeader, {
			global: {
				stubs: {
					VAppBar: { template: `<div><slot /></div>` },
					VMenu: { template: `<div><slot /></div>` },
					VList: { template: `<div><slot /></div>` },
					VBtn: { template: `<button @focus="$emit('focus', $event)" @mouseenter="$emit('mouseenter', $event)" @mouseleave="$emit('mouseleave', $event)"><slot /></button>` },
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

	test(`renders without crashing`, () => {
		expect(wrapper.exists()).toBe(true);
	});

	test(`renders logo instead of text for 'File' menu`, () => {
		const fileBtn = wrapper.findAll(`button`)[0];
		expect(fileBtn.find(`v-img-stub`).exists()).toBe(true);
		expect(fileBtn.text()).not.toContain(`File`);
	});

	describe(`menu activation`, () => {
		test(`activate() sets menu items from the group`, async () => {
			const vm = wrapper.vm as unknown as AppHeaderVM;

			const fakeEl = document.createElement(`button`);
			const group = { name: `Test`, submenu: [{ title: `Item`, value: `item` }] };

			vm.activate({ currentTarget: fakeEl }, group);

			// simulate IPC propagation
			if (uiShownCallback) uiShownCallback();
			await wrapper.vm.$nextTick();
			vi.advanceTimersByTime(20); // trigger requestAnimationFrame
			await wrapper.vm.$nextTick();

			expect(vm.menuItems).toEqual(group.submenu);
		});

		test(`activate() sends show-ui IPC when menu was closed`, async () => {
			const vm = wrapper.vm as unknown as AppHeaderVM;
			vm.menu = false;

			const fakeEl = document.createElement(`button`);
			vm.activate({ currentTarget: fakeEl }, { name: `Test`, submenu: [] });
			await wrapper.vm.$nextTick();

			expect(mockSend).toHaveBeenCalledWith(`show-ui`);
		});

		test(`activate() does NOT open menu immediately when menu was closed (waits for IPC event)`, async () => {
			const vm = wrapper.vm as unknown as AppHeaderVM;
			vm.menu = false;

			vm.activate({ currentTarget: document.createElement(`button`) }, { name: `Test`, submenu: [] });
			await wrapper.vm.$nextTick();

			// menu should NOT be open yet — it waits for the IPC event/fallback
			expect(vm.menu).toBe(false);
		});

		test(`activate() opens menu after ui-shown event fires (viewport has expanded)`, async () => {
			const vm = wrapper.vm as unknown as AppHeaderVM;
			vm.menu = false;

			vm.activate({ currentTarget: document.createElement(`button`) }, { name: `Test`, submenu: [] });

			// simulate IPC event
			if (uiShownCallback) uiShownCallback();
			await wrapper.vm.$nextTick();
			vi.advanceTimersByTime(20); // trigger requestAnimationFrame
			await wrapper.vm.$nextTick();

			expect(vm.menu).toBe(true);
		});

		test(`activate() opens menu via fallback timeout if resize never fires`, async () => {
			const vm = wrapper.vm as unknown as AppHeaderVM;
			vm.menu = false;

			vm.activate({ currentTarget: document.createElement(`button`) }, { name: `Test`, submenu: [] });
			expect(vm.menu).toBe(false);

			vi.advanceTimersByTime(200);
			await wrapper.vm.$nextTick();
			vi.advanceTimersByTime(20); // trigger requestAnimationFrame
			await wrapper.vm.$nextTick();

			expect(vm.menu).toBe(true);
		});

		test(`activate() opens menu immediately when menu is already open (glide)`, async () => {
			const vm = wrapper.vm as unknown as AppHeaderVM;
			vm.menu = true;

			vm.activate({ currentTarget: document.createElement(`button`) }, { name: `Test`, submenu: [] });
			await wrapper.vm.$nextTick();

			// Already at full height — no wait needed
			expect(vm.menu).toBe(true);
		});
	});

	describe(`menu close`, () => {
		test(`delayedClose() closes menu after 600ms`, async () => {
			const vm = wrapper.vm as unknown as AppHeaderVM;
			vm.menu = true;

			vm.delayedClose();
			expect(vm.menu).toBe(true); // not closed yet

			vi.advanceTimersByTime(600);
			expect(vm.menu).toBe(false);
		});

		test(`delayedClose() sends hide-ui IPC after timeout`, async () => {
			const vm = wrapper.vm as unknown as AppHeaderVM;
			vm.menu = true;

			vm.delayedClose();
			vi.advanceTimersByTime(600);

			expect(mockSend).toHaveBeenCalledWith(`hide-ui`);
		});

		test(`onListEnter() cancels a pending close`, async () => {
			const vm = wrapper.vm as unknown as AppHeaderVM;
			vm.menu = true;

			vm.delayedClose();
			vm.onListEnter(); // cancel the close

			vi.advanceTimersByTime(600);
			expect(vm.menu).toBe(true); // still open
		});
	});
});
