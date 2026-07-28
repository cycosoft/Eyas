import { describe, test, expect, beforeEach } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia, type Pinia } from 'pinia';
import TestRunningRing from '@/components/TestRunningRing.vue';
import { state as headerState } from '@/components/AppHeader.logic.js';
import useRecordingStore from '@/stores/recording.js';
import { EYAS_HEADER_HEIGHT } from '@scripts/constants.js';

describe(`TestRunningRing`, () => {
	let pinia: Pinia;

	beforeEach(() => {
		pinia = createPinia();
		setActivePinia(pinia);
		headerState.currentViewport = null;
	});

	function mountRing(): VueWrapper {
		return mount(TestRunningRing, { global: { plugins: [pinia] } });
	}

	test(`is not rendered while no test is playing`, () => {
		const store = useRecordingStore();
		store.playbackStatus = null;
		headerState.currentViewport = [1024, 768];

		const wrapper = mountRing();

		expect(wrapper.find(`[data-qa="test-running-ring"]`).exists()).toBe(false);
	});

	test(`is not rendered while playing if the current viewport is not yet known`, () => {
		const store = useRecordingStore();
		store.playbackStatus = `playing`;
		headerState.currentViewport = null;

		const wrapper = mountRing();

		expect(wrapper.find(`[data-qa="test-running-ring"]`).exists()).toBe(false);
	});

	test(`renders positioned and sized to exactly match the test layer's bounds while a test is playing`, () => {
		const store = useRecordingStore();
		store.playbackStatus = `playing`;
		headerState.currentViewport = [1024, 768];

		const wrapper = mountRing();
		const ring = wrapper.find(`[data-qa="test-running-ring"]`);

		expect(ring.exists()).toBe(true);
		expect(ring.attributes(`style`)).toContain(`top: ${EYAS_HEADER_HEIGHT}px`);
		expect(ring.attributes(`style`)).toContain(`left: 0px`);
		expect(ring.attributes(`style`)).toContain(`width: 1024px`);
		expect(ring.attributes(`style`)).toContain(`height: 768px`);
	});

	test(`disappears once playback stops`, async () => {
		const store = useRecordingStore();
		store.playbackStatus = `playing`;
		headerState.currentViewport = [1024, 768];

		const wrapper = mountRing();
		expect(wrapper.find(`[data-qa="test-running-ring"]`).exists()).toBe(true);

		store.playbackStatus = `stopped`;
		await wrapper.vm.$nextTick();

		expect(wrapper.find(`[data-qa="test-running-ring"]`).exists()).toBe(false);
	});
});
