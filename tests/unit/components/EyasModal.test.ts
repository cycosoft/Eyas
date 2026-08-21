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

	test(`fades the panel while a replay is in progress`, () => {
		useRecordingStore().playbackStatus = `playing`;
		mountModal({ modelValue: true, mode: `panel` });

		expect(document.querySelector(`[data-qa="eyas-modal-card"]`)?.classList.contains(`eyas-modal--faded`)).toBe(true);
	});

	test(`does not fade the panel when idle`, () => {
		mountModal({ modelValue: true, mode: `panel` });

		expect(document.querySelector(`[data-qa="eyas-modal-card"]`)?.classList.contains(`eyas-modal--faded`)).toBe(false);
	});

	test(`does not fade the panel while a recording is actively being captured, since there's no replay on screen to compete for attention`, () => {
		useRecordingStore().status = `recording`;
		mountModal({ modelValue: true, mode: `panel` });

		expect(document.querySelector(`[data-qa="eyas-modal-card"]`)?.classList.contains(`eyas-modal--faded`)).toBe(false);
	});

	test(`never fades the centered modal layout, even during a replay`, () => {
		useRecordingStore().playbackStatus = `playing`;
		mountModal({ modelValue: true, mode: `modal` });

		expect(document.querySelector(`[data-qa="eyas-modal-card"]`)?.classList.contains(`eyas-modal--faded`)).toBe(false);
	});

	test(`narrows the panel alongside the fade while a replay is in progress`, () => {
		useRecordingStore().playbackStatus = `playing`;
		mountModal({ modelValue: true, mode: `panel` });

		expect(document.querySelector(`.eyas-modal-panel-content`)?.classList.contains(`eyas-modal-panel-content--faded`)).toBe(true);
	});

	test(`does not narrow the panel when idle`, () => {
		mountModal({ modelValue: true, mode: `panel` });

		expect(document.querySelector(`.eyas-modal-panel-content`)?.classList.contains(`eyas-modal-panel-content--faded`)).toBe(false);
	});

	test(`does not narrow the panel while a recording is actively being captured`, () => {
		useRecordingStore().status = `recording`;
		mountModal({ modelValue: true, mode: `panel` });

		expect(document.querySelector(`.eyas-modal-panel-content`)?.classList.contains(`eyas-modal-panel-content--faded`)).toBe(false);
	});

	test(`allows escape and click-outside to close the dialog by default`, () => {
		const wrapper = mountModal({ modelValue: true });

		expect(wrapper.findComponent({ name: `VDialog` }).props(`persistent`)).toBe(false);
	});

	test(`disables escape and click-outside closing when closeOnEscape is false`, () => {
		const wrapper = mountModal({ modelValue: true, closeOnEscape: false });

		expect(wrapper.findComponent({ name: `VDialog` }).props(`persistent`)).toBe(true);
	});

	test(`does not hide the app UI layer when the last dialog closes while a replay is in progress`, () => {
		const recordingStore = useRecordingStore();
		recordingStore.playbackStatus = `playing`;
		const wrapper = mountModal({ modelValue: true, mode: `panel` });
		wrapper.findComponent({ name: `ModalBackground` }).vm.$emit(`after-leave`);

		expect(window.eyas?.send).not.toHaveBeenCalledWith(`hide-ui`, expect.anything());
	});

	test(`hides the app UI layer once the in-progress replay finishes with no dialogs left open`, async () => {
		const recordingStore = useRecordingStore();
		recordingStore.playbackStatus = `playing`;
		const wrapper = mountModal({ modelValue: true, mode: `panel` });
		await wrapper.setProps({ modelValue: false });
		wrapper.findComponent({ name: `ModalBackground` }).vm.$emit(`after-leave`);

		recordingStore.playbackStatus = `stopped`;
		await wrapper.vm.$nextTick();

		expect(window.eyas?.send).toHaveBeenCalledWith(`hide-ui`);
	});
});
