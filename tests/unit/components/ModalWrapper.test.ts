import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import type { VueWrapper } from '@vue/test-utils';
import ModalWrapper from '@/components/ModalWrapper.vue';
import { createVuetify } from 'vuetify';
import type { Mock } from 'vitest';

type ComponentVM = {
	pinDialogWidth: () => void;
	dialogWidth: number | string;
	calculatedMinWidth: number | string;
	$nextTick: () => Promise<void>;
}

describe(`ModalWrapper`, () => {
	let wrapper: VueWrapper;
	let vuetify: ReturnType<typeof createVuetify>;

	beforeEach(() => {
		vuetify = createVuetify();
		(window as unknown as { eyas: { send: Mock; receive: Mock } }).eyas = { send: vi.fn(), receive: vi.fn() };



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
		expect((wrapper.vm as unknown as ComponentVM).calculatedMinWidth).toBe(500);
	});

	test(`computed calculatedMinWidth returns undefined for type="dialog"`, async () => {
		await wrapper.setProps({ type: `dialog` });
		expect((wrapper.vm as unknown as ComponentVM).calculatedMinWidth).toBe(undefined);
	});

	test(`computed calculatedMinWidth uses minWidth prop if provided`, async () => {
		await wrapper.setProps({ type: `dialog`, minWidth: 200 });
		expect((wrapper.vm as unknown as ComponentVM).calculatedMinWidth).toBe(200);
	});

	test(`pins dialog width after enter to prevent jitter`, async () => {
		// Re-mount with a div that has the v-card class to match our new querySelector logic
		wrapper = mount(ModalWrapper, {
			global: { plugins: [vuetify] },
			props: { modelValue: true },
			slots: { default: `<div class="v-card eyas-modal-content">Test</div>` }
		});

		// Verify initial width is default auto
		expect((wrapper.vm as unknown as ComponentVM).dialogWidth).toBe(`auto`);

		// Find the element in the document since v-dialog renders in a portal
		const card = document.querySelector(`.v-card`);

		// Mock the offsetWidth on the actual element
		Object.defineProperty(card, `offsetWidth`, {
			get: () => 700,
			configurable: true
		});

		// Trigger the @after-enter event that should pin the width
		(wrapper.vm as unknown as ComponentVM).pinDialogWidth();
		await (wrapper.vm as unknown as ComponentVM).$nextTick();

		// Assert the data property has been pinned based on offsetWidth + 1
		expect((wrapper.vm as unknown as ComponentVM).dialogWidth).toBe(701);
	});

	test(`ensures v-card-text inside the slot is identifyable`, async () => {
		wrapper = mount(ModalWrapper, {
			global: { plugins: [vuetify] },
			props: { modelValue: true },
			slots: { default: `
				<div class="v-card">
					<div class="v-card-title">Title</div>
					<div class="v-card-text test-content">Long content</div>
					<div class="v-card-actions">
						<button>Action</button>
					</div>
				</div>
			` }
		});

		expect(document.querySelector(`.v-card`)).not.toBeNull();
		expect(document.querySelector(`.test-content`)).not.toBeNull();
		expect(document.querySelector(`.v-card-actions`)).not.toBeNull();
	});
});
