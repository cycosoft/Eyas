import { describe, test, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import useSettingsStore from '@/stores/settings.js';

describe(`useSettingsStore`, () => {
	beforeEach(() => {
		setActivePinia(createPinia());
	});

	test(`initialises with empty projectSettings and appSettings`, () => {
		const store = useSettingsStore();
		expect(store.projectSettings).toEqual({});
		expect(store.appSettings).toEqual({});
	});

	test(`setProjectSettings merges new values without losing other keys`, () => {
		const store = useSettingsStore();
		store.setProjectSettings({ env: { alwaysChoose: true } });
		store.setProjectSettings({ env: { lastChoiceHash: `abc123` } });
		// The second call replaces env but doesn't wipe the top-level store
		expect(store.projectSettings.env).toBeDefined();
	});

	test(`setAppSettings merges new values without losing other keys`, () => {
		const store = useSettingsStore();
		store.setAppSettings({ env: { alwaysChoose: false } });
		store.setAppSettings({ recentFiles: [] });
		expect(store.appSettings.env).toBeDefined();
		expect(store.appSettings.recentFiles).toBeDefined();
	});

	test(`loadFromPayload populates project, app, and projectId`, () => {
		const store = useSettingsStore();
		store.loadFromPayload({
			project: { env: { alwaysChoose: true } },
			app: { env: { alwaysChoose: false } },
			projectId: `proj-123`
		});
		expect(store.projectSettings.env.alwaysChoose).toBe(true);
		expect(store.appSettings.env.alwaysChoose).toBe(false);
		expect(store.projectId).toBe(`proj-123`);
	});

	test(`loadFromPayload is safe with undefined fields`, () => {
		const store = useSettingsStore();
		expect(() => store.loadFromPayload({})).not.toThrow();
		expect(() => store.loadFromPayload(undefined)).not.toThrow();
	});
});
