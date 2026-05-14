import { describe, test, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import AppHeader from '@/components/AppHeader.vue';
import { state } from '@/components/AppHeader.logic.js';
import type { WindowWithEyas, ChannelName, NavigationStatePayload } from '@registry/ipc.js';

describe(`AppHeader Environments Dropdown`, () => {
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
		state.currentUrl = ``;
		state.currentEnvironment = null;
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
					VIcon: true, VImg: true,
					VSystemBar: { template: `<div class="v-system-bar"><slot /></div>` }
				}
			}
		});
	});

	afterEach(() => {
		if (wrapper) { wrapper.unmount(); }
		vi.clearAllMocks();
		vi.useRealTimers();
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
						VImg: true,
						VSystemBar: { template: `<div class="v-system-bar"><slot /></div>` }
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

		test(`does not render the environment dropdown button when navigated away to an external website`, async () => {
			if (navCallback) {
				(navCallback as any)({ // eslint-disable-line @typescript-eslint/no-explicit-any
					canGoBack: false,
					canGoForward: false,
					environments: [
						{ url: `dev.eyas.cycosoft.com`, title: `Development` },
						{ url: `staging.eyas.cycosoft.com`, title: `Staging` }
					],
					currentEnvironment: `staging.eyas.cycosoft.com`,
					currentUrl: `https://google.com`
				});
			}
			await wrapper.vm.$nextTick();
			const dropdownBtn = wrapper.find(`[data-qa="omni-hub-env-dropdown"]`);
			expect(dropdownBtn.exists()).toBe(false);
		});

		test(`renders the environment dropdown button when viewing active test content`, async () => {
			if (navCallback) {
				(navCallback as any)({ // eslint-disable-line @typescript-eslint/no-explicit-any
					canGoBack: false,
					canGoForward: false,
					environments: [
						{ url: `dev.eyas.cycosoft.com`, title: `Development` },
						{ url: `staging.eyas.cycosoft.com`, title: `Staging` }
					],
					currentEnvironment: `staging.eyas.cycosoft.com`,
					currentUrl: `https://staging.eyas.cycosoft.com/login`
				});
			}
			await wrapper.vm.$nextTick();
			const dropdownBtn = wrapper.find(`[data-qa="omni-hub-env-dropdown"]`);
			expect(dropdownBtn.exists()).toBe(true);
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
