import { describe, test, expect, afterEach, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import RecordingPanel from '@/components/RecordingPanel.vue';
import useRecordingStore from '@/stores/recording.js';

describe(`RecordingPanel failure auto-scroll`, () => {
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

	function selectSessionWithThreeSteps(store: ReturnType<typeof useRecordingStore>): void {
		store.savedSessions = [{ sessionId: `s1`, title: `2024-01-01T00:00:00.000Z`, startedAt: 1, stoppedAt: 2, stepCount: 3, lastRunOutcome: `failed` }];
		store.selectedSessionId = `s1`;
		store.selectedSessionDetail = {
			sessionId: `s1`,
			recording: {
				title: `x`,
				steps: [
					{ type: `click`, selectors: [`#a`], offsetX: 1, offsetY: 1, timestamp: 1 },
					{ type: `click`, selectors: [`#b`], offsetX: 1, offsetY: 1, timestamp: 2 },
					{ type: `click`, selectors: [`#c`], offsetX: 1, offsetY: 1, timestamp: 3 }
				]
			}
		} as never;
	}

	test(`scrolls to the first failing step once outcomes load after an auto-opened failure`, async () => {
		mountPanel();
		const store = useRecordingStore();
		store.isPanelOpen = true;
		selectSessionWithThreeSteps(store);
		store.pendingFailureScrollSessionId = `s1` as never;
		await activeWrapper?.vm.$nextTick();

		const stepEl = document.querySelector(`[data-step-index="1"]`) as HTMLElement;
		const scrollSpy = vi.fn();
		stepEl.scrollIntoView = scrollSpy;

		store.setRunStepOutcomes({ sessionId: `s1`, finished: true, outcomes: { 0: `passed`, 1: `failed`, 2: `failed` } } as never);
		await activeWrapper?.vm.$nextTick();
		await activeWrapper?.vm.$nextTick();

		expect(scrollSpy).toHaveBeenCalledWith({ behavior: `smooth`, block: `center` });
		expect(store.pendingFailureScrollSessionId).toBeNull();
	});

	test(`scrolls to the first failing step even when outcomes resolve before the session detail does`, async () => {
		mountPanel();
		const store = useRecordingStore();
		store.isPanelOpen = true;
		store.savedSessions = [{ sessionId: `s1`, title: `2024-01-01T00:00:00.000Z`, startedAt: 1, stoppedAt: 2, stepCount: 3, lastRunOutcome: `failed` }];
		store.selectedSessionId = `s1`;
		store.pendingFailureScrollSessionId = `s1` as never;
		await activeWrapper?.vm.$nextTick();

		// the timeline isn't in the DOM yet, so mock scrollIntoView on the prototype rather than a
		// specific element — it doesn't exist until the session detail resolves, below
		const scrollSpy = vi.fn();
		window.HTMLElement.prototype.scrollIntoView = scrollSpy;

		// outcomes arrive first — nothing to scroll into yet, since the timeline hasn't rendered
		store.setRunStepOutcomes({ sessionId: `s1`, finished: true, outcomes: { 0: `passed`, 1: `failed`, 2: `failed` } } as never);
		await activeWrapper?.vm.$nextTick();

		expect(scrollSpy).not.toHaveBeenCalled();
		expect(store.pendingFailureScrollSessionId).toBe(`s1`);

		// the session detail resolving second is what should complete the scroll, without any further
		// nudge to runStepOutcomes — mirrors the two real IPC replies landing independently
		store.selectedSessionDetail = {
			sessionId: `s1`,
			recording: {
				title: `x`,
				steps: [
					{ type: `click`, selectors: [`#a`], offsetX: 1, offsetY: 1, timestamp: 1 },
					{ type: `click`, selectors: [`#b`], offsetX: 1, offsetY: 1, timestamp: 2 },
					{ type: `click`, selectors: [`#c`], offsetX: 1, offsetY: 1, timestamp: 3 }
				]
			}
		} as never;
		await activeWrapper?.vm.$nextTick();
		await activeWrapper?.vm.$nextTick();

		expect(scrollSpy).toHaveBeenCalledWith({ behavior: `smooth`, block: `center` });
		expect(store.pendingFailureScrollSessionId).toBeNull();
	});

	test(`does not scroll when outcomes load for a session that wasn't pending a failure scroll`, async () => {
		mountPanel();
		const store = useRecordingStore();
		store.isPanelOpen = true;
		selectSessionWithThreeSteps(store);
		await activeWrapper?.vm.$nextTick();

		const stepEl = document.querySelector(`[data-step-index="1"]`) as HTMLElement;
		const scrollSpy = vi.fn();
		stepEl.scrollIntoView = scrollSpy;

		store.setRunStepOutcomes({ sessionId: `s1`, finished: true, outcomes: { 0: `passed`, 1: `failed` } } as never);
		await activeWrapper?.vm.$nextTick();

		expect(scrollSpy).not.toHaveBeenCalled();
	});

	test(`does not scroll when the loaded run never finished`, async () => {
		mountPanel();
		const store = useRecordingStore();
		store.isPanelOpen = true;
		selectSessionWithThreeSteps(store);
		store.pendingFailureScrollSessionId = `s1` as never;
		await activeWrapper?.vm.$nextTick();

		const stepEl = document.querySelector(`[data-step-index="1"]`) as HTMLElement;
		const scrollSpy = vi.fn();
		stepEl.scrollIntoView = scrollSpy;

		store.setRunStepOutcomes({ sessionId: `s1`, finished: false, outcomes: { 1: `failed` } } as never);
		await activeWrapper?.vm.$nextTick();

		expect(scrollSpy).not.toHaveBeenCalled();
	});
});
