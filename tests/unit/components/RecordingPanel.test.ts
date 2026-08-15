import { describe, test, expect, afterEach } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import RecordingPanel from '@/components/RecordingPanel.vue';
import useRecordingStore from '@/stores/recording.js';

describe(`RecordingPanel`, () => {
	let activeWrapper: VueWrapper | undefined;

	afterEach(() => {
		activeWrapper?.unmount();
		activeWrapper = undefined;
	});

	function mountPanel(): VueWrapper {
		const pinia = createPinia();
		setActivePinia(pinia);
		activeWrapper = mount(RecordingPanel, { global: { plugins: [pinia] } });
		return activeWrapper;
	}

	test(`stays hidden until the recording store's panel-open flag is set`, () => {
		mountPanel();

		expect(document.querySelector(`[data-qa="recording-panel-title"]`)).toBeNull();
	});

	test(`renders as a floating panel once the panel-open flag is set`, () => {
		mountPanel();
		useRecordingStore().isPanelOpen = true;

		return activeWrapper?.vm.$nextTick().then(() => {
			expect(document.querySelector(`.eyas-modal--panel`)).not.toBeNull();
			expect(document.querySelector(`[data-qa="recording-panel-title"]`)?.textContent).toContain(`Recordings`);
		});
	});

	test(`shows the saved recording count merged into the header title`, async () => {
		mountPanel();
		const store = useRecordingStore();
		store.isPanelOpen = true;
		store.savedSessions = [
			{ sessionId: `s1`, title: `2024-01-01T00:00:00.000Z`, startedAt: 1, stoppedAt: 2, stepCount: 3, lastRunOutcome: null },
			{ sessionId: `s2`, title: `2024-02-01T00:00:00.000Z`, startedAt: 2, stoppedAt: null, stepCount: 0, lastRunOutcome: null }
		];
		await activeWrapper?.vm.$nextTick();

		expect(document.querySelector(`[data-qa="recording-panel-title"]`)?.textContent?.trim()).toBe(`2 Recordings`);
	});

	test(`clicking the close button clears the panel-open flag`, async () => {
		mountPanel();
		const store = useRecordingStore();
		store.isPanelOpen = true;
		await activeWrapper?.vm.$nextTick();

		const closeButton = document.querySelector<HTMLElement>(`[data-qa="btn-recording-panel-close"]`);
		closeButton?.click();
		await activeWrapper?.vm.$nextTick();

		expect(store.isPanelOpen).toBe(false);
	});

	test(`shows an empty-state message when there are no recordings`, async () => {
		mountPanel();
		useRecordingStore().isPanelOpen = true;
		await activeWrapper?.vm.$nextTick();

		expect(document.querySelector(`[data-qa="recording-panel-empty"]`)).not.toBeNull();
		expect(document.querySelector(`[data-qa="recording-panel-list"]`)).toBeNull();
	});

	test(`renders one row per saved recording found on disk`, async () => {
		mountPanel();
		const store = useRecordingStore();
		store.isPanelOpen = true;
		store.savedSessions = [
			{ sessionId: `s1`, title: `2024-01-01T00:00:00.000Z`, startedAt: 1, stoppedAt: 2, stepCount: 3, lastRunOutcome: null },
			{ sessionId: `s2`, title: `2024-02-01T00:00:00.000Z`, startedAt: 2, stoppedAt: null, stepCount: 0, lastRunOutcome: null }
		];
		await activeWrapper?.vm.$nextTick();

		expect(document.querySelectorAll(`[data-qa="recording-panel-list"] li`).length).toBe(2);
		expect(document.querySelector(`[data-qa="recording-row-s1"]`)?.textContent).toContain(`3 steps`);
	});

	test(`clicking a recording switches to its detail view and renders its real steps`, async () => {
		mountPanel();
		const store = useRecordingStore();
		store.isPanelOpen = true;
		store.savedSessions = [{ sessionId: `s1`, title: `2024-01-01T00:00:00.000Z`, startedAt: 1, stoppedAt: 2, stepCount: 1, lastRunOutcome: null }];
		await activeWrapper?.vm.$nextTick();

		document.querySelector<HTMLElement>(`[data-qa="recording-row-s1"]`)?.click();
		await activeWrapper?.vm.$nextTick();

		expect(document.querySelector(`[data-qa="recording-panel-detail"]`)).not.toBeNull();
		expect(document.querySelector(`[data-qa="recording-detail-loading"]`)).not.toBeNull();

		store.selectedSessionDetail = {
			sessionId: `s1`,
			recording: { title: `x`, steps: [{ type: `navigate`, url: `https://example.com`, timestamp: 1 }] }
		} as never;
		await activeWrapper?.vm.$nextTick();

		expect(document.querySelector(`[data-qa="recording-step-title"]`)?.textContent?.trim()).toBe(`Navigate to`);
		expect(document.querySelector(`[data-qa="recording-step-detail"]`)?.textContent?.trim()).toBe(`/`);
	});

	test(`shows a distinct icon and the target selector as subtext for a click step`, async () => {
		mountPanel();
		const store = useRecordingStore();
		store.isPanelOpen = true;
		store.savedSessions = [{ sessionId: `s1`, title: `2024-01-01T00:00:00.000Z`, startedAt: 1, stoppedAt: 2, stepCount: 1, lastRunOutcome: null }];
		await activeWrapper?.vm.$nextTick();
		document.querySelector<HTMLElement>(`[data-qa="recording-row-s1"]`)?.click();
		await activeWrapper?.vm.$nextTick();

		store.selectedSessionDetail = {
			sessionId: `s1`,
			recording: { title: `x`, steps: [{ type: `click`, selectors: [`aria/Submit`], offsetX: 1, offsetY: 1, timestamp: 1 }] }
		} as never;
		await activeWrapper?.vm.$nextTick();

		expect(document.querySelector(`[data-qa="recording-step-title"]`)?.textContent?.trim()).toBe(`Click`);
		expect(document.querySelector(`[data-qa="recording-step-detail"]`)?.textContent?.trim()).toBe(`Submit`);
		expect(document.querySelector(`.mdi-cursor-default-click`)).not.toBeNull();
	});

	test(`resolves a scoped selector's plain-English name rather than its raw JSON payload`, async () => {
		mountPanel();
		const store = useRecordingStore();
		store.isPanelOpen = true;
		store.savedSessions = [{ sessionId: `s1`, title: `2024-01-01T00:00:00.000Z`, startedAt: 1, stoppedAt: 2, stepCount: 1, lastRunOutcome: null }];
		await activeWrapper?.vm.$nextTick();
		document.querySelector<HTMLElement>(`[data-qa="recording-row-s1"]`)?.click();
		await activeWrapper?.vm.$nextTick();

		store.selectedSessionDetail = {
			sessionId: `s1`,
			recording: {
				title: `x`,
				steps: [{ type: `click`, selectors: [`scoped-aria/${JSON.stringify({ scope: `nav`, name: `Viewport` })}`], offsetX: 1, offsetY: 1, timestamp: 1 }]
			}
		} as never;
		await activeWrapper?.vm.$nextTick();

		expect(document.querySelector(`[data-qa="recording-step-detail"]`)?.textContent?.trim()).toBe(`Viewport`);
	});

	test(`shows only the path of a navigation, not the domain the tester was already on`, async () => {
		mountPanel();
		const store = useRecordingStore();
		store.isPanelOpen = true;
		store.savedSessions = [{ sessionId: `s1`, title: `2024-01-01T00:00:00.000Z`, startedAt: 1, stoppedAt: 2, stepCount: 1, lastRunOutcome: null }];
		await activeWrapper?.vm.$nextTick();
		document.querySelector<HTMLElement>(`[data-qa="recording-row-s1"]`)?.click();
		await activeWrapper?.vm.$nextTick();

		store.selectedSessionDetail = {
			sessionId: `s1`,
			recording: { title: `x`, steps: [{ type: `navigate`, url: `https://dev.eyas.cycosoft.com/demo/viewport/index.html`, timestamp: 1 }] }
		} as never;
		await activeWrapper?.vm.$nextTick();

		expect(document.querySelector(`[data-qa="recording-step-title"]`)?.textContent?.trim()).toBe(`Navigate to`);
		expect(document.querySelector(`[data-qa="recording-step-detail"]`)?.textContent?.trim()).toBe(`/demo/viewport/index.html`);
	});

	test(`shows the entered value as subtext for a text-entry step`, async () => {
		mountPanel();
		const store = useRecordingStore();
		store.isPanelOpen = true;
		store.savedSessions = [{ sessionId: `s1`, title: `2024-01-01T00:00:00.000Z`, startedAt: 1, stoppedAt: 2, stepCount: 1, lastRunOutcome: null }];
		await activeWrapper?.vm.$nextTick();
		document.querySelector<HTMLElement>(`[data-qa="recording-row-s1"]`)?.click();
		await activeWrapper?.vm.$nextTick();

		store.selectedSessionDetail = {
			sessionId: `s1`,
			recording: { title: `x`, steps: [{ type: `change`, selectors: [`aria/Email`], value: `test@example.com`, timestamp: 1 }] }
		} as never;
		await activeWrapper?.vm.$nextTick();

		expect(document.querySelector(`[data-qa="recording-step-title"]`)?.textContent?.trim()).toBe(`Enter text`);
		expect(document.querySelector(`[data-qa="recording-step-detail"]`)?.textContent?.trim()).toBe(`test@example.com`);
	});

	test(`omits the subtext line for a step with no extra context to show`, async () => {
		mountPanel();
		const store = useRecordingStore();
		store.isPanelOpen = true;
		store.savedSessions = [{ sessionId: `s1`, title: `2024-01-01T00:00:00.000Z`, startedAt: 1, stoppedAt: 2, stepCount: 1, lastRunOutcome: null }];
		await activeWrapper?.vm.$nextTick();
		document.querySelector<HTMLElement>(`[data-qa="recording-row-s1"]`)?.click();
		await activeWrapper?.vm.$nextTick();

		store.selectedSessionDetail = {
			sessionId: `s1`,
			recording: { title: `x`, steps: [{ type: `keyDown`, key: `Enter`, timestamp: 1 }] }
		} as never;
		await activeWrapper?.vm.$nextTick();

		expect(document.querySelector(`[data-qa="recording-step-title"]`)?.textContent?.trim()).toBe(`Key press: Enter`);
		expect(document.querySelector(`[data-qa="recording-step-detail"]`)).toBeNull();
	});

	test(`the header shows the recording's title once a recording is selected, with no date subtext when the title is just the date`, async () => {
		mountPanel();
		const store = useRecordingStore();
		store.isPanelOpen = true;
		const startedAt = 1700000000000;
		store.savedSessions = [{ sessionId: `s1`, title: new Date(startedAt).toISOString(), startedAt, stoppedAt: 2, stepCount: 0, lastRunOutcome: null }];
		store.selectedSessionId = `s1`;
		await activeWrapper?.vm.$nextTick();

		expect(document.querySelector(`[data-qa="recording-panel-title"]`)?.textContent?.trim()).toBe(new Date(startedAt).toLocaleString());
		expect(document.querySelector(`[data-qa="recording-detail-meta"]`)).toBeNull();
	});

	test(`the header shows a custom recording title with the test date as subtext when they differ`, async () => {
		mountPanel();
		const store = useRecordingStore();
		store.isPanelOpen = true;
		const startedAt = 1700000000000;
		store.savedSessions = [{ sessionId: `s1`, title: `Checkout flow smoke test`, startedAt, stoppedAt: 2, stepCount: 0, lastRunOutcome: null }];
		store.selectedSessionId = `s1`;
		await activeWrapper?.vm.$nextTick();

		expect(document.querySelector(`[data-qa="recording-panel-title"]`)?.textContent?.trim()).toBe(`Checkout flow smoke test`);
		expect(document.querySelector(`[data-qa="recording-detail-meta"]`)?.textContent?.trim()).toBe(new Date(startedAt).toLocaleString());
	});

	test(`clicking All Recordings returns from the detail view to the list`, async () => {
		mountPanel();
		const store = useRecordingStore();
		store.isPanelOpen = true;
		store.savedSessions = [{ sessionId: `s1`, title: `2024-01-01T00:00:00.000Z`, startedAt: 1, stoppedAt: 2, stepCount: 0, lastRunOutcome: null }];
		store.selectedSessionId = `s1`;
		await activeWrapper?.vm.$nextTick();

		document.querySelector<HTMLElement>(`[data-qa="btn-recording-panel-back"]`)?.click();
		await activeWrapper?.vm.$nextTick();

		expect(document.querySelector(`[data-qa="recording-panel-browser"]`)).not.toBeNull();
		expect(document.querySelector(`[data-qa="recording-panel-detail"]`)).toBeNull();
	});

	test(`shows a neutral dot for a recording that has never been played`, async () => {
		mountPanel();
		const store = useRecordingStore();
		store.isPanelOpen = true;
		store.savedSessions = [{ sessionId: `s1`, title: `2024-01-01T00:00:00.000Z`, startedAt: 1, stoppedAt: 2, stepCount: 1, lastRunOutcome: null }];
		await activeWrapper?.vm.$nextTick();

		expect(document.querySelector(`[data-qa="recording-row-s1"] .status-dot`)?.classList).toContain(`status-dot--neutral`);
	});

	test(`shows a green dot for a recording whose most recent run passed`, async () => {
		mountPanel();
		const store = useRecordingStore();
		store.isPanelOpen = true;
		store.savedSessions = [{ sessionId: `s1`, title: `2024-01-01T00:00:00.000Z`, startedAt: 1, stoppedAt: 2, stepCount: 1, lastRunOutcome: `passed` }];
		await activeWrapper?.vm.$nextTick();

		expect(document.querySelector(`[data-qa="recording-row-s1"] .status-dot`)?.classList).toContain(`status-dot--passed`);
	});

	test(`shows a red dot for a recording whose most recent run failed or never finished`, async () => {
		mountPanel();
		const store = useRecordingStore();
		store.isPanelOpen = true;
		store.savedSessions = [{ sessionId: `s1`, title: `2024-01-01T00:00:00.000Z`, startedAt: 1, stoppedAt: 2, stepCount: 1, lastRunOutcome: `failed` }];
		await activeWrapper?.vm.$nextTick();

		expect(document.querySelector(`[data-qa="recording-row-s1"] .status-dot`)?.classList).toContain(`status-dot--failed`);
	});

	test(`shows a blinking dot for the row currently being recorded in this instance, regardless of its last run status`, async () => {
		mountPanel();
		const store = useRecordingStore();
		store.isPanelOpen = true;
		store.savedSessions = [{ sessionId: `s1`, title: `2024-01-01T00:00:00.000Z`, startedAt: 1, stoppedAt: null, stepCount: 1, lastRunOutcome: `passed` }];
		store.status = `recording`;
		store.sessionId = `s1`;
		await activeWrapper?.vm.$nextTick();

		expect(document.querySelector(`[data-qa="recording-row-s1"] .status-dot`)?.classList).toContain(`status-dot--blinking`);
	});

	test(`does not blink a row for a recording happening elsewhere, even while this instance is recording something else`, async () => {
		mountPanel();
		const store = useRecordingStore();
		store.isPanelOpen = true;
		store.savedSessions = [{ sessionId: `s1`, title: `2024-01-01T00:00:00.000Z`, startedAt: 1, stoppedAt: 2, stepCount: 1, lastRunOutcome: null }];
		store.status = `recording`;
		store.sessionId = `s2`;
		await activeWrapper?.vm.$nextTick();

		expect(document.querySelector(`[data-qa="recording-row-s1"] .status-dot`)?.classList).toContain(`status-dot--neutral`);
	});
});
