import { describe, test, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import useRecordingStore from '@/stores/recording.js';

describe(`useRecordingStore`, () => {
	beforeEach(() => {
		setActivePinia(createPinia());
	});

	test(`initialises with no status, sessionId, or playback error`, () => {
		const store = useRecordingStore();
		expect(store.status).toBeNull();
		expect(store.sessionId).toBeNull();
		expect(store.playbackError).toBeNull();
	});

	test(`setFromIpc sets status to 'recording' and stores the sessionId`, () => {
		const store = useRecordingStore();
		store.setFromIpc({ isRecording: true, sessionId: `sess-1` });
		expect(store.status).toBe(`recording`);
		expect(store.sessionId).toBe(`sess-1`);
		expect(store.isRecording).toBe(true);
	});

	test(`setFromIpc sets status to 'stopped' when isRecording is false`, () => {
		const store = useRecordingStore();
		store.setFromIpc({ isRecording: false, sessionId: `sess-1` });
		expect(store.status).toBe(`stopped`);
		expect(store.isStopped).toBe(true);
	});

	test(`setPlaybackStatus clears any prior playback error when a new playback starts`, () => {
		const store = useRecordingStore();
		store.setPlaybackStatus({ status: `failed`, error: `boom` });
		store.setPlaybackStatus({ status: `playing` });
		expect(store.playbackError).toBeNull();
	});

	test(`setPlaybackStatus records the error message when playback fails`, () => {
		const store = useRecordingStore();
		store.setPlaybackStatus({ status: `failed`, error: `network offline` });
		expect(store.playbackError).toBe(`network offline`);
	});

	test(`setPlaybackStatus clears the error when playback stops successfully`, () => {
		const store = useRecordingStore();
		store.setPlaybackStatus({ status: `failed`, error: `boom` });
		store.setPlaybackStatus({ status: `stopped` });
		expect(store.playbackError).toBeNull();
	});
});
