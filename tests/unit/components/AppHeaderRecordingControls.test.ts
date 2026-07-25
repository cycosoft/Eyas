import { describe, test, expect, vi, beforeEach, type Mock } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia, type Pinia } from 'pinia';
import AppHeaderRecordingControls from '@/components/AppHeaderRecordingControls.vue';
import useRecordingStore from '@/stores/recording.js';
import type { WindowWithEyas } from '@registry/ipc.js';

describe(`AppHeaderRecordingControls`, () => {
	let wrapper: VueWrapper;
	let mockSend: Mock;
	let pinia: Pinia;

	beforeEach(() => {
		pinia = createPinia();
		setActivePinia(pinia);
		mockSend = vi.fn();
		(window as unknown as WindowWithEyas).eyas = {
			send: mockSend,
			receive: vi.fn()
		};
	});

	function mountWithStatus(status: `recording` | `stopped` | null, playbackStatus: `playing` | `stopped` | `failed` | null = null): VueWrapper {
		const store = useRecordingStore();
		store.status = status;
		store.playbackStatus = playbackStatus;
		return mount(AppHeaderRecordingControls, {
			global: {
				plugins: [pinia],
				stubs: {
					VBtn: { template: `<button v-bind="$attrs" @click="$emit('click', $event)"><slot /></button>` },
					VIcon: true,
					VTooltip: true
				}
			}
		});
	}

	test(`shows the stop-playback button instead of the replay button while playback is playing`, () => {
		wrapper = mountWithStatus(`stopped`, `playing`);

		expect(wrapper.find(`[data-qa="btn-recording-playback-stop"]`).exists()).toBe(true);
		expect(wrapper.find(`[data-qa="btn-recording-replay"]`).exists()).toBe(false);
	});

	test(`shows the replay button (not the stop-playback button) once stopped and not playing`, () => {
		wrapper = mountWithStatus(`stopped`, null);

		expect(wrapper.find(`[data-qa="btn-recording-replay"]`).exists()).toBe(true);
		expect(wrapper.find(`[data-qa="btn-recording-playback-stop"]`).exists()).toBe(false);
	});

	test(`clicking the stop-playback button sends recorder-replay-stop over IPC`, async () => {
		wrapper = mountWithStatus(`stopped`, `playing`);

		await wrapper.find(`[data-qa="btn-recording-playback-stop"]`).trigger(`click`);

		expect(mockSend).toHaveBeenCalledWith(`recorder-replay-stop`);
	});

	test(`the replay button never renders while playback is playing, even though isStopped is also true`, () => {
		wrapper = mountWithStatus(`stopped`, `playing`);

		expect(wrapper.find(`[data-qa="btn-recording-replay"]`).exists()).toBe(false);
	});

	test(`shows both the record-again and replay buttons once stopped and not playing`, () => {
		wrapper = mountWithStatus(`stopped`, null);

		expect(wrapper.find(`[data-qa="btn-recording-record-again"]`).exists()).toBe(true);
		expect(wrapper.find(`[data-qa="btn-recording-replay"]`).exists()).toBe(true);
	});

	test(`clicking record-again sends recorder-record-start over IPC`, async () => {
		wrapper = mountWithStatus(`stopped`, null);

		await wrapper.find(`[data-qa="btn-recording-record-again"]`).trigger(`click`);

		expect(mockSend).toHaveBeenCalledWith(`recorder-record-start`);
	});

	test(`the record-again button is hidden while recording or playing`, () => {
		wrapper = mountWithStatus(`recording`, null);
		expect(wrapper.find(`[data-qa="btn-recording-record-again"]`).exists()).toBe(false);

		wrapper = mountWithStatus(`stopped`, `playing`);
		expect(wrapper.find(`[data-qa="btn-recording-record-again"]`).exists()).toBe(false);
	});
});
