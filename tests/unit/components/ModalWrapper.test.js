import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import ModalWrapper from '@/components/ModalWrapper.vue';
import { createVuetify } from 'vuetify';

describe(`ModalWrapper`, () => {
	let wrapper;
	let vuetify;

	beforeEach(() => {
		vuetify = createVuetify();
		global.window.eyas = { send: vi.fn(), receive: vi.fn() };



		wrapper = mount(ModalWrapper, {
			global: { plugins: [vuetify] },
			props: { modelValue: true },
			slots: { default: `<div class="eyas-modal-content">Test</div>` }
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
		if (wrapper) wrapper.unmount();
	});

	test(`computed calculatedMinWidth returns 500 for type="modal"`, () => {
		expect(wrapper.vm.calculatedMinWidth).toBe(500);
	});

	test(`computed calculatedMinWidth returns undefined for type="dialog"`, async () => {
		await wrapper.setProps({ type: `dialog` });
		expect(wrapper.vm.calculatedMinWidth).toBe(undefined);
	});

	test(`computed calculatedMinWidth uses minWidth prop if provided`, async () => {
		await wrapper.setProps({ type: `dialog`, minWidth: 200 });
		expect(wrapper.vm.calculatedMinWidth).toBe(200);
	});

	test(`pins dialog width after enter to prevent jitter`, async () => {
		// Re-mount with a div that has the v-card class to match our new querySelector logic
		wrapper = mount(ModalWrapper, {
			global: { plugins: [vuetify] },
			props: { modelValue: true },
			slots: { default: `<div class="v-card eyas-modal-content">Test</div>` }
		});

		// Verify initial width is default auto
		expect(wrapper.vm.dialogWidth).toBe(`auto`);

		// Find the element in the document since v-dialog renders in a portal
		const card = document.querySelector('.v-card');

		// Mock the offsetWidth on the actual element
		Object.defineProperty(card, `offsetWidth`, {
			get: () => 700,
			configurable: true
		});

		// Trigger the @after-enter event that should pin the width
		wrapper.vm.pinDialogWidth();
		await wrapper.vm.$nextTick();

		// Assert the data property has been pinned based on offsetWidth + 1
		expect(wrapper.vm.dialogWidth).toBe(701);
	});
});
