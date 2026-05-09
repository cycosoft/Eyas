import { describe, test, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
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
					VAppBar: { template: `<div><slot /></div>` }, VMenu: { template: `<div><slot /></div>` }, VList: { template: `<div><slot /></div>` },
					VListItem: { template: `<div @click="$emit('click')"><slot /></div>` },
					VBtn: { template: `<button :disabled="$attrs.disabled" @click="$emit('click', $event)" @mouseenter="$emit('mouseenter', $event)"><slot /></button>` },
					VIcon: true, VImg: true
				}
			}
		});
	});

	afterEach(() => {
		if (wrapper) { wrapper.unmount(); }
		vi.clearAllMocks();
		vi.useRealTimers();
	});

	test(`renders without crashing`, () => { expect(wrapper.exists()).toBe(true); });

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

	describe(`header hover behavior`, () => {
		test(`handleHeaderMouseEnter() sends show-ui IPC and clears close timer`, () => {
			const vm = wrapper.vm as unknown as AppHeaderVM;
			vm.handleHeaderMouseEnter();
			expect(mockSend).toHaveBeenCalledWith(`show-ui`);
		});

		test(`handleHeaderMouseLeave() starts delayed close and sends hide-ui after timeout`, async () => {
			const vm = wrapper.vm as unknown as AppHeaderVM;
			vm.menu = false;
			vm.envMenu = false;
			const modalsStore = useModalsStore();
			modalsStore.$reset();

			vm.handleHeaderMouseLeave();
			await wrapper.vm.$nextTick();

			// fast forward past delayedClose timeout (300ms)
			vi.advanceTimersByTime(310);
			expect(mockSend).toHaveBeenCalledWith(`hide-ui`);
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
				{ title: `Google`, value: `launch-link:{"url":"https://google.com","openInBrowser":true}` }
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
			const payload = { url: `https://google.com`, openInBrowser: true };
			vm.onItemClick({ title: `Google`, value: `launch-link:${JSON.stringify(payload)}` });
			expect(mockSend).toHaveBeenCalledWith(`launch-link`, payload);
		});

		test(`onItemClick() sends launch-link-variable IPC for variable link items`, () => {
			const vm = wrapper.vm as unknown as AppHeaderVM;
			const url = `https://example.com/{myvar}`;
			vm.onItemClick({ title: `Variable`, value: `launch-link-var:${url}` });
			expect(mockSend).toHaveBeenCalledWith(`launch-link-variable`, url);
		});
	});

	describe(`omni-hub central display`, () => {
		test(`renders the central container and all placeholder elements with default fallback text`, () => {
			const container = wrapper.find(`[data-qa="omni-hub-container"]`);
			expect(container.exists()).toBe(true);
			expect(container.find(`[data-qa="omni-hub-lock"]`).exists()).toBe(true);
			expect(container.find(`[data-qa="omni-hub-status"]`).text()).toContain(`Offline`);
			expect(container.find(`[data-qa="omni-hub-url"]`).text()).toBe(`Load a New Eyas to Get Started`);
			expect(container.find(`[data-qa="omni-hub-env-dropdown"]`).exists()).toBe(false);
		});

		test(`updates URL and handles fallbacks according to display rules`, async () => {
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
						VImg: true,
						VTooltip: { template: `<div class="v-tooltip"><slot /></div>` }
					}
				}
			});

			const vm = wrapper.vm as unknown as AppHeaderVM;

			// 1. Initial State (no URL loaded yet, fallback should apply)
			expect(vm.displayUrlInfo.text).toBe(`Load a New Eyas to Get Started`);
			expect(vm.displayUrlInfo.isFallback).toBe(true);
			expect(wrapper.find(`[data-qa="omni-hub-url"]`).find(`.v-tooltip`).exists()).toBe(false);

			// 2. Load about:blank (fallback should apply)
			if (navCallback) {
				(navCallback as any)({ canGoBack: false, canGoForward: false, currentUrl: `about:blank` }); // eslint-disable-line @typescript-eslint/no-explicit-any
			}
			await wrapper.vm.$nextTick();
			expect(vm.displayUrlInfo.text).toBe(`Load a New Eyas to Get Started`);
			expect(vm.displayUrlInfo.isFallback).toBe(true);
			expect(wrapper.find(`[data-qa="omni-hub-url"]`).find(`.v-tooltip`).exists()).toBe(false);

			// 3. Load a data URI (fallback should apply)
			if (navCallback) {
				(navCallback as any)({ canGoBack: false, canGoForward: false, currentUrl: `data:text/html,<html></html>` }); // eslint-disable-line @typescript-eslint/no-explicit-any
			}
			await wrapper.vm.$nextTick();
			expect(vm.displayUrlInfo.text).toBe(`Load a New Eyas to Get Started`);
			expect(vm.displayUrlInfo.isFallback).toBe(true);
			expect(wrapper.find(`[data-qa="omni-hub-url"]`).find(`.v-tooltip`).exists()).toBe(false);

			// 4. Load a real URL
			const targetUrl = `https://staging.eyas.app/environments/demo-v2`;
			if (navCallback) {
				(navCallback as any)({ canGoBack: false, canGoForward: false, currentUrl: targetUrl }); // eslint-disable-line @typescript-eslint/no-explicit-any
			}
			await wrapper.vm.$nextTick();
			expect(vm.displayUrlInfo.text).toBe(targetUrl);
			expect(vm.displayUrlInfo.isFallback).toBe(false);

			const urlSpan = wrapper.find(`[data-qa="omni-hub-url"]`);
			expect(urlSpan.text()).toContain(targetUrl);

			const tooltip = urlSpan.find(`.v-tooltip`);
			expect(tooltip.exists()).toBe(true);
			expect(tooltip.text()).toContain(`Click to Copy`);

			// 5. Test click-to-copy behavior on valid URL
			await urlSpan.trigger(`click`);
			expect(mockSend).toHaveBeenCalledWith(`browser-copy-url`);

			// 6. Test that click-to-copy does NOT trigger on fallback URL
			mockSend.mockClear();
			if (navCallback) {
				(navCallback as any)({ canGoBack: false, canGoForward: false, currentUrl: `about:blank` }); // eslint-disable-line @typescript-eslint/no-explicit-any
			}
			await wrapper.vm.$nextTick();
			await urlSpan.trigger(`click`);
			expect(mockSend).not.toHaveBeenCalledWith(`browser-copy-url`);
		});
	});

	describe(`environments dropdown`, () => {
		let navCallback: ((payload: NavigationStatePayload) => void) | null = null;

		beforeEach(() => {
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
		});

		test(`does not render the environment dropdown button when there are no environments`, () => {
			const dropdownBtn = wrapper.find(`[data-qa="omni-hub-env-dropdown"]`);
			expect(dropdownBtn.exists()).toBe(false);
		});

		test(`renders SELECT ENV when environments are defined but none is selected`, async () => {
			if (navCallback) {
				(navCallback as any)({ // eslint-disable-line @typescript-eslint/no-explicit-any
					canGoBack: false,
					canGoForward: false,
					environments: [
						{ url: `dev.eyas.cycosoft.com`, title: `Development` },
						{ url: `staging.eyas.cycosoft.com`, title: `Staging` }
					]
				});
			}
			await wrapper.vm.$nextTick();
			const dropdownBtn = wrapper.find(`[data-qa="omni-hub-env-dropdown"]`);
			expect(dropdownBtn.text()).toContain(`SELECT ENV`);
		});

		test(`renders the current environment title when selected`, async () => {
			if (navCallback) {
				(navCallback as any)({ // eslint-disable-line @typescript-eslint/no-explicit-any
					canGoBack: false,
					canGoForward: false,
					environments: [
						{ url: `dev.eyas.cycosoft.com`, title: `Development` },
						{ url: `staging.eyas.cycosoft.com`, title: `Staging` }
					],
					currentEnvironment: `staging.eyas.cycosoft.com`
				});
			}
			await wrapper.vm.$nextTick();
			const dropdownBtn = wrapper.find(`[data-qa="omni-hub-env-dropdown"]`);
			expect(dropdownBtn.text()).toContain(`Staging`);
		});

		test(`renders environment list items without number badges and fires IPC on click`, async () => {
			const environments = [
				{ url: `dev.eyas.cycosoft.com`, title: `Development`, key: `dev.` },
				{ url: `staging.eyas.cycosoft.com`, title: `Staging`, key: `staging.` }
			];

			if (navCallback) {
				(navCallback as any)({ // eslint-disable-line @typescript-eslint/no-explicit-any
					canGoBack: false,
					canGoForward: false,
					environments,
					currentEnvironment: `dev.eyas.cycosoft.com`,
					projectId: `test-project`,
					domainsHash: `hash123`
				});
			}
			await wrapper.vm.$nextTick();

			const envItems = wrapper.findAll(`.env-item`);
			expect(envItems.length).toBe(2);
			expect(envItems[0].text()).toBe(`Development`);
			expect(envItems[1].text()).toBe(`Staging`);

			await envItems[1].trigger(`click`);

			expect(mockSend).toHaveBeenCalledWith(`save-setting`, {
				key: `env.lastChoice`,
				value: environments[1],
				projectId: `test-project`
			});
			expect(mockSend).toHaveBeenCalledWith(`save-setting`, {
				key: `env.lastChoiceHash`,
				value: `hash123`,
				projectId: `test-project`
			});
			expect(mockSend).toHaveBeenCalledWith(`environment-selected`, environments[1]);
		});

		test(`expands UI layer when envMenu becomes true and collapses it after delay when false`, async () => {
			const vm = wrapper.vm as any; // eslint-disable-line @typescript-eslint/no-explicit-any

			// 1. Open the env menu
			vm.envMenu = true;
			await wrapper.vm.$nextTick();
			expect(mockSend).toHaveBeenCalledWith(`show-ui`);

			// 2. Close the env menu
			vm.envMenu = false;
			await wrapper.vm.$nextTick();

			// Fast forward 310ms
			vi.advanceTimersByTime(310);
			expect(mockSend).toHaveBeenCalledWith(`hide-ui`);
		});
	});
});


