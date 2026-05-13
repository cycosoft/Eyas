import { describe, test, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import AppHeader from '@/components/AppHeader.vue';
import useModalsStore from '@/stores/modals.js';
import { state } from '@/components/AppHeader.logic.js';
import type { WindowWithEyas, ChannelName, NavigationStatePayload } from '@registry/ipc.js';
import type { AppHeaderVM } from '@registry/components.js';
import type { GenericRecord, IsActive } from '@registry/primitives.js';
import { ref } from 'vue';

const mockIsDark = ref(false);
vi.mock(`vuetify`, async importOriginal => {
	const original = await importOriginal() as GenericRecord;
	return {
		...original,
		useTheme: (): GenericRecord => ({
			global: { current: { value: { get dark(): IsActive { return mockIsDark.value; } } } }
		})
	};
});

describe(`AppHeader System Bar`, () => {
	let wrapper: VueWrapper;
	let mockSend: Mock;

	beforeEach(() => {
		vi.useFakeTimers();
		setActivePinia(createPinia());
		mockSend = vi.fn();

		// Reset module-level reactive state to prevent leaks
		Object.assign(state, { isHeaderHovered: false, menu: false, envMenu: false, tooltipVisible: false, tooltipText: `Click to Copy` });
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
					VSystemBar: { template: `<div class="v-system-bar" v-bind="$attrs"><slot /></div>` }
				}
			}
		});
	});

	afterEach(() => {
		if (wrapper) wrapper.unmount();
		vi.clearAllMocks();
		vi.useRealTimers();
	});

	describe(`v-system-bar`, () => {
		test(`renders system bar with the correct title`, async () => {
			const systemBar = wrapper.find(`.v-system-bar`);
			expect(systemBar.exists()).toBe(true);

			const titleSpan = systemBar.find(`span`);
			expect(titleSpan.text()).toBe(``);

			// update navigation state and check if it updates the title
			let navCallback: ((payload: NavigationStatePayload) => void) | null = null;
			(window as unknown as WindowWithEyas).eyas.receive = vi.fn((channel: ChannelName, cb: (...args: unknown[]) => void) => {
				if (channel === `navigation-state-updated`) {
					navCallback = cb as (payload: NavigationStatePayload) => void;
				}
			});

			// Re-mount wrapper to hook the new receive mock
			wrapper = mount(AppHeader, {
				global: {
					stubs: {
						VAppBar: { template: `<div><slot /></div>` }, VMenu: { template: `<div><slot /></div>` }, VList: { template: `<div><slot /></div>` },
						VListItem: { template: `<div @click="$emit('click')"><slot /></div>` },
						VBtn: { template: `<button :disabled="$attrs.disabled" @click="$emit('click', $event)" @mouseenter="$emit('mouseenter', $event)"><slot /></button>` },
						VIcon: true, VImg: true,
						VSystemBar: { template: `<div class="v-system-bar" v-bind="$attrs"><slot /></div>` }
					}
				}
			});

			if (navCallback) {
				((navCallback as unknown) as (payload: NavigationStatePayload) => void)({
					canGoBack: true,
					canGoForward: true,
					configTitle: `Eyas`,
					appVersion: `1.0.0`,
					pageTitle: `Google`
				});
			}
			await wrapper.vm.$nextTick();

			const newVm = wrapper.vm as unknown as AppHeaderVM;
			expect(newVm.displayAppTitle).toBe(`EYAS :: 1.0.0 • GOOGLE`);
		});

		test(`renders system bar with the correct title when there is no app version`, async () => {
			let navCallback: ((payload: NavigationStatePayload) => void) | null = null;
			(window as unknown as WindowWithEyas).eyas.receive = vi.fn((channel: ChannelName, cb: (...args: unknown[]) => void) => {
				if (channel === `navigation-state-updated`) {
					navCallback = cb as (payload: NavigationStatePayload) => void;
				}
			});

			wrapper = mount(AppHeader, {
				global: {
					stubs: {
						VAppBar: { template: `<div><slot /></div>` }, VMenu: { template: `<div><slot /></div>` }, VList: { template: `<div><slot /></div>` },
						VListItem: { template: `<div @click="$emit('click')"><slot /></div>` },
						VBtn: { template: `<button :disabled="$attrs.disabled" @click="$emit('click', $event)" @mouseenter="$emit('mouseenter', $event)"><slot /></button>` },
						VIcon: true, VImg: true,
						VSystemBar: { template: `<div class="v-system-bar" v-bind="$attrs"><slot /></div>` }
					}
				}
			});

			if (navCallback) {
				((navCallback as unknown) as (payload: NavigationStatePayload) => void)({
					canGoBack: true,
					canGoForward: true,
					configTitle: `Eyas`,
					appVersion: ``,
					pageTitle: `Google`
				});
			}
			await wrapper.vm.$nextTick();

			const newVm = wrapper.vm as unknown as AppHeaderVM;
			expect(newVm.displayAppTitle).toBe(`EYAS • GOOGLE`);
		});

		test(`applies dragging and reactive classes to system bar`, async () => {
			const modalsStore = useModalsStore();
			const systemBar = wrapper.find(`.v-system-bar`);
			const titleSpan = systemBar.find(`span`);
			expect(titleSpan.classes()).toContain(`system-bar-title`);
			expect(titleSpan.classes()).toContain(`text-disabled`);
			expect(systemBar.classes()).toContain(`window-system-bar`);

			modalsStore.track(`test-modal`);
			await wrapper.vm.$nextTick();
			expect(titleSpan.classes()).toContain(`scrim-active-text`);
			expect(titleSpan.classes()).not.toContain(`text-disabled`);

			modalsStore.untrack(`test-modal`);
			await wrapper.vm.$nextTick();
			expect(titleSpan.classes()).toContain(`text-disabled`);
		});
	});

	describe(`window controls overlay dynamic color matching`, () => {
		test(`updates overlay colors on modal and theme transitions`, async () => {
			const modalsStore = useModalsStore();
			mockSend.mockClear();
			modalsStore.track(`test-modal`);
			await wrapper.vm.$nextTick();
			expect(mockSend).toHaveBeenCalledWith(`update-titlebar-overlay`, { color: `#949597`, symbolColor: `#ffffff` });
			mockSend.mockClear();
			modalsStore.untrack(`test-modal`);
			await wrapper.vm.$nextTick();
			expect(mockSend).toHaveBeenCalledWith(`update-titlebar-overlay`, { color: `#f7f9fb`, symbolColor: `#191c1e` });
			mockSend.mockClear();
			mockIsDark.value = true;
			await wrapper.vm.$nextTick();
			expect(mockSend).toHaveBeenCalledWith(`update-titlebar-overlay`, { color: `#212121`, symbolColor: `#ffffff` });
			mockSend.mockClear();
			modalsStore.track(`test-modal`);
			await wrapper.vm.$nextTick();
			expect(mockSend).toHaveBeenCalledWith(`update-titlebar-overlay`, { color: `#141414`, symbolColor: `#ffffff` });
			modalsStore.untrack(`test-modal`);
			mockIsDark.value = false;
			await wrapper.vm.$nextTick();
		});
	});
});
