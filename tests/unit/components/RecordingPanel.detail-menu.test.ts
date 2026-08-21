import { describe, test, expect, afterEach } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import RecordingPanel from '@/components/RecordingPanel.vue';
import useRecordingStore from '@/stores/recording.js';
import type { IsActive } from '@registry/primitives.js';

type RecordingPanelDetailMenuExposed = {
	isDetailMenuOpen: IsActive;
};

describe(`RecordingPanel detail header context menu`, () => {
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

	test(`shows a context menu with a Delete Recording option once a recording is selected`, async () => {
		mountPanel();
		const store = useRecordingStore();
		store.isPanelOpen = true;
		store.savedSessions = [{ sessionId: `s1`, title: `2024-01-01T00:00:00.000Z`, startedAt: 1, stoppedAt: 2, stepCount: 0, lastRunOutcome: null }];
		store.selectedSessionId = `s1`;
		await activeWrapper?.vm.$nextTick();

		expect(document.querySelector(`[data-qa="btn-recording-detail-menu"]`)).not.toBeNull();
		(activeWrapper?.vm as unknown as RecordingPanelDetailMenuExposed).isDetailMenuOpen = true;
		await activeWrapper?.vm.$nextTick();

		expect(document.querySelector(`[data-qa="recording-detail-menu-delete"]`)?.textContent?.trim()).toBe(`Delete Recording`);
	});

	test(`hides the recording context menu while browsing the recordings list`, async () => {
		mountPanel();
		useRecordingStore().isPanelOpen = true;
		await activeWrapper?.vm.$nextTick();

		expect(document.querySelector(`[data-qa="btn-recording-detail-menu"]`)).toBeNull();
	});
});
