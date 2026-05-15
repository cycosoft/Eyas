import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import type { VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import ModalWrapper from '@/components/ModalWrapper.vue';
import type { WindowWithEyas } from '@registry/ipc.js';
import type { ModalWrapperVM } from '@registry/components.js';
import ModalStore from '@/stores/modals.js';

// Removed local type definition

describe(`ModalWrapper`, () => {
	let wrapper: VueWrapper;
	beforeEach(() => {
		setActivePinia(createPinia());
		(window as unknown as WindowWithEyas).eyas = { send: vi.fn(), receive: vi.fn() };
		ModalStore().$reset();



		wrapper = mount(ModalWrapper, {
			props: { modelValue: true },
			slots: { default: `<div class="eyas-modal-content">Test</div>` }
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
		if (wrapper) wrapper.unmount();
	});

	test(`computed calculatedMinWidth returns 500 for type="modal"`, () => {
		expect((wrapper.vm as unknown as ModalWrapperVM).calculatedMinWidth).toBe(500);
	});

	test(`computed calculatedMinWidth returns undefined for type="dialog"`, async () => {
		await wrapper.setProps({ type: `dialog` });
		expect((wrapper.vm as unknown as ModalWrapperVM).calculatedMinWidth).toBe(undefined);
	});

	test(`computed calculatedMinWidth uses minWidth prop if provided`, async () => {
		await wrapper.setProps({ type: `dialog`, minWidth: 200 });
		expect((wrapper.vm as unknown as ModalWrapperVM).calculatedMinWidth).toBe(200);
	});

	test(`pins dialog width after enter to prevent jitter`, async () => {
		// Re-mount with a div that has the v-card class to match our new querySelector logic
		wrapper = mount(ModalWrapper, {
			props: { modelValue: true },
			slots: { default: `<div class="v-card eyas-modal-content">Test</div>` }
		});

		// Verify initial width is default auto
		expect((wrapper.vm as unknown as ModalWrapperVM).dialogWidth).toBe(`auto`);

		// Find the element in the document since v-dialog renders in a portal
		const card = document.querySelector(`.v-card`);

		// Mock the offsetWidth on the actual element
		Object.defineProperty(card, `offsetWidth`, {
			get: () => 700,
			configurable: true
		});

		// Trigger the @after-enter event that should pin the width
		(wrapper.vm as unknown as ModalWrapperVM).pinDialogWidth();
		await (wrapper.vm as unknown as ModalWrapperVM).$nextTick();

		// Assert the data property has been pinned based on offsetWidth + 1
		expect((wrapper.vm as unknown as ModalWrapperVM).dialogWidth).toBe(701);
	});

	test(`ensures v-card-text inside the slot is identifyable`, async () => {
		wrapper = mount(ModalWrapper, {
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

	test(`sends hide-ui immediately when no modals are open`, async () => {
		// Ensure store is empty first
		await wrapper.setProps({ modelValue: false });

		const vm = wrapper.vm as unknown as ModalWrapperVM;
		vm.hideUi();

		expect(window.eyas?.send).toHaveBeenCalledWith(`hide-ui`);
	});

	test(`does NOT send hide-ui if other modals are still open`, async () => {
		// Component A is already mounted with modelValue: true (tracked in store)
		// We'll simulate another modal being tracked by manually tracking
		const store = ModalStore();
		store.track(`other-modal`);

		// Now close our component A
		await wrapper.setProps({ modelValue: false });

		const vm = wrapper.vm as unknown as ModalWrapperVM;
		vm.hideUi();

		// Should NOT have sent hide-ui because 'other-modal' is still in store
		expect(window.eyas?.send).not.toHaveBeenCalledWith(`hide-ui`);
	});
});
