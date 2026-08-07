import { describe, test, expect, afterEach } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import RecordingPanel from '@/components/RecordingPanel.vue';
import useRecordingStore from '@/stores/recording.js';

describe(`RecordingPanel`, () => {
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

	test(`stays hidden until the recording store's panel-open flag is set`, () => {
		mountPanel();

		expect(document.querySelector(`[data-qa="recording-panel-title"]`)).toBeNull();
	});

	test(`renders as a floating panel once the panel-open flag is set`, () => {
		mountPanel();
		useRecordingStore().isPanelOpen = true;

		return activeWrapper?.vm.$nextTick().then(() => {
			expect(document.querySelector(`.eyas-modal--panel`)).not.toBeNull();
			expect(document.querySelector(`[data-qa="recording-panel-title"]`)?.textContent).toContain(`Manage Recordings`);
		});
	});

	test(`clicking the close button clears the panel-open flag`, async () => {
		mountPanel();
		const store = useRecordingStore();
		store.isPanelOpen = true;
		await activeWrapper?.vm.$nextTick();

		const closeButton = document.querySelector<HTMLElement>(`[data-qa="btn-recording-panel-close"]`);
		closeButton?.click();
		await activeWrapper?.vm.$nextTick();

		expect(store.isPanelOpen).toBe(false);
	});

	test(`shows an empty-state message when there are no recordings`, async () => {
		mountPanel();
		useRecordingStore().isPanelOpen = true;
		await activeWrapper?.vm.$nextTick();

		expect(document.querySelector(`[data-qa="recording-panel-empty"]`)).not.toBeNull();
		expect(document.querySelector(`[data-qa="recording-panel-list"]`)).toBeNull();
	});

	test(`renders one row per saved recording found on disk`, async () => {
		mountPanel();
		const store = useRecordingStore();
		store.isPanelOpen = true;
		store.savedSessions = [
			{ sessionId: `s1`, title: `2024-01-01T00:00:00.000Z`, status: `stopped`, startedAt: 1, stoppedAt: 2, stepCount: 3 },
			{ sessionId: `s2`, title: `2024-02-01T00:00:00.000Z`, status: `recording`, startedAt: 2, stoppedAt: null, stepCount: 0 }
		];
		await activeWrapper?.vm.$nextTick();

		expect(document.querySelectorAll(`[data-qa="recording-panel-list"] li`).length).toBe(2);
		expect(document.querySelector(`[data-qa="recording-row-s1"]`)?.textContent).toContain(`3 steps`);
	});

	test(`clicking a recording switches to its detail view and renders its real steps`, async () => {
		mountPanel();
		const store = useRecordingStore();
		store.isPanelOpen = true;
		store.savedSessions = [{ sessionId: `s1`, title: `2024-01-01T00:00:00.000Z`, status: `stopped`, startedAt: 1, stoppedAt: 2, stepCount: 1 }];
		await activeWrapper?.vm.$nextTick();

		document.querySelector<HTMLElement>(`[data-qa="recording-row-s1"]`)?.click();
		await activeWrapper?.vm.$nextTick();

		expect(document.querySelector(`[data-qa="recording-panel-detail"]`)).not.toBeNull();
		expect(document.querySelector(`[data-qa="recording-detail-loading"]`)).not.toBeNull();

		store.selectedSessionDetail = {
			sessionId: `s1`,
			recording: { title: `x`, steps: [{ type: `navigate`, url: `https://example.com`, timestamp: 1 }] }
		} as never;
		await activeWrapper?.vm.$nextTick();

		expect(document.querySelector(`[data-qa="recording-detail-steps"]`)?.textContent).toContain(`Navigate to https://example.com`);
	});

	test(`clicking Back to Browser returns from the detail view to the list`, async () => {
		mountPanel();
		const store = useRecordingStore();
		store.isPanelOpen = true;
		store.savedSessions = [{ sessionId: `s1`, title: `2024-01-01T00:00:00.000Z`, status: `stopped`, startedAt: 1, stoppedAt: 2, stepCount: 0 }];
		store.selectedSessionId = `s1`;
		await activeWrapper?.vm.$nextTick();

		document.querySelector<HTMLElement>(`[data-qa="btn-recording-panel-back"]`)?.click();
		await activeWrapper?.vm.$nextTick();

		expect(document.querySelector(`[data-qa="recording-panel-browser"]`)).not.toBeNull();
		expect(document.querySelector(`[data-qa="recording-panel-detail"]`)).toBeNull();
	});
});
