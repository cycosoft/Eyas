import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import type { VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import AppHeader from '@/components/AppHeader.vue';
import type { WindowWithEyas } from '@registry/ipc.js';

describe(`AppHeader`, () => {
	let wrapper: VueWrapper;
	let mockSend: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		vi.useFakeTimers();
		setActivePinia(createPinia());
		mockSend = vi.fn();
		(window as unknown as WindowWithEyas).eyas = {
			send: mockSend,
			receive: vi.fn()
		};

		wrapper = mount(AppHeader, {
			global: {
				stubs: {
					VAppBar: { template: `<div><slot /></div>` },
					VMenu: { template: `<div><slot /></div>` },
					VList: { template: `<div><slot /></div>` },
					VBtn: { template: `<button @focus="$emit('focus', $event)" @mouseenter="$emit('mouseenter', $event)" @mouseleave="$emit('mouseleave', $event)"><slot /></button>` },
					VIcon: true
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

	describe(`menu activation`, () => {
		test(`activate() opens the menu and sets menu items from the group`, async () => {
			const vm = wrapper.vm as unknown as {
				menu: boolean;
				menuItems: { title: string; value: string }[];
				activate: (event: { currentTarget: Element }, group: { name: string; submenu: { title: string; value: string }[] }) => void;
			};

			const fakeEl = document.createElement(`button`);
			const group = { name: `Test`, submenu: [{ title: `Item`, value: `item` }] };

			vm.activate({ currentTarget: fakeEl }, group);
			await wrapper.vm.$nextTick();

			expect(vm.menu).toBe(true);
			expect(vm.menuItems).toEqual(group.submenu);
		});

		test(`activate() sends show-ui IPC when menu was closed`, async () => {
			const vm = wrapper.vm as unknown as {
				menu: boolean;
				activate: (event: { currentTarget: Element }, group: { name: string; submenu: { title: string; value: string }[] }) => void;
			};
			vm.menu = false;

			const fakeEl = document.createElement(`button`);
			vm.activate({ currentTarget: fakeEl }, { name: `Test`, submenu: [] });
			await wrapper.vm.$nextTick();

			expect(mockSend).toHaveBeenCalledWith(`show-ui`);
		});

		test(`activate() sets menuMoving when menu is already open`, async () => {
			const vm = wrapper.vm as unknown as {
				menu: boolean;
				menuMoving: boolean;
				activate: (event: { currentTarget: Element }, group: { name: string; submenu: { title: string; value: string }[] }) => void;
			};
			vm.menu = true;

			const fakeEl = document.createElement(`button`);
			vm.activate({ currentTarget: fakeEl }, { name: `Test`, submenu: [] });
			await wrapper.vm.$nextTick();

			expect(vm.menuMoving).toBe(true);

			// after 300ms the transition flag clears
			vi.advanceTimersByTime(300);
			expect(vm.menuMoving).toBe(false);
		});
	});

	describe(`menu close`, () => {
		test(`delayedClose() closes menu after 600ms`, async () => {
			const vm = wrapper.vm as unknown as {
				menu: boolean;
				delayedClose: () => void;
			};
			vm.menu = true;

			vm.delayedClose();
			expect(vm.menu).toBe(true); // not closed yet

			vi.advanceTimersByTime(600);
			expect(vm.menu).toBe(false);
		});

		test(`delayedClose() sends hide-ui IPC after timeout`, async () => {
			const vm = wrapper.vm as unknown as {
				menu: boolean;
				delayedClose: () => void;
			};
			vm.menu = true;

			vm.delayedClose();
			vi.advanceTimersByTime(600);

			expect(mockSend).toHaveBeenCalledWith(`hide-ui`);
		});

		test(`onListEnter() cancels a pending close`, async () => {
			const vm = wrapper.vm as unknown as {
				menu: boolean;
				delayedClose: () => void;
				onListEnter: () => void;
			};
			vm.menu = true;

			vm.delayedClose();
			vm.onListEnter(); // cancel the close

			vi.advanceTimersByTime(600);
			expect(vm.menu).toBe(true); // still open
		});
	});
});
