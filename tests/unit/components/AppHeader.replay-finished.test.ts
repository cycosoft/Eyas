import { describe, test, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import AppHeader from '@/components/AppHeader.vue';
import useModalsStore from '@/stores/modals.js';
import { state } from '@/components/AppHeader.logic.js';
import type { WindowWithEyas, ChannelName } from '@registry/ipc.js';

const stubs = {
	VAppBar: { template: `<div><slot /></div>` }, VMenu: { template: `<div><slot /></div>` }, VList: { template: `<div><slot /></div>` },
	VListItem: { template: `<div @click="$emit('click')"><slot /></div>` },
	VBtn: { template: `<button :disabled="$attrs.disabled" @click="$emit('click', $event)" @mouseenter="$emit('mouseenter', $event)"><slot /></button>` },
	VIcon: true, VImg: true,
	VSystemBar: { template: `<div class="v-system-bar" v-bind="$attrs"><slot /></div>` }
};

describe(`AppHeader recorder-replay-finished IPC handler`, () => {
	let wrapper: VueWrapper;
	let mockSend: Mock;
	let replayFinishedCallback: ((...args: unknown[]) => void) | null;

	beforeEach(() => {
		vi.useFakeTimers(); setActivePinia(createPinia());
		mockSend = vi.fn(); replayFinishedCallback = null;
		Object.assign(state, { isHeaderHovered: false, menu: false, envMenu: false, activeGroup: null });

		(window as unknown as WindowWithEyas).eyas = {
			send: mockSend,
			receive: vi.fn((channel: ChannelName, cb: (...args: unknown[]) => void) => {
				if (channel === `recorder-replay-finished`) { replayFinishedCallback = cb; }
			})
		};

		wrapper = mount(AppHeader, { global: { stubs } });
	});

	afterEach(() => {
		if (wrapper) wrapper.unmount();
		vi.clearAllMocks();
	});

	test(`collapses the eyas layer once a replay finishes if no panel or modal is open`, () => {
		useModalsStore().$reset();

		replayFinishedCallback?.();
		vi.advanceTimersByTime(310);

		expect(mockSend).toHaveBeenCalledWith(`hide-ui`);
	});

	test(`leaves the eyas layer expanded if the session panel is still open when a replay finishes, since the panel is tracked as a visible modal`, () => {
		useModalsStore().track(`recording-panel`);

		replayFinishedCallback?.();
		vi.advanceTimersByTime(310);

		expect(mockSend).not.toHaveBeenCalledWith(`hide-ui`);
	});
});
