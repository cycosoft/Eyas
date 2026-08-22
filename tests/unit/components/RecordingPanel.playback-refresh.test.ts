import { describe, test, expect, afterEach, type Mock } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import RecordingPanel from '@/components/RecordingPanel.vue';
import useRecordingStore from '@/stores/recording.js';

describe(`RecordingPanel recordings-list refresh on watched playback status changes`, () => {
	let activeWrapper: VueWrapper | undefined;

	afterEach(() => {
		activeWrapper?.unmount();
		activeWrapper = undefined;
	});

	function mountPanel(): VueWrapper {
		const pinia = createPinia();
		setActivePinia(pinia);
		activeWrapper = mount(RecordingPanel, { global: { plugins: [pinia] } });
		return activeWrapper;
	}

	test(`refetches the recordings list when a watched playback finishes while the panel is open`, async () => {
		mountPanel();
		const store = useRecordingStore();
		store.isPanelOpen = true;
		store.sessionId = `s1`;
		await activeWrapper?.vm.$nextTick();

		const sendSpy = window.eyas?.send as Mock;
		const callsBefore = sendSpy.mock.calls.length;

		store.playbackStatus = `playing`;
		await activeWrapper?.vm.$nextTick();
		store.playbackStatus = `stopped`;
		await activeWrapper?.vm.$nextTick();

		const listCalls = sendSpy.mock.calls.slice(callsBefore).filter(call => call[0] === `recorder-list-sessions`);
		expect(listCalls.length).toBe(1);
	});

	test(`refetches the recordings list when a watched playback is interrupted by another one starting, even if both status updates land before the next tick`, async () => {
		mountPanel();
		const store = useRecordingStore();
		store.isPanelOpen = true;
		store.sessionId = `s1`;
		await activeWrapper?.vm.$nextTick();

		const sendSpy = window.eyas?.send as Mock;
		const callsBefore = sendSpy.mock.calls.length;

		store.playbackStatus = `playing`;
		await activeWrapper?.vm.$nextTick();
		// the interrupted session's `stopped` and the newly-started session's `playing` can both
		// arrive before Vue's next flush — this must still trigger a refetch of the interrupted
		// row's now-stale dot, not just settle on the final `playing` value and no-op
		store.playbackStatus = `stopped`;
		store.sessionId = `s2`;
		store.playbackStatus = `playing`;
		await activeWrapper?.vm.$nextTick();

		const listCalls = sendSpy.mock.calls.slice(callsBefore).filter(call => call[0] === `recorder-list-sessions`);
		expect(listCalls.length).toBe(1);
	});

	test(`does not refetch the recordings list when playback finishes while the panel is closed`, async () => {
		mountPanel();
		const store = useRecordingStore();
		store.sessionId = `s1`;
		await activeWrapper?.vm.$nextTick();

		const sendSpy = window.eyas?.send as Mock;
		const callsBefore = sendSpy.mock.calls.length;

		store.playbackStatus = `playing`;
		await activeWrapper?.vm.$nextTick();
		store.playbackStatus = `stopped`;
		await activeWrapper?.vm.$nextTick();

		const listCalls = sendSpy.mock.calls.slice(callsBefore).filter(call => call[0] === `recorder-list-sessions`);
		expect(listCalls.length).toBe(0);
	});
});
