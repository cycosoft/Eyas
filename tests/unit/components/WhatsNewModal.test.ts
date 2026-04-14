import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import WhatsNewModal from '@/components/WhatsNewModal.vue';
import { createVuetify } from 'vuetify';
import { createPinia, setActivePinia } from 'pinia';

// Mock the settings store
vi.mock(`@/stores/settings`, () => ({
	default: () => ({
		version: `1.0.0`,
		appSettings: { lastSeenVersion: `0.9.0` },
		$subscribe: vi.fn()
	})
}));

// Mock the changelog utils
vi.mock(`@/utils/changelog-utils`, () => ({
	getAggregatedChanges: vi.fn(() => [{ version: `1.0.0`, items: [{ text: `test` }] }]),
	tokenizeMarkdownSubset: vi.fn(text => [{ type: `text`, content: text }])
}));

describe(`WhatsNewModal`, () => {
	let wrapper;
	let vuetify;

	beforeEach(async () => {
		vuetify = createVuetify();
		setActivePinia(createPinia());

		// Mock window.eyas
		global.window.eyas = {
			send: vi.fn(),
			receive: vi.fn()
		};

		wrapper = mount(WhatsNewModal, {
			global: {
				plugins: [vuetify]
			}
		});

		// Ensure modal is visible so content is rendered
		wrapper.vm.isVisible = true;
		await wrapper.vm.$nextTick();
	});

	afterEach(() => {
		if (wrapper) wrapper.unmount();
		vi.clearAllMocks();
	});

	test(`uses ModalWrapper as the root`, () => {
		const modalWrapper = wrapper.findComponent({ name: `ModalWrapper` });
		expect(modalWrapper.exists()).toBe(true);
	});

	test(`v-card exists within the modal`, () => {
		const card = wrapper.findComponent({ name: `VCard` });
		expect(card.exists()).toBe(true);
	});

	test(`v-card-text exists within the card`, () => {
		const cardText = wrapper.findComponent({ name: `VCardText` });
		expect(cardText.exists()).toBe(true);
	});
});
