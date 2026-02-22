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

	test(`pins dialog width after enter to prevent jitter`, async () => {
		// Verify initial width is auto
		expect(wrapper.vm.dialogWidth).toBe(`auto`);

		// Mock the offsetWidth on the actual ref element
		Object.defineProperty(wrapper.vm.$refs.modalContent.firstElementChild, `offsetWidth`, {
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
