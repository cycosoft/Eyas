import { describe, test, expect, afterEach, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import RecordingPanel from '@/components/RecordingPanel.vue';
import useRecordingStore from '@/stores/recording.js';

describe(`RecordingPanel playback auto-scroll`, () => {
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

	function selectSessionWithTwoSteps(store: ReturnType<typeof useRecordingStore>): void {
		store.savedSessions = [{ sessionId: `s1`, title: `2024-01-01T00:00:00.000Z`, startedAt: 1, stoppedAt: 2, stepCount: 2, lastRunOutcome: `passed` }];
		store.selectedSessionId = `s1`;
		store.selectedSessionDetail = {
			sessionId: `s1`,
			recording: {
				title: `x`,
				steps: [
					{ type: `click`, selectors: [`#a`], offsetX: 1, offsetY: 1, timestamp: 1 },
					{ type: `click`, selectors: [`#b`], offsetX: 1, offsetY: 1, timestamp: 2 }
				]
			}
		} as never;
	}

	test(`scrolls the actively-dispatching step into view as playback advances`, async () => {
		mountPanel();
		const store = useRecordingStore();
		store.isPanelOpen = true;
		selectSessionWithTwoSteps(store);
		store.sessionId = `s1`;
		store.playbackStatus = `playing`;
		await activeWrapper?.vm.$nextTick();

		const stepEl = document.querySelector(`[data-step-index="1"]`) as HTMLElement;
		const scrollSpy = vi.fn();
		stepEl.scrollIntoView = scrollSpy;

		store.currentStepIndex = 1;
		await activeWrapper?.vm.$nextTick();
		await activeWrapper?.vm.$nextTick();

		expect(scrollSpy).toHaveBeenCalledWith({ behavior: `smooth`, block: `center` });
	});

	test(`does not scroll a different session's steps while this one plays in another instance`, async () => {
		mountPanel();
		const store = useRecordingStore();
		store.isPanelOpen = true;
		selectSessionWithTwoSteps(store);
		store.sessionId = `other-session`;
		store.playbackStatus = `playing`;
		await activeWrapper?.vm.$nextTick();

		const stepEl = document.querySelector(`[data-step-index="1"]`) as HTMLElement;
		const scrollSpy = vi.fn();
		stepEl.scrollIntoView = scrollSpy;

		store.currentStepIndex = 1;
		await activeWrapper?.vm.$nextTick();

		expect(scrollSpy).not.toHaveBeenCalled();
	});

	test(`stops following once the tester manually scrolls, for the rest of that run`, async () => {
		const wrapper = mountPanel();
		const store = useRecordingStore();
		store.isPanelOpen = true;
		selectSessionWithTwoSteps(store);
		store.sessionId = `s1`;
		store.playbackStatus = `playing`;
		store.currentStepIndex = 0;
		await wrapper.vm.$nextTick();
		await wrapper.vm.$nextTick();

		const stepEl = document.querySelector(`[data-step-index="1"]`) as HTMLElement;
		const scrollSpy = vi.fn();
		stepEl.scrollIntoView = scrollSpy;

		document.querySelector(`[data-qa="recording-panel-detail"]`)?.dispatchEvent(new Event(`wheel`, { bubbles: true }));
		await wrapper.vm.$nextTick();

		store.currentStepIndex = 1;
		await wrapper.vm.$nextTick();
		await wrapper.vm.$nextTick();

		expect(scrollSpy).not.toHaveBeenCalled();
	});

	test(`resumes following on the next playback run's first step`, async () => {
		const wrapper = mountPanel();
		const store = useRecordingStore();
		store.isPanelOpen = true;
		selectSessionWithTwoSteps(store);
		store.sessionId = `s1`;
		store.playbackStatus = `playing`;
		store.currentStepIndex = 0;
		await wrapper.vm.$nextTick();
		await wrapper.vm.$nextTick();

		document.querySelector(`[data-qa="recording-panel-detail"]`)?.dispatchEvent(new Event(`wheel`, { bubbles: true }));
		await wrapper.vm.$nextTick();

		// run ends, then a fresh run begins at step 0 again
		store.playbackStatus = null;
		store.currentStepIndex = null;
		await wrapper.vm.$nextTick();
		store.playbackStatus = `playing`;
		store.currentStepIndex = 0;
		await wrapper.vm.$nextTick();

		const stepEl = document.querySelector(`[data-step-index="1"]`) as HTMLElement;
		const scrollSpy = vi.fn();
		stepEl.scrollIntoView = scrollSpy;

		store.currentStepIndex = 1;
		await wrapper.vm.$nextTick();
		await wrapper.vm.$nextTick();

		expect(scrollSpy).toHaveBeenCalledWith({ behavior: `smooth`, block: `center` });
	});
});
