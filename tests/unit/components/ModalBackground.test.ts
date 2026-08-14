import { describe, test, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import ModalBackground from '@/components/ModalBackground.vue';

describe(`ModalBackground`, () => {
	test(`shows the scrim by default when no scrim prop is given`, () => {
		const wrapper = mount(ModalBackground, {
			props: { modelValue: true, contentVisible: false }
		});

		expect(wrapper.findComponent({ name: `VOverlay` }).props(`scrim`)).toBe(true);
	});

	test(`suppresses the scrim when scrim is explicitly false`, () => {
		const wrapper = mount(ModalBackground, {
			props: { modelValue: true, contentVisible: false, scrim: false }
		});

		expect(wrapper.findComponent({ name: `VOverlay` }).props(`scrim`)).toBe(false);
	});

	test(`is persistent, so a stray click on the slotted content it doesn't contain can't desync its internal active state from the caller's model-value`, () => {
		const wrapper = mount(ModalBackground, {
			props: { modelValue: true, contentVisible: false }
		});

		expect(wrapper.findComponent({ name: `VOverlay` }).props(`persistent`)).toBe(true);
	});
});
