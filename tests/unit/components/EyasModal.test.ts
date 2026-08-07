import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia, type Pinia } from 'pinia';
import EyasModal from '@/components/EyasModal.vue';
import useRecordingStore from '@/stores/recording.js';
import type { EyasModalProps } from '@registry/components.js';

describe(`EyasModal`, () => {
	let activeWrapper: VueWrapper | undefined;
	let pinia: Pinia;

	beforeEach(() => {
		pinia = createPinia();
		setActivePinia(pinia);
	});

	afterEach(() => {
		activeWrapper?.unmount();
		activeWrapper = undefined;
	});

	function mountModal(props: EyasModalProps): VueWrapper {
		activeWrapper = mount(EyasModal, { props, global: { plugins: [pinia] } });
		return activeWrapper;
	}

	test(`defaults to the centered modal layout when no mode is given`, () => {
		mountModal({ modelValue: true });

		// v-dialog teleports its content to <body>, so the rendered card isn't inside the wrapper's own tree
		expect(document.querySelector(`.eyas-modal--panel`)).toBeNull();
	});

	test(`applies the panel layout class when mode is "panel"`, () => {
		mountModal({ modelValue: true, mode: `panel` });

		expect(document.querySelector(`.eyas-modal--panel`)).not.toBeNull();
	});

	test(`shows the scrim in modal mode regardless of recording state`, () => {
		useRecordingStore().status = `recording`;
		const wrapper = mountModal({ modelValue: true, mode: `modal` });

		expect(wrapper.findComponent({ name: `VOverlay` }).props(`scrim`)).toBe(true);
	});

	test(`shows the scrim in panel mode while idle`, () => {
		const wrapper = mountModal({ modelValue: true, mode: `panel` });

		expect(wrapper.findComponent({ name: `VOverlay` }).props(`scrim`)).toBe(true);
	});

	test(`still shows the scrim in panel mode while a recording is in progress, since replay is the only case where dimming would hide something worth watching`, () => {
		useRecordingStore().status = `recording`;
		const wrapper = mountModal({ modelValue: true, mode: `panel` });

		expect(wrapper.findComponent({ name: `VOverlay` }).props(`scrim`)).toBe(true);
	});

	test(`suppresses the scrim in panel mode while a replay is in progress`, () => {
		useRecordingStore().playbackStatus = `playing`;
		const wrapper = mountModal({ modelValue: true, mode: `panel` });

		expect(wrapper.findComponent({ name: `VOverlay` }).props(`scrim`)).toBe(false);
	});
});
