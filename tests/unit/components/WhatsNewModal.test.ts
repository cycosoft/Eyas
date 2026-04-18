import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import type { VueWrapper } from '@vue/test-utils';
import WhatsNewModal from '@/components/WhatsNewModal.vue';
import { createVuetify } from 'vuetify';
import { createPinia, setActivePinia } from 'pinia';
import type { WindowWithEyas } from '@registry/ipc.js';
import type { ComponentVM } from '@registry/components.js';

// Removed local ComponentVM definition

// Mock the settings store
vi.mock(`@/stores/settings`, () => ({
	default: (): Record<string, unknown> => ({
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
	let wrapper: VueWrapper;
	let vuetify: ReturnType<typeof createVuetify>;

	beforeEach(async () => {
		vuetify = createVuetify();
		setActivePinia(createPinia());

		// Mock window.eyas
		(window as unknown as WindowWithEyas).eyas = {
			send: vi.fn(),
			receive: vi.fn()
		};

		wrapper = mount(WhatsNewModal, {
			global: {
				plugins: [vuetify]
			}
		});

		// Ensure modal is visible so content is rendered
		(wrapper.vm as unknown as ComponentVM).isVisible = true;
		await (wrapper.vm as unknown as ComponentVM).$nextTick();
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

	test(`showManual sets isVisible to true and mode to manual`, async () => {
		await (wrapper.vm as unknown as ComponentVM).showManual();
		expect((wrapper.vm as unknown as ComponentVM).isVisible).toBe(true);
		expect((wrapper.vm as unknown as ComponentVM).mode).toBe(`manual`);
	});

	test(`close sets isVisible to false and sends whats-new-closed`, async () => {
		(wrapper.vm as unknown as ComponentVM).isVisible = true;
		await (wrapper.vm as unknown as ComponentVM).close();
		expect((wrapper.vm as unknown as ComponentVM).isVisible).toBe(false);
		const eyas = (window as unknown as WindowWithEyas).eyas;
		expect(eyas.send).toHaveBeenCalledWith(`whats-new-closed`);
	});
});
