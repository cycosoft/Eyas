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
});
