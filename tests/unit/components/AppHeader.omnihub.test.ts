import { describe, test, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import AppHeader from '@/components/AppHeader.vue';
import { state } from '@/components/AppHeader.logic.js';
import type { WindowWithEyas, ChannelName, NavigationStatePayload } from '@registry/ipc.js';
import type { AppHeaderVM, NavGroup, NavItem } from '@registry/components.js';

describe(`AppHeader OmniHub & Advanced Controls`, () => {
	let wrapper: VueWrapper;
	let mockSend: Mock;

	beforeEach(() => {
		vi.useFakeTimers();
		setActivePinia(createPinia());
		mockSend = vi.fn();

		// Reset module-level reactive state to prevent leaks
		state.isHeaderHovered = false;
		state.menu = false;
		state.envMenu = false;
		state.tooltipVisible = false;
		state.tooltipText = `Click to Copy`;
		(window as unknown as WindowWithEyas).eyas = {
			send: mockSend,
			receive: vi.fn()
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
						VTooltip: { template: `<div class="v-tooltip" :data-target="$attrs.target" :data-model-value="$attrs.modelValue"><slot /></div>` }
					}
				}
			});

			const vm = wrapper.vm as unknown as AppHeaderVM;

			// 1. Initial State (no URL loaded yet, fallback should apply)
			expect(vm.tooltipVisible).toBe(false);
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
			expect(vm.tooltipText).toBe(`Click to Copy`);
			// Verify cursor-position target is bound (not the fixed string 'cursor')
			expect(vm.cursorPos).toEqual([0, 0]);
			expect(tooltip.attributes(`data-model-value`)).toBe(`false`);

			const omniHubContainer = wrapper.find(`[data-qa="omni-hub-container"]`);

			// 5. Test click-to-copy behavior on valid URL and dynamic tooltip text change
			await omniHubContainer.trigger(`click`);
			expect(mockSend).toHaveBeenCalledWith(`browser-copy-url`);
			expect(vm.tooltipText).toBe(`Copied!`);

			// Fast-forward 2000ms to test timeout reversion
			vi.advanceTimersByTime(2000);
			expect(vm.tooltipText).toBe(`Click to Copy`);

			// Click again to set back to Copied! and test closure reversion
			await omniHubContainer.trigger(`click`);
			expect(vm.tooltipText).toBe(`Copied!`);

			// Simulate tooltip open and then close to trigger the watcher reversion
			state.tooltipVisible = true;
			await wrapper.vm.$nextTick();
			state.tooltipVisible = false;
			await wrapper.vm.$nextTick();
			expect(vm.tooltipText).toBe(`Click to Copy`);

			// 6. Test that click-to-copy does NOT trigger on fallback URL
			mockSend.mockClear();
			if (navCallback) {
				(navCallback as any)({ canGoBack: false, canGoForward: false, currentUrl: `about:blank` }); // eslint-disable-line @typescript-eslint/no-explicit-any
			}
			await wrapper.vm.$nextTick();
			await omniHubContainer.trigger(`click`);
			expect(mockSend).not.toHaveBeenCalledWith(`browser-copy-url`);
		});

		test(`renders secure mdi-lock icon for secure URLs and mdi-lock-off red icon for insecure http URLs`, async () => {
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

			const lockIcon = wrapper.find(`[data-qa="omni-hub-lock"]`);
			expect(lockIcon.exists()).toBe(true);

			// 1. Initial/Fallback: should be secure
			expect(lockIcon.attributes(`icon`)).toBe(`mdi-lock`);
			expect(lockIcon.attributes(`color`)).toBeUndefined();

			// 2. Load secure HTTPS URL
			if (navCallback) {
				(navCallback as any)({ canGoBack: false, canGoForward: false, currentUrl: `https://secure-site.com` }); // eslint-disable-line @typescript-eslint/no-explicit-any
			}
			await wrapper.vm.$nextTick();
			expect(lockIcon.attributes(`icon`)).toBe(`mdi-lock`);
			expect(lockIcon.attributes(`color`)).toBeUndefined();

			// 3. Load secure EYAS URL
			if (navCallback) {
				(navCallback as any)({ canGoBack: false, canGoForward: false, currentUrl: `eyas://local.test` }); // eslint-disable-line @typescript-eslint/no-explicit-any
			}
			await wrapper.vm.$nextTick();
			expect(lockIcon.attributes(`icon`)).toBe(`mdi-lock`);
			expect(lockIcon.attributes(`color`)).toBeUndefined();

			// 4. Load insecure HTTP URL
			if (navCallback) {
				(navCallback as any)({ canGoBack: false, canGoForward: false, currentUrl: `http://insecure-site.com` }); // eslint-disable-line @typescript-eslint/no-explicit-any
			}
			await wrapper.vm.$nextTick();
			expect(lockIcon.attributes(`icon`)).toBe(`mdi-lock-off`);
			expect(lockIcon.attributes(`color`)).toBe(`error`);
		});
	});

	describe(`environments dropdown`, () => {
		let navCallback: ((payload: NavigationStatePayload) => void) | null = null;

		beforeEach(() => {
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
