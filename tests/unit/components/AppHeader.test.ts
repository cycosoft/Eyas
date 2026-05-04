import { describe, test, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { mount } from '@vue/test-utils';
import type { VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import AppHeader from '@/components/AppHeader.vue';
import useModalsStore from '@/stores/modals.js';
import type { WindowWithEyas, ChannelName, NavigationStatePayload } from '@registry/ipc.js';
import type { AppHeaderVM, NavGroup, NavItem, NavActivateEvent } from '@registry/components.js';

describe(`AppHeader`, () => {
	let wrapper: VueWrapper;
	let uiShownCallback: ((...args: unknown[]) => void) | null = null;
	let mockSend: Mock;

	beforeEach(() => {
		vi.useFakeTimers();
		setActivePinia(createPinia());
		mockSend = vi.fn();
		uiShownCallback = null;
		(window as unknown as WindowWithEyas).eyas = {
			send: mockSend,
			receive: vi.fn((channel: ChannelName, cb: (...args: unknown[]) => void) => {
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
					VListItem: { template: `<div @click="$emit('click')"><slot /></div>` },
					VBtn: { template: `<button :disabled="$attrs.disabled" @click="$emit('click', $event)" @mouseenter="$emit('mouseenter', $event)"><slot /></button>` },
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

	test(`updates navigation button states via IPC`, async () => {
		let navCallback: ((payload: NavigationStatePayload) => void) | null = null;

		(window as unknown as WindowWithEyas).eyas.receive = vi.fn((channel: ChannelName, cb: (...args: unknown[]) => void) => {
			if (channel === `navigation-state-updated`) {
				navCallback = cb as (payload: NavigationStatePayload) => void;
			}
			if (channel === `ui-shown`) {
				uiShownCallback = cb;
			}
		});

		wrapper = mount(AppHeader, {
			global: {
				stubs: {
					VAppBar: { template: `<div><slot /></div>` },
					VMenu: { template: `<div><slot /></div>` },
					VList: { template: `<div><slot /></div>` },
					VListItem: { template: `<div @click="$emit('click')"><slot /></div>` },
					VBtn: { template: `<button :disabled="$attrs.disabled" @click="$emit('click', $event)" @mouseenter="$emit('mouseenter', $event)"><slot /></button>` },
					VIcon: true,
					VImg: true
				}
			}
		});

		if (navCallback) {
			(navCallback as any)({ canGoBack: true, canGoForward: true }); // eslint-disable-line @typescript-eslint/no-explicit-any
		}
		await wrapper.vm.$nextTick();

		const newVm = wrapper.vm as unknown as AppHeaderVM;
		expect(newVm.canGoBack).toBe(true);
		expect(newVm.canGoForward).toBe(true);
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

		test(`activate() toggles menu off if already open for the same group`, async () => {
			const vm = wrapper.vm as unknown as AppHeaderVM;
			const fakeEl = document.createElement(`button`);
			const group = { name: `Test`, submenu: [] };

			vm.menu = true;
			vm.activator = fakeEl;

			vm.activate({ currentTarget: fakeEl } as unknown as NavActivateEvent, group);
			await wrapper.vm.$nextTick();

			expect(vm.menu).toBe(false);
		});

		test(`onMouseEnter() activates only when menu is already open`, async () => {
			const vm = wrapper.vm as unknown as AppHeaderVM;
			const fakeEl = document.createElement(`button`);
			const group = { name: `Test`, submenu: [{ title: `Item`, value: `item` }] };

			// 1. Menu is closed -> onMouseEnter should NOT activate
			vm.menu = false;
			vm.onMouseEnter({ currentTarget: fakeEl } as unknown as NavActivateEvent, group);
			await wrapper.vm.$nextTick();
			expect(vm.menu).toBe(false);

			// 2. Menu is open -> onMouseEnter SHOULD activate for a DIFFERENT group
			vm.menu = true;
			vm.activator = document.createElement(`div`); // different from fakeEl
			vm.onMouseEnter({ currentTarget: fakeEl } as unknown as NavActivateEvent, group);
			await wrapper.vm.$nextTick();
			expect(vm.menuItems).toEqual(group.submenu);

			// 3. Menu is open -> onMouseEnter should NOT activate for the SAME group
			const otherGroup = { name: `Other`, submenu: [] };
			vm.activator = fakeEl;
			vm.onMouseEnter({ currentTarget: fakeEl } as unknown as NavActivateEvent, otherGroup);
			await wrapper.vm.$nextTick();
			expect(vm.menuItems).not.toEqual(otherGroup.submenu);
		});
	});

	describe(`menu close`, () => {
		test(`menu watch sends hide-ui IPC when menu closes`, async () => {
			const vm = wrapper.vm as unknown as AppHeaderVM;
			vm.menu = true;
			await wrapper.vm.$nextTick();

			vm.menu = false;
			await wrapper.vm.$nextTick();
			vi.advanceTimersByTime(600);

			expect(mockSend).toHaveBeenCalledWith(`hide-ui`);
		});
		test(`menu watch does NOT send hide-ui IPC when menu closes if a modal is visible`, async () => {
			const vm = wrapper.vm as unknown as AppHeaderVM;
			const modalsStore = useModalsStore();

			// mock an open modal
			modalsStore.track(`test-modal`);

			vm.menu = true;
			await wrapper.vm.$nextTick();

			vm.menu = false;
			await wrapper.vm.$nextTick();
			vi.advanceTimersByTime(600);

			expect(mockSend).not.toHaveBeenCalledWith(`hide-ui`);
		});



		test(`onItemClick() sends show-about IPC for 'about' item`, () => {
			const vm = wrapper.vm as unknown as AppHeaderVM;
			vm.onItemClick({ title: `About`, value: `about` });
			expect(mockSend).toHaveBeenCalledWith(`show-about`);
		});

		test(`onItemClick() sends show-test-server-setup IPC for 'test-server' item`, () => {
			const vm = wrapper.vm as unknown as AppHeaderVM;
			vm.onItemClick({ title: `Test Server`, value: `test-server` });
			expect(mockSend).toHaveBeenCalledWith(`show-test-server-setup`);
		});

		test(`onItemClick() sends request-exit IPC for 'exit' item`, () => {
			const vm = wrapper.vm as unknown as AppHeaderVM;
			vm.onItemClick({ title: `Exit`, value: `exit` });
			expect(mockSend).toHaveBeenCalledWith(`request-exit`);
		});

		test(`onItemClick() sends show-settings IPC for 'settings' item`, () => {
			const vm = wrapper.vm as unknown as AppHeaderVM;
			vm.onItemClick({ title: `App/Project Settings`, value: `settings` });
			expect(mockSend).toHaveBeenCalledWith(`show-settings`);
		});

		test(`onItemClick() sends show-whats-new IPC with true for 'changelog' item`, () => {
			const vm = wrapper.vm as unknown as AppHeaderVM;
			vm.onItemClick({ title: `Changelog`, value: `changelog` });
			expect(mockSend).toHaveBeenCalledWith(`show-whats-new`, true);
		});

		test(`onItemClick() sends show-whats-new IPC with true for 'whats-new' item`, () => {
			const vm = wrapper.vm as unknown as AppHeaderVM;
			vm.onItemClick({ title: `What's New`, value: `whats-new` });
			expect(mockSend).toHaveBeenCalledWith(`show-whats-new`, true);
		});

		test(`'File' menu has 'Exit' item with correct icon and color`, () => {
			const vm = wrapper.vm as unknown as AppHeaderVM;
			const fileMenu = vm.groups.find((g: NavGroup) => g.name === `File`);
			const exitItem = fileMenu?.submenu?.find((i: NavItem) => i.value === `exit`);
			expect(exitItem).toBeDefined();
			expect(exitItem?.title).toBe(`Exit`);
			expect(exitItem?.icon).toBe(`mdi-power`);
			expect(exitItem?.color).toBe(`error`);
			expect(exitItem?.shortcut).toBe(`Ctrl+Q`);
		});

		test(`'File' menu has 'App/Project Settings' item with correct icon`, () => {
			const vm = wrapper.vm as unknown as AppHeaderVM;
			const fileMenu = vm.groups.find((g: NavGroup) => g.name === `File`);
			const settingsItem = fileMenu?.submenu?.find((i: NavItem) => i.title === `App/Project Settings`);
			expect(settingsItem).toBeDefined();
			expect(settingsItem?.value).toBe(`settings`);
			expect(settingsItem?.icon).toBe(`mdi-cog`);
			expect(settingsItem?.mnemonic).toBe(`S`);
		});

		test(`'File' menu has 'Changelog' item with correct icon`, () => {
			const vm = wrapper.vm as unknown as AppHeaderVM;
			const fileMenu = vm.groups.find((g: NavGroup) => g.name === `File`);
			const changelogItem = fileMenu?.submenu?.find((i: NavItem) => i.title === `Changelog`);
			expect(changelogItem).toBeDefined();
			expect(changelogItem?.value).toBe(`changelog`);
			expect(changelogItem?.icon).toBe(`mdi-history`);
			expect(changelogItem?.mnemonic).toBe(`C`);
		});

		test(`onItemClick() closes menu and sends hide-ui IPC`, async () => {
			const vm = wrapper.vm as unknown as AppHeaderVM;
			vm.menu = true;
			await wrapper.vm.$nextTick();

			vm.onItemClick({ title: `Item`, value: `item` });
			expect(vm.menu).toBe(false);
			await wrapper.vm.$nextTick();
			vi.advanceTimersByTime(600);
			expect(mockSend).toHaveBeenCalledWith(`hide-ui`);
		});

		describe(`browser controls`, () => {
			test(`goBack() sends browser-back IPC`, () => {
				const vm = wrapper.vm as unknown as AppHeaderVM;
				vm.goBack();
				expect(mockSend).toHaveBeenCalledWith(`browser-back`);
			});

			test(`goForward() sends browser-forward IPC`, () => {
				const vm = wrapper.vm as unknown as AppHeaderVM;
				vm.goForward();
				expect(mockSend).toHaveBeenCalledWith(`browser-forward`);
			});

			test(`reload() sends browser-reload IPC`, () => {
				const vm = wrapper.vm as unknown as AppHeaderVM;
				vm.reload();
				expect(mockSend).toHaveBeenCalledWith(`browser-reload`);
			});

			test(`goHome() sends browser-home IPC`, () => {
				const vm = wrapper.vm as unknown as AppHeaderVM;
				vm.goHome();
				expect(mockSend).toHaveBeenCalledWith(`browser-home`);
			});

			test(`onBrowserControlClick() triggers correct IPC messages`, () => {
				const vm = wrapper.vm as unknown as AppHeaderVM;

				vm.onBrowserControlClick(`back`);
				expect(mockSend).toHaveBeenCalledWith(`browser-back`);

				vm.onBrowserControlClick(`forward`);
				expect(mockSend).toHaveBeenCalledWith(`browser-forward`);

				vm.onBrowserControlClick(`reload`);
				expect(mockSend).toHaveBeenCalledWith(`browser-reload`);

				vm.onBrowserControlClick(`home`);
				expect(mockSend).toHaveBeenCalledWith(`browser-home`);
			});
		});

		describe(`developer tools`, () => {
			test(`onItemClick() sends open-devtools-ui IPC for 'devtools-ui' item`, () => {
				const vm = wrapper.vm as unknown as AppHeaderVM;
				vm.onItemClick({ title: `Developer Tools (Eyas)`, value: `devtools-ui` });
				expect(mockSend).toHaveBeenCalledWith(`open-devtools-ui`);
			});

			test(`onItemClick() sends open-devtools-test IPC for 'devtools-test' item`, () => {
				const vm = wrapper.vm as unknown as AppHeaderVM;
				vm.onItemClick({ title: `Developer Tools (Test)`, value: `devtools-test` });
				expect(mockSend).toHaveBeenCalledWith(`open-devtools-test`);
			});

			test(`'Developer Tools (Eyas)' is hidden when isDev is false`, async () => {
				let navCallback: ((payload: NavigationStatePayload) => void) | null = null;
				(window as unknown as WindowWithEyas).eyas.receive = vi.fn((channel: ChannelName, cb: (...args: unknown[]) => void) => {
					if (channel === `navigation-state-updated`) {
						navCallback = cb as (payload: NavigationStatePayload) => void;
					}
				});

				wrapper = mount(AppHeader, {
					global: {
						stubs: {
							VAppBar: { template: `<div><slot /></div>` },
							VMenu: { template: `<div><slot /></div>` },
							VList: { template: `<div><slot /></div>` },
							VListItem: { template: `<div @click="$emit('click')"><slot /></div>` },
							VBtn: { template: `<button :disabled="$attrs.disabled" @click="$emit('click', $event)" @mouseenter="$emit('mouseenter', $event)"><slot /></button>` },
							VIcon: true,
							VImg: true
						}
					}
				});

				if (navCallback) {
					(navCallback as any)({ isDev: false }); // eslint-disable-line @typescript-eslint/no-explicit-any
				}
				await wrapper.vm.$nextTick();

				const vm = wrapper.vm as unknown as AppHeaderVM;
				const toolsMenu = vm.groups.find((g: NavGroup) => g.name === `Tools`);
				const eyasDevTools = toolsMenu?.submenu?.find((i: NavItem) => i.value === `devtools-ui`);
				expect(eyasDevTools).toBeUndefined();
			});

			test(`'Developer Tools (Eyas)' is shown when isDev is true`, async () => {
				let navCallback: ((payload: NavigationStatePayload) => void) | null = null;
				(window as unknown as WindowWithEyas).eyas.receive = vi.fn((channel: ChannelName, cb: (...args: unknown[]) => void) => {
					if (channel === `navigation-state-updated`) {
						navCallback = cb as (payload: NavigationStatePayload) => void;
					}
				});

				wrapper = mount(AppHeader, {
					global: {
						stubs: {
							VAppBar: { template: `<div><slot /></div>` },
							VMenu: { template: `<div><slot /></div>` },
							VList: { template: `<div><slot /></div>` },
							VListItem: { template: `<div @click="$emit('click')"><slot /></div>` },
							VBtn: { template: `<button :disabled="$attrs.disabled" @click="$emit('click', $event)" @mouseenter="$emit('mouseenter', $event)"><slot /></button>` },
							VIcon: true,
							VImg: true
						}
					}
				});

				if (navCallback) {
					(navCallback as any)({ isDev: true }); // eslint-disable-line @typescript-eslint/no-explicit-any
				}
				await wrapper.vm.$nextTick();

				const vm = wrapper.vm as unknown as AppHeaderVM;
				const toolsMenu = vm.groups.find((g: NavGroup) => g.name === `Tools`);
				const eyasDevTools = toolsMenu?.submenu?.find((i: NavItem) => i.value === `devtools-ui`);
				expect(eyasDevTools).toBeDefined();
				expect(eyasDevTools?.title).toBe(`Developer Tools (Eyas)`);
			});
		});
	});

	describe(`links menu`, () => {
		test(`updates links from navigation state`, async () => {
			let navCallback: ((payload: NavigationStatePayload) => void) | null = null;
			(window as unknown as WindowWithEyas).eyas.receive = vi.fn((channel: ChannelName, cb: (...args: unknown[]) => void) => {
				if (channel === `navigation-state-updated`) {
					navCallback = cb as (payload: NavigationStatePayload) => void;
				}
			});

			wrapper = mount(AppHeader, {
				global: {
					stubs: {
						VAppBar: { template: `<div><slot /></div>` },
						VMenu: { template: `<div><slot /></div>` },
						VList: { template: `<div><slot /></div>` },
						VListItem: { template: `<div @click="$emit('click')"><slot /></div>` },
						VBtn: { template: `<button :disabled="$attrs.disabled" @click="$emit('click', $event)" @mouseenter="$emit('mouseenter', $event)"><slot /></button>` },
						VIcon: true,
						VImg: true
					}
				}
			});

			const links: NavItem[] = [
				{ title: `Google`, value: `launch-link:{"url":"https://google.com","external":true}` }
			];

			if (navCallback) {
				(navCallback as any)({ links }); // eslint-disable-line @typescript-eslint/no-explicit-any
			}
			await wrapper.vm.$nextTick();

			const vm = wrapper.vm as unknown as AppHeaderVM;
			const linksGroup = vm.groups.find((g: NavGroup) => g.name === `Links`);
			expect(linksGroup).toBeDefined();
			expect(linksGroup?.submenu).toEqual(links);
		});

		test(`onItemClick() sends launch-link IPC for link items`, () => {
			const vm = wrapper.vm as unknown as AppHeaderVM;
			const payload = { url: `https://google.com`, external: true };
			vm.onItemClick({ title: `Google`, value: `launch-link:${JSON.stringify(payload)}` });
			expect(mockSend).toHaveBeenCalledWith(`launch-link`, payload);
		});

		test(`onItemClick() sends show-variables-modal IPC for variable link items`, () => {
			const vm = wrapper.vm as unknown as AppHeaderVM;
			const url = `https://example.com/{myvar}`;
			vm.onItemClick({ title: `Variable`, value: `launch-link-var:${url}` });
			expect(mockSend).toHaveBeenCalledWith(`show-variables-modal`, url);
		});
	});
});
