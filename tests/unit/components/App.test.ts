import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import type { VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createVuetify } from 'vuetify';
import type { Mock } from 'vitest';
import App from '@/App.vue';
import useSettingsStore from '@/stores/settings.js';

// Mock Vuetify
const vuetify = createVuetify();

describe(`App`, () => {
	let wrapper: VueWrapper;
	let mockSend: Mock;
	let mockReceive: Mock;

	beforeEach(() => {
		setActivePinia(createPinia());
		mockSend = vi.fn();
		mockReceive = vi.fn();
		(window as unknown as { eyas: { send: Mock; receive: Mock } }).eyas = {
			send: mockSend,
			receive: mockReceive
		};

		wrapper = mount(App, {
			global: {
				plugins: [vuetify],
				stubs: {
					ExitModal: true,
					EnvironmentModal: true,
					VariablesModal: true,
					VersionMismatchModal: true,
					TestServerSetupModal: true,
					TestServerActiveModal: true,
					TestServerResumeModal: true,
					SettingsModal: true
				}
			}
		});
	});

	afterEach(() => {
		if (wrapper) { wrapper.unmount(); }
		vi.clearAllMocks();
	});

	test(`requests settings on mount`, () => {
		expect(mockSend).toHaveBeenCalledWith(`get-settings`);
	});

	test(`updates store when settings-loaded is received`, () => {
		const settingsStore = useSettingsStore();
		const call = mockReceive.mock.calls.find(c => c[0] === `settings-loaded`);
		if (!call) throw new Error(`call not found`);
		expect(call).toBeDefined();

		const payload = {
			project: { test: 123 },
			app: { theme: `dark` }
		};
		call[1](payload);

		expect(settingsStore.projectSettings).toEqual(payload.project);
		expect(settingsStore.appSettings.theme).toBe(`dark`);
	});

	test(`updates store when settings-updated is received`, () => {
		const settingsStore = useSettingsStore();
		const call = mockReceive.mock.calls.find(c => c[0] === `settings-updated`);
		if (!call) throw new Error(`call not found`);
		expect(call).toBeDefined();

		const payload = {
			key: `theme`,
			value: `dark`,
			projectId: null
		};
		call[1](payload);

		expect(settingsStore.appSettings.theme).toBe(`dark`);
		expect(vuetify.theme.global.name.value).toBe(`dark`);

		// Check if the DOM has the class
		expect(wrapper.get(`.v-theme--dark`)).toBeDefined();
	});
});
