import { describe, test, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import AppHeader from '@/components/AppHeader.vue';
import { state } from '@/components/AppHeader.logic.js';
import type { WindowWithEyas, ChannelName, NavigationStatePayload } from '@registry/ipc.js';
import type { AppHeaderVM, NavGroup, NavItem } from '@registry/components.js';

type StubName = string;
type StubDefinition = unknown;

function mountAppHeader(stubsOverride: Record<StubName, StubDefinition> = {}): VueWrapper {
	return mount(AppHeader, {
		global: {
			stubs: {
				VAppBar: { template: `<div><slot /></div>` }, VMenu: { template: `<div><slot /></div>` }, VList: { template: `<div><slot /></div>` },
				VListItem: { template: `<div @click="$emit('click')"><slot /></div>` },
				VBtn: { template: `<button :disabled="$attrs.disabled" @click="$emit('click', $event)" @mouseenter="$emit('mouseenter', $event)"><slot /></button>` },
				VIcon: true, VImg: true,
				VSystemBar: { template: `<div class="v-system-bar"><slot /></div>` },
				...stubsOverride
			}
		}
	});
}

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

		wrapper = mountAppHeader();
	});

	afterEach(() => {
		if (wrapper) { wrapper.unmount(); }
		vi.clearAllMocks();
		vi.useRealTimers();
	});

	describe(`developer tools`, () => {
		test(`onItemClick() sends open-devtools-ui IPC for 'devtools-ui' item`, () => {
			(wrapper.vm as unknown as AppHeaderVM).onItemClick({ title: `Developer Tools (Eyas)`, value: `devtools-ui` });
			expect(mockSend).toHaveBeenCalledWith(`open-devtools-ui`);
		});

		test(`onItemClick() sends open-devtools-test IPC for 'devtools-test' item`, () => {
			(wrapper.vm as unknown as AppHeaderVM).onItemClick({ title: `Developer Tools (Test)`, value: `devtools-test` });
			expect(mockSend).toHaveBeenCalledWith(`open-devtools-test`);
		});

		test(`'Developer Tools (Eyas)' is hidden and 'Developer Tools' is without suffix when isDev is false`, async () => {
			let navCallback: ((payload: NavigationStatePayload) => void) | null = null;
			(window as unknown as WindowWithEyas).eyas.receive = vi.fn((channel: ChannelName, cb: (...args: unknown[]) => void) => {
				if (channel === `navigation-state-updated`) {
					navCallback = cb as (payload: NavigationStatePayload) => void;
				}
			});

			wrapper = mountAppHeader();

			if (navCallback) {
				(navCallback as any)({ isDev: false }); // eslint-disable-line @typescript-eslint/no-explicit-any
			}
			await wrapper.vm.$nextTick();

			const vm = wrapper.vm as unknown as AppHeaderVM;
			const toolsMenu = vm.groups.find((g: NavGroup) => g.name === `Tools`);
			const eyasDevTools = toolsMenu?.submenu?.find((i: NavItem) => i.value === `devtools-ui`);
			expect(eyasDevTools).toBeUndefined();

			const testDevTools = toolsMenu?.submenu?.find((i: NavItem) => i.value === `devtools-test`);
			expect(testDevTools).toBeDefined();
			expect(testDevTools?.title).toBe(`Developer Tools`);
		});

		test(`'Developer Tools (Eyas)' is shown and 'Developer Tools (Test)' has suffix when isDev is true`, async () => {
			let navCallback: ((payload: NavigationStatePayload) => void) | null = null;
			(window as unknown as WindowWithEyas).eyas.receive = vi.fn((channel: ChannelName, cb: (...args: unknown[]) => void) => {
				if (channel === `navigation-state-updated`) {
					navCallback = cb as (payload: NavigationStatePayload) => void;
				}
			});

			wrapper = mountAppHeader();

			if (navCallback) {
				(navCallback as any)({ isDev: true }); // eslint-disable-line @typescript-eslint/no-explicit-any
			}
			await wrapper.vm.$nextTick();

			const vm = wrapper.vm as unknown as AppHeaderVM;
			const toolsMenu = vm.groups.find((g: NavGroup) => g.name === `Tools`);
			const eyasDevTools = toolsMenu?.submenu?.find((i: NavItem) => i.value === `devtools-ui`);
			expect(eyasDevTools).toBeDefined();
			expect(eyasDevTools?.title).toBe(`Developer Tools (Eyas)`);

			const testDevTools = toolsMenu?.submenu?.find((i: NavItem) => i.value === `devtools-test`);
			expect(testDevTools).toBeDefined();
			expect(testDevTools?.title).toBe(`Developer Tools (Test)`);
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

			wrapper = mountAppHeader();

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
			const payload = { url: `https://google.com`, openInBrowser: true };
			(wrapper.vm as unknown as AppHeaderVM).onItemClick({ title: `Google`, value: `launch-link:${JSON.stringify(payload)}` });
			expect(mockSend).toHaveBeenCalledWith(`launch-link`, payload);
		});

		test(`onItemClick() sends launch-link-variable IPC for variable link items`, () => {
			const url = `https://example.com/{myvar}`;
			(wrapper.vm as unknown as AppHeaderVM).onItemClick({ title: `Variable`, value: `launch-link-var:${url}` });
			expect(mockSend).toHaveBeenCalledWith(`launch-link-variable`, url);
		});
	});

	describe(`omni-hub central display`, () => {
		test(`renders the central container and all placeholder elements with default fallback text`, () => {
			const container = wrapper.find(`[data-qa="omni-hub-container"]`);
			expect(container.exists()).toBe(true);
			expect(container.find(`[data-qa="omni-hub-lock"]`).exists()).toBe(true);
			expect(container.find(`[data-qa="omni-hub-status"]`).text()).toContain(`Online`);
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

			wrapper = mountAppHeader({
				VTooltip: { template: `<div class="v-tooltip" :data-target="$attrs.target" :data-model-value="$attrs.modelValue"><slot /></div>` }
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

			wrapper = mountAppHeader();

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

		test(`toggles network-status IPC on chip click and reacts to state updates`, async () => {
			let navCallback: ((payload: NavigationStatePayload) => void) | null = null;
			(window as unknown as WindowWithEyas).eyas.receive = vi.fn((channel: ChannelName, cb: (...args: unknown[]) => void) => {
				if (channel === `navigation-state-updated`) {
					navCallback = cb as (payload: NavigationStatePayload) => void;
				}
			});

			wrapper = mountAppHeader({
				VChip: { template: `<div class="v-chip" :color="$attrs.color" @click="$emit('click', $event)"><slot /></div>` }
			});

			const statusChip = wrapper.find(`[data-qa="omni-hub-status"]`);
			expect(statusChip.exists()).toBe(true);

			// 1. Initial/Default state should be Online (green)
			expect(statusChip.text()).toContain(`Online`);
			expect(statusChip.attributes(`color`)).toBe(`success`);

			// 2. Click chip to toggle to offline
			await statusChip.trigger(`click`);
			expect(mockSend).toHaveBeenCalledWith(`network-status`, false);

			// 3. Receive offline update
			if (navCallback) {
				(navCallback as any)({ canGoBack: false, canGoForward: false, testNetworkEnabled: false }); // eslint-disable-line @typescript-eslint/no-explicit-any
			}
			await wrapper.vm.$nextTick();
			expect(statusChip.text()).toContain(`Offline`);
			expect(statusChip.attributes(`color`)).toBe(`error`);

			// 4. Click chip to toggle back to online
			mockSend.mockClear();
			await statusChip.trigger(`click`);
			expect(mockSend).toHaveBeenCalledWith(`network-status`, true);

			// 5. Receive online update
			if (navCallback) {
				(navCallback as any)({ canGoBack: false, canGoForward: false, testNetworkEnabled: true }); // eslint-disable-line @typescript-eslint/no-explicit-any
			}
			await wrapper.vm.$nextTick();
			expect(statusChip.text()).toContain(`Online`);
			expect(statusChip.attributes(`color`)).toBe(`success`);
		});

		test(`displays warning and error counts in header when they are greater than 0`, async () => {
			const navCallbackContainer = {
				current: null as ((payload: NavigationStatePayload) => void) | null
			};
			(window as unknown as WindowWithEyas).eyas.receive = vi.fn((channel: ChannelName, cb: (...args: unknown[]) => void) => {
				if (channel === `navigation-state-updated`) {
					navCallbackContainer.current = cb as (payload: NavigationStatePayload) => void;
				}
			});

			wrapper = mountAppHeader({
				VIcon: { template: `<div class="v-icon" :data-icon="$attrs.icon"><slot /></div>` },
				VChip: { template: `<div class="v-chip" :color="$attrs.color" @click="$emit('click', $event)"><slot /></div>` },
				VTooltip: { template: `<div class="v-tooltip"><slot /></div>` }
			});

			// Initially, counts are 0/undefined and indicators should not exist
			expect(wrapper.find(`[data-qa="omni-hub-errors"]`).exists()).toBe(false);
			expect(wrapper.find(`[data-qa="omni-hub-warnings"]`).exists()).toBe(false);

			// Receive update with errors and warnings
			navCallbackContainer.current?.({
				canGoBack: false,
				canGoForward: false,
				jsErrorsCount: 3,
				jsWarningsCount: 12
			});
			await wrapper.vm.$nextTick();

			// Indicators should exist and display correct values
			expect(wrapper.find(`[data-qa="omni-hub-errors"]`).exists()).toBe(true);
			expect(wrapper.find(`[data-qa="omni-hub-errors"]`).text()).toContain(`3`);
			expect(wrapper.find(`[data-qa="omni-hub-errors"]`).find(`[data-icon="mdi-alert-circle"]`).exists()).toBe(true);

			expect(wrapper.find(`[data-qa="omni-hub-warnings"]`).exists()).toBe(true);
			expect(wrapper.find(`[data-qa="omni-hub-warnings"]`).text()).toContain(`12`);
			expect(wrapper.find(`[data-qa="omni-hub-warnings"]`).find(`[data-icon="mdi-alert"]`).exists()).toBe(true);

			const indicators = wrapper.find(`.omni-hub-indicators`);
			expect(indicators.exists()).toBe(true);
			const tooltip = indicators.find(`.v-tooltip`);
			expect(tooltip.exists()).toBe(true);
			expect(tooltip.text()).toContain(`View in DevTools`);
		});

		test(`sends open-devtools-console IPC when indicators are clicked`, async () => {
			let navCallback: ((payload: NavigationStatePayload) => void) | null = null;
			(window as unknown as WindowWithEyas).eyas.receive = vi.fn((channel: ChannelName, cb: (...args: unknown[]) => void) => {
				if (channel === `navigation-state-updated`) {
					navCallback = cb as (payload: NavigationStatePayload) => void;
				}
			});

			wrapper = mountAppHeader({
				VTooltip: { template: `<div class="v-tooltip"><slot /></div>` }
			});

			// Setup errors to make indicators visible
			navCallback?.({
				canGoBack: false,
				canGoForward: false,
				jsErrorsCount: 1
			});
			await wrapper.vm.$nextTick();

			const indicators = wrapper.find(`.omni-hub-indicators`);
			expect(indicators.exists()).toBe(true);

			await indicators.trigger(`click`);
			expect(mockSend).toHaveBeenCalledWith(`open-devtools-console`);
		});

		test(`displays zoom level badge in header when zoomFactor is not 1.0`, async () => {
			let navCallback: ((payload: NavigationStatePayload) => void) | null = null;
			(window as unknown as WindowWithEyas).eyas.receive = vi.fn((channel: ChannelName, cb: (...args: unknown[]) => void) => {
				if (channel === `navigation-state-updated`) {
					navCallback = cb as (payload: NavigationStatePayload) => void;
				}
			});

			wrapper = mountAppHeader({
				VIcon: { template: `<div class="v-icon" :data-icon="$attrs.icon"><slot /></div>` }
			});

			// Initially zoom is 1.0/default, badge should not exist
			expect(wrapper.find(`[data-qa="omni-hub-zoom"]`).exists()).toBe(false);

			// Receive update with zoomFactor 1.25 (125%)
			navCallback?.({
				canGoBack: false,
				canGoForward: false,
				zoomFactor: 1.25
			});
			await wrapper.vm.$nextTick();

			const zoomBadge = wrapper.find(`[data-qa="omni-hub-zoom"]`);
			expect(zoomBadge.exists()).toBe(true);
			expect(zoomBadge.text()).toContain(`125%`);
			expect(zoomBadge.find(`[data-icon="mdi-magnify-plus-outline"]`).exists()).toBe(true);

			// Receive update with zoomFactor 0.75 (75%)
			navCallback?.({
				canGoBack: false,
				canGoForward: false,
				zoomFactor: 0.75
			});
			await wrapper.vm.$nextTick();

			const zoomBadgeMinus = wrapper.find(`[data-qa="omni-hub-zoom"]`);
			expect(zoomBadgeMinus.exists()).toBe(true);
			expect(zoomBadgeMinus.text()).toContain(`75%`);
			expect(zoomBadgeMinus.find(`[data-icon="mdi-magnify-minus-outline"]`).exists()).toBe(true);

			// Receive update with zoomFactor 1.0 again (100%), badge should disappear
			navCallback?.({
				canGoBack: false,
				canGoForward: false,
				zoomFactor: 1.0
			});
			await wrapper.vm.$nextTick();
			expect(wrapper.find(`[data-qa="omni-hub-zoom"]`).exists()).toBe(false);
		});

		test(`sends adjust-zoom reset IPC event when zoom level badge is clicked`, async () => {
			let navCallback: ((payload: NavigationStatePayload) => void) | null = null;
			(window as unknown as WindowWithEyas).eyas.receive = vi.fn((channel: ChannelName, cb: (...args: unknown[]) => void) => {
				if (channel === `navigation-state-updated`) {
					navCallback = cb as (payload: NavigationStatePayload) => void;
				}
			});

			wrapper = mountAppHeader({
				VTooltip: { template: `<div class="v-tooltip"><slot /></div>` }
			});

			if (navCallback) {
				(navCallback as (payload: Partial<NavigationStatePayload>) => void)({
					canGoBack: false,
					canGoForward: false,
					zoomFactor: 1.25
				});
			}
			await wrapper.vm.$nextTick();

			const zoomBadge = wrapper.find(`[data-qa="omni-hub-zoom"]`);
			expect(zoomBadge.exists()).toBe(true);

			await zoomBadge.trigger(`click`);
			expect(mockSend).toHaveBeenCalledWith(`adjust-zoom`, `reset`);
		});
	});
});
