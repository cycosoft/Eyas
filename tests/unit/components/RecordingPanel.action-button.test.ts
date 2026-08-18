import { describe, test, expect, afterEach, type Mock } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import RecordingPanel from '@/components/RecordingPanel.vue';
import useRecordingStore from '@/stores/recording.js';

describe(`RecordingPanel row trailing action button`, () => {
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

	function actionButton(sessionId = `s1`): HTMLButtonElement | null {
		return document.querySelector<HTMLButtonElement>(`[data-qa="recording-row-action-${sessionId}"]`);
	}

	test(`shows both the chevron and the hover-only action button in the trailing area, so the chevron stays the resting-state affordance`, async () => {
		mountPanel();
		const store = useRecordingStore();
		store.isPanelOpen = true;
		store.savedSessions = [{ sessionId: `s1`, title: `2024-01-01T00:00:00.000Z`, startedAt: 1, stoppedAt: 2, stepCount: 1, lastRunOutcome: null }];
		await activeWrapper?.vm.$nextTick();

		expect(document.querySelector(`[data-qa="recording-row-s1"] .recording-card__chevron`)).not.toBeNull();
		expect(actionButton()).not.toBeNull();
	});

	test(`shows a play icon for a session with no prior run`, async () => {
		mountPanel();
		const store = useRecordingStore();
		store.isPanelOpen = true;
		store.savedSessions = [{ sessionId: `s1`, title: `2024-01-01T00:00:00.000Z`, startedAt: 1, stoppedAt: 2, stepCount: 1, lastRunOutcome: null }];
		await activeWrapper?.vm.$nextTick();

		expect(actionButton()?.querySelector(`.mdi-play`)).not.toBeNull();
	});

	test(`shows a play icon for a passed session`, async () => {
		mountPanel();
		const store = useRecordingStore();
		store.isPanelOpen = true;
		store.savedSessions = [{ sessionId: `s1`, title: `2024-01-01T00:00:00.000Z`, startedAt: 1, stoppedAt: 2, stepCount: 1, lastRunOutcome: `passed` }];
		await activeWrapper?.vm.$nextTick();

		expect(actionButton()?.querySelector(`.mdi-play`)).not.toBeNull();
	});

	test(`shows a play icon for a failed session`, async () => {
		mountPanel();
		const store = useRecordingStore();
		store.isPanelOpen = true;
		store.savedSessions = [{ sessionId: `s1`, title: `2024-01-01T00:00:00.000Z`, startedAt: 1, stoppedAt: 2, stepCount: 1, lastRunOutcome: `failed` }];
		await activeWrapper?.vm.$nextTick();

		expect(actionButton()?.querySelector(`.mdi-play`)).not.toBeNull();
	});

	test(`clicking the play action sends a replay request for that session and does not navigate into the detail view`, async () => {
		mountPanel();
		const store = useRecordingStore();
		store.isPanelOpen = true;
		store.savedSessions = [{ sessionId: `s1`, title: `2024-01-01T00:00:00.000Z`, startedAt: 1, stoppedAt: 2, stepCount: 1, lastRunOutcome: null }];
		await activeWrapper?.vm.$nextTick();

		const sendSpy = window.eyas?.send as Mock;
		const callsBefore = sendSpy.mock.calls.length;

		actionButton()?.click();
		await activeWrapper?.vm.$nextTick();

		const replayCalls = sendSpy.mock.calls.slice(callsBefore).filter(call => call[0] === `recorder-replay-request`);
		expect(replayCalls.length).toBe(1);
		expect(replayCalls[0]?.[1]).toEqual({ sessionId: `s1` });
		expect(store.selectedSessionId).toBeNull();
	});

	test(`shows a stop icon for the row currently recording in this instance`, async () => {
		mountPanel();
		const store = useRecordingStore();
		store.isPanelOpen = true;
		store.savedSessions = [{ sessionId: `s1`, title: `2024-01-01T00:00:00.000Z`, startedAt: 1, stoppedAt: null, stepCount: 1, lastRunOutcome: null }];
		store.status = `recording`;
		store.sessionId = `s1`;
		await activeWrapper?.vm.$nextTick();

		const button = actionButton();
		expect(button?.querySelector(`.mdi-stop`)).not.toBeNull();
		expect(button?.classList).toContain(`recording-card__action--recording`);
	});

	test(`clicking the stop action on the recording row stops the recording and does not navigate into the detail view`, async () => {
		mountPanel();
		const store = useRecordingStore();
		store.isPanelOpen = true;
		store.savedSessions = [{ sessionId: `s1`, title: `2024-01-01T00:00:00.000Z`, startedAt: 1, stoppedAt: null, stepCount: 1, lastRunOutcome: null }];
		store.status = `recording`;
		store.sessionId = `s1`;
		await activeWrapper?.vm.$nextTick();

		const sendSpy = window.eyas?.send as Mock;
		const callsBefore = sendSpy.mock.calls.length;

		actionButton()?.click();
		await activeWrapper?.vm.$nextTick();

		const stopCalls = sendSpy.mock.calls.slice(callsBefore).filter(call => call[0] === `recorder-stop`);
		expect(stopCalls.length).toBe(1);
		expect(store.selectedSessionId).toBeNull();
	});

	test(`shows a stop icon for the row currently being replayed in this instance`, async () => {
		mountPanel();
		const store = useRecordingStore();
		store.isPanelOpen = true;
		store.savedSessions = [{ sessionId: `s1`, title: `2024-01-01T00:00:00.000Z`, startedAt: 1, stoppedAt: 2, stepCount: 1, lastRunOutcome: `passed` }];
		store.sessionId = `s1`;
		store.playbackStatus = `playing`;
		await activeWrapper?.vm.$nextTick();

		const button = actionButton();
		expect(button?.querySelector(`.mdi-stop`)).not.toBeNull();
		expect(button?.classList).toContain(`recording-card__action--playing`);
	});

	test(`clicking the stop action on the playing row stops the playback and does not navigate into the detail view`, async () => {
		mountPanel();
		const store = useRecordingStore();
		store.isPanelOpen = true;
		store.savedSessions = [{ sessionId: `s1`, title: `2024-01-01T00:00:00.000Z`, startedAt: 1, stoppedAt: 2, stepCount: 1, lastRunOutcome: `passed` }];
		store.sessionId = `s1`;
		store.playbackStatus = `playing`;
		await activeWrapper?.vm.$nextTick();

		const sendSpy = window.eyas?.send as Mock;
		const callsBefore = sendSpy.mock.calls.length;

		actionButton()?.click();
		await activeWrapper?.vm.$nextTick();

		const stopCalls = sendSpy.mock.calls.slice(callsBefore).filter(call => call[0] === `recorder-replay-stop`);
		expect(stopCalls.length).toBe(1);
		expect(store.selectedSessionId).toBeNull();
	});

	test(`disables a row's play button while a different session is recording elsewhere in this instance`, async () => {
		mountPanel();
		const store = useRecordingStore();
		store.isPanelOpen = true;
		store.savedSessions = [{ sessionId: `s1`, title: `2024-01-01T00:00:00.000Z`, startedAt: 1, stoppedAt: 2, stepCount: 1, lastRunOutcome: null }];
		store.status = `recording`;
		store.sessionId = `some-other-session`;
		await activeWrapper?.vm.$nextTick();

		expect(actionButton()?.disabled).toBe(true);
	});

	test(`does not send a replay request when a disabled play button is clicked`, async () => {
		mountPanel();
		const store = useRecordingStore();
		store.isPanelOpen = true;
		store.savedSessions = [{ sessionId: `s1`, title: `2024-01-01T00:00:00.000Z`, startedAt: 1, stoppedAt: 2, stepCount: 1, lastRunOutcome: null }];
		store.status = `recording`;
		store.sessionId = `some-other-session`;
		await activeWrapper?.vm.$nextTick();

		const sendSpy = window.eyas?.send as Mock;
		const callsBefore = sendSpy.mock.calls.length;

		actionButton()?.click();
		await activeWrapper?.vm.$nextTick();

		const replayCalls = sendSpy.mock.calls.slice(callsBefore).filter(call => call[0] === `recorder-replay-request`);
		expect(replayCalls.length).toBe(0);
		expect(store.selectedSessionId).toBeNull();
	});

	test(`leaves every row's play button enabled when nothing is recording or playing`, async () => {
		mountPanel();
		const store = useRecordingStore();
		store.isPanelOpen = true;
		store.savedSessions = [{ sessionId: `s1`, title: `2024-01-01T00:00:00.000Z`, startedAt: 1, stoppedAt: 2, stepCount: 1, lastRunOutcome: null }];
		await activeWrapper?.vm.$nextTick();

		expect(actionButton()?.disabled).toBe(false);
	});

	test(`still navigates into the detail view when the row itself is clicked, unaffected by the trailing action button`, async () => {
		mountPanel();
		const store = useRecordingStore();
		store.isPanelOpen = true;
		store.savedSessions = [{ sessionId: `s1`, title: `2024-01-01T00:00:00.000Z`, startedAt: 1, stoppedAt: 2, stepCount: 1, lastRunOutcome: null }];
		await activeWrapper?.vm.$nextTick();

		document.querySelector<HTMLElement>(`[data-qa="recording-row-s1"]`)?.click();
		await activeWrapper?.vm.$nextTick();

		expect(store.selectedSessionId).toBe(`s1`);
	});
});
