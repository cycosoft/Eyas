import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createVuetify } from 'vuetify';
import App from '@/App.vue';
import useSettingsStore from '@/stores/settings';

// Mock Vuetify
const vuetify = createVuetify();

describe(`App`, () => {
	let wrapper;
	let mockSend;
	let mockReceive;

	beforeEach(() => {
		setActivePinia(createPinia());
		mockSend = vi.fn();
		mockReceive = vi.fn();
		global.window.eyas = {
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
		expect(call).toBeDefined();

		const payload = {
			project: { test: 123 },
			app: { theme: 'dark' }
		};
		call[1](payload);

		expect(settingsStore.projectSettings).toEqual(payload.project);
		expect(settingsStore.appSettings.theme).toBe('dark');
	});

	test(`updates store when settings-updated is received`, () => {
		const settingsStore = useSettingsStore();
		const call = mockReceive.mock.calls.find(c => c[0] === `settings-updated`);
		expect(call).toBeDefined();

		const payload = {
			key: 'theme',
			value: 'dark',
			projectId: null
		};
		call[1](payload);

		expect(settingsStore.appSettings.theme).toBe('dark');
	});
});
