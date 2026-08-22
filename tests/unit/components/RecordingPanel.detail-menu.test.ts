import { describe, test, expect, afterEach, vi, type Mock } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import RecordingPanel from '@/components/RecordingPanel.vue';
import useRecordingStore from '@/stores/recording.js';
import type { IsActive } from '@registry/primitives.js';

type RecordingPanelDetailMenuExposed = {
	isDetailMenuOpen: IsActive;
};

// Vuetify's click-outside directive only acts on a `click` preceded by a `mousedown` on the same target (vuetify/lib/directives/click-outside); native `element.click()` never fires that `mousedown`, so it silently can't trigger the directive at all.
function realClick(el: Element | null): void {
	el?.dispatchEvent(new MouseEvent(`mousedown`, { bubbles: true, cancelable: true }));
	el?.dispatchEvent(new MouseEvent(`click`, { bubbles: true, cancelable: true }));
}

describe(`RecordingPanel detail header context menu`, () => {
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

	test(`shows a context menu with a Delete Recording option once a recording is selected`, async () => {
		mountPanel();
		const store = useRecordingStore();
		store.isPanelOpen = true;
		store.savedSessions = [{ sessionId: `s1`, title: `2024-01-01T00:00:00.000Z`, startedAt: 1, stoppedAt: 2, stepCount: 0, lastRunOutcome: null }];
		store.selectedSessionId = `s1`;
		await activeWrapper?.vm.$nextTick();

		expect(document.querySelector(`[data-qa="btn-recording-detail-menu"]`)).not.toBeNull();
		(activeWrapper?.vm as unknown as RecordingPanelDetailMenuExposed).isDetailMenuOpen = true;
		await activeWrapper?.vm.$nextTick();

		expect(document.querySelector(`[data-qa="recording-detail-menu-delete"]`)?.textContent?.trim()).toBe(`Delete Recording`);
	});

	test(`hides the recording context menu while browsing the recordings list`, async () => {
		mountPanel();
		useRecordingStore().isPanelOpen = true;
		await activeWrapper?.vm.$nextTick();

		expect(document.querySelector(`[data-qa="btn-recording-detail-menu"]`)).toBeNull();
	});

	// Vuetify's click-outside directive defers its close decision to a `setTimeout(0)` macrotask, which a `$nextTick()` microtask resolves before — so this flushes a real macrotask instead.
	async function flushClickOutside(): Promise<void> {
		await new Promise<void>(resolve => { setTimeout(resolve, 0); });
		await activeWrapper?.vm.$nextTick();
	}

	function selectRecording(): ReturnType<typeof useRecordingStore> {
		const store = useRecordingStore();
		store.isPanelOpen = true;
		store.savedSessions = [{ sessionId: `s1`, title: `2024-01-01T00:00:00.000Z`, startedAt: 1, stoppedAt: 2, stepCount: 0, lastRunOutcome: null }];
		store.selectedSessionId = `s1`;
		return store;
	}

	test(`sends a delete request for the selected recording when the delete confirmation dialog is confirmed, and leaves the recording panel open`, async () => {
		mountPanel();
		const store = selectRecording();
		await activeWrapper?.vm.$nextTick();
		(activeWrapper?.vm as unknown as RecordingPanelDetailMenuExposed).isDetailMenuOpen = true;
		await activeWrapper?.vm.$nextTick();
		(document.querySelector(`[data-qa="recording-detail-menu-delete"]`) as HTMLElement)?.click();
		await activeWrapper?.vm.$nextTick();

		expect(document.querySelector(`[data-qa="recording-delete-modal-title"]`)).not.toBeNull();
		const sendSpy = window.eyas?.send as Mock;
		const callsBefore = sendSpy.mock.calls.length;
		realClick(document.querySelector(`[data-qa="btn-confirm-delete-recording"]`));
		await flushClickOutside();

		const deleteCalls = sendSpy.mock.calls.slice(callsBefore).filter(call => call[0] === `recorder-delete-session`);
		expect(deleteCalls.length).toBe(1);
		expect(deleteCalls[0]?.[1]).toEqual({ sessionId: `s1` });
		expect(store.isPanelOpen).toBe(true);
	});

	test(`does not send a delete request when the delete confirmation dialog is cancelled, and leaves the recording panel open`, async () => {
		mountPanel();
		const store = selectRecording();
		await activeWrapper?.vm.$nextTick();
		(activeWrapper?.vm as unknown as RecordingPanelDetailMenuExposed).isDetailMenuOpen = true;
		await activeWrapper?.vm.$nextTick();
		(document.querySelector(`[data-qa="recording-detail-menu-delete"]`) as HTMLElement)?.click();
		await activeWrapper?.vm.$nextTick();

		const sendSpy = window.eyas?.send as Mock;
		const callsBefore = sendSpy.mock.calls.length;
		realClick(document.querySelector(`[data-qa="btn-cancel-delete-recording"]`));
		await flushClickOutside();

		const deleteCalls = sendSpy.mock.calls.slice(callsBefore).filter(call => call[0] === `recorder-delete-session`);
		expect(deleteCalls.length).toBe(0);
		expect(store.isPanelOpen).toBe(true);
	});

	test(`does not delete a recording that started replaying while its confirmation dialog was still open`, async () => {
		mountPanel();
		const store = selectRecording();
		await activeWrapper?.vm.$nextTick();
		(activeWrapper?.vm as unknown as RecordingPanelDetailMenuExposed).isDetailMenuOpen = true;
		await activeWrapper?.vm.$nextTick();
		(document.querySelector(`[data-qa="recording-detail-menu-delete"]`) as HTMLElement)?.click();
		await activeWrapper?.vm.$nextTick();

		store.status = `stopped`;
		store.sessionId = `s1`;
		store.setPlaybackStatus({ status: `playing`, sessionId: `s1` });
		await activeWrapper?.vm.$nextTick();

		const sendSpy = window.eyas?.send as Mock;
		const callsBefore = sendSpy.mock.calls.length;
		(document.querySelector(`[data-qa="btn-confirm-delete-recording"]`) as HTMLElement)?.click();
		await activeWrapper?.vm.$nextTick();

		expect(sendSpy.mock.calls.slice(callsBefore).some(call => call[0] === `recorder-delete-session`)).toBe(false);
	});

	test(`disables Delete Recording while the selected recording is actively recording or replaying in this instance`, async () => {
		mountPanel();
		const store = selectRecording();
		store.status = `recording`;
		store.sessionId = `s1`;
		await activeWrapper?.vm.$nextTick();
		(activeWrapper?.vm as unknown as RecordingPanelDetailMenuExposed).isDetailMenuOpen = true;
		await activeWrapper?.vm.$nextTick();

		const deleteItem = document.querySelector(`[data-qa="recording-detail-menu-delete"]`);
		expect(deleteItem?.className).toContain(`v-list-item--disabled`);

		const sendSpy = window.eyas?.send as Mock;
		const callsBefore = sendSpy.mock.calls.length;
		(deleteItem as HTMLElement)?.click();
		await activeWrapper?.vm.$nextTick();

		expect(sendSpy.mock.calls.slice(callsBefore).some(call => call[0] === `recorder-delete-session`)).toBe(false);
	});

	test(`returns to the recordings list once the selected recording's deletion is confirmed by the core process`, async () => {
		mountPanel();
		const store = selectRecording();
		await activeWrapper?.vm.$nextTick();

		store.removeDeletedSession({ sessionId: `s1` });
		await activeWrapper?.vm.$nextTick();

		expect(store.selectedSessionId).toBeNull();
		expect(store.savedSessions).toEqual([]);
	});

	test(`closes when the tester clicks outside it and no other dialog is open`, async () => {
		mountPanel();
		const store = selectRecording();
		await activeWrapper?.vm.$nextTick();

		realClick(document.body);
		await flushClickOutside();

		expect(store.isPanelOpen).toBe(false);
	});

	test(`stays open when the tester clicks the delete confirmation dialog while it's open, rather than treating that click as outside itself`, async () => {
		mountPanel();
		const store = selectRecording();
		await activeWrapper?.vm.$nextTick();
		(activeWrapper?.vm as unknown as RecordingPanelDetailMenuExposed).isDetailMenuOpen = true;
		await activeWrapper?.vm.$nextTick();
		(document.querySelector(`[data-qa="recording-detail-menu-delete"]`) as HTMLElement)?.click();
		await activeWrapper?.vm.$nextTick();

		realClick(document.querySelector(`[data-qa="recording-delete-modal-title"]`));
		await flushClickOutside();

		expect(store.isPanelOpen).toBe(true);
	});
});
