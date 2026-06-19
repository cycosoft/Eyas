import { describe, test, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import AppHeader from '@/components/AppHeader.vue';
import { state } from '@/components/AppHeader.logic.js';
import type { WindowWithEyas, ChannelName } from '@registry/ipc.js';
import type { AppHeaderVM } from '@registry/components.js';
import { ref } from 'vue';

const mockIsDark = ref(false);
vi.mock(`vuetify`, async importOriginal => {
	const original = await importOriginal() as Record<string, unknown>;
	return {
		...original,
		useTheme: (): Record<string, unknown> => ({
			global: { current: { value: { get dark(): boolean { return mockIsDark.value; } } } }
		})
	};
});

describe(`AppHeader Zoom Controls`, () => {
	let wrapper: VueWrapper;
	let mockSend: Mock;

	beforeEach(() => {
		setActivePinia(createPinia());
		mockSend = vi.fn();

		Object.assign(state, {
			menu: true,
			zoomFactor: 1.0,
			menuItems: [
				{
					title: `Viewport`,
					value: `viewport`,
					icon: `mdi-aspect-ratio`,
					submenu: [
						{ title: `Zoom`, value: `zoom`, icon: `mdi-magnify`, actionable: false }
					]
				}
			]
		});

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
					VListItem: { template: `<div class="v-list-item" v-bind="$attrs"><slot /></div>` },
					VBtn: { template: `<button v-bind="$attrs" @click="$emit('click', $event)"><slot /></button>` },
					VIcon: true,
					VImg: true,
					VSystemBar: { template: `<div class="v-system-bar"><slot /></div>` }
				}
			}
		});
	});

	afterEach(() => {
		if (wrapper) { wrapper.unmount(); }
		vi.clearAllMocks();
	});

	test(`renders zoom control item when it is in menuItems`, () => {
		const item = wrapper.find(`[data-qa="btn-nav-item-zoom"]`);
		expect(item.exists()).toBe(true);
		expect(item.find(`.zoom-val`).text()).toBe(`100%`);
	});

	test(`sends adjust-zoom in IPC event when zoom-in button is clicked`, async () => {
		const zoomInBtn = wrapper.find(`[data-qa="btn-zoom-in"]`);
		expect(zoomInBtn.exists()).toBe(true);
		await zoomInBtn.trigger(`click`);
		expect(mockSend).toHaveBeenCalledWith(`adjust-zoom`, `in`);
	});

	test(`sends adjust-zoom out IPC event when zoom-out button is clicked`, async () => {
		const zoomOutBtn = wrapper.find(`[data-qa="btn-zoom-out"]`);
		expect(zoomOutBtn.exists()).toBe(true);
		await zoomOutBtn.trigger(`click`);
		expect(mockSend).toHaveBeenCalledWith(`adjust-zoom`, `out`);
	});

	test(`displays updated zoom factor when state.zoomFactor changes`, async () => {
		state.zoomFactor = 1.25;
		await wrapper.vm.$nextTick();
		const valText = wrapper.find(`.zoom-val`);
		expect(valText.text()).toBe(`125%`);
	});

	test(`sends adjust-zoom reset IPC event when zoom-reset percentage label is clicked`, async () => {
		const resetBtn = wrapper.find(`[data-qa="btn-zoom-reset"]`);
		expect(resetBtn.exists()).toBe(true);
		await resetBtn.trigger(`click`);
		expect(mockSend).toHaveBeenCalledWith(`adjust-zoom`, `reset`);
	});
});
