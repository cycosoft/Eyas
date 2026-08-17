import { describe, test, expect, vi, beforeEach, type Mock } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia, type Pinia } from 'pinia';
import AppHeaderRecordingControls from '@/components/AppHeaderRecordingControls.vue';
import useRecordingStore from '@/stores/recording.js';
import type { WindowWithEyas } from '@registry/ipc.js';

describe(`AppHeaderRecordingControls`, () => {
	let wrapper: VueWrapper;
	let mockSend: Mock;
	let pinia: Pinia;

	beforeEach(() => {
		pinia = createPinia();
		setActivePinia(pinia);
		mockSend = vi.fn();
		(window as unknown as WindowWithEyas).eyas = {
			send: mockSend,
			receive: vi.fn()
		};
	});

	function mountWithStatus(status: `recording` | `stopped` | null, playbackStatus: `playing` | `stopped` | `failed` | null = null): VueWrapper {
		const store = useRecordingStore();
		store.status = status;
		store.playbackStatus = playbackStatus;
		return mount(AppHeaderRecordingControls, {
			global: {
				plugins: [pinia],
				stubs: {
					VBtn: { template: `<button v-bind="$attrs" @click="$emit('click', $event)"><slot /></button>` },
					VIcon: true,
					VTooltip: { template: `<div><slot /></div>` }
				}
			}
		});
	}

	test(`shows the stop-playback button instead of the replay button while playback is playing`, () => {
		wrapper = mountWithStatus(`stopped`, `playing`);

		expect(wrapper.find(`[data-qa="btn-recording-playback-stop"]`).exists()).toBe(true);
		expect(wrapper.find(`[data-qa="btn-recording-replay"]`).exists()).toBe(false);
	});

	test(`shows the replay button (not the stop-playback button) once stopped and not playing`, () => {
		wrapper = mountWithStatus(`stopped`, null);

		expect(wrapper.find(`[data-qa="btn-recording-replay"]`).exists()).toBe(true);
		expect(wrapper.find(`[data-qa="btn-recording-playback-stop"]`).exists()).toBe(false);
	});

	test(`clicking the stop-playback button sends recorder-replay-stop over IPC`, async () => {
		wrapper = mountWithStatus(`stopped`, `playing`);

		await wrapper.find(`[data-qa="btn-recording-playback-stop"]`).trigger(`click`);

		expect(mockSend).toHaveBeenCalledWith(`recorder-replay-stop`);
	});

	test(`the replay button never renders while playback is playing, even though isStopped is also true`, () => {
		wrapper = mountWithStatus(`stopped`, `playing`);

		expect(wrapper.find(`[data-qa="btn-recording-replay"]`).exists()).toBe(false);
	});

	test(`shows both the record-again and replay buttons once stopped and not playing`, () => {
		wrapper = mountWithStatus(`stopped`, null);

		expect(wrapper.find(`[data-qa="btn-recording-record-again"]`).exists()).toBe(true);
		expect(wrapper.find(`[data-qa="btn-recording-replay"]`).exists()).toBe(true);
	});

	test(`clicking record-again sends recorder-record-start over IPC`, async () => {
		wrapper = mountWithStatus(`stopped`, null);

		await wrapper.find(`[data-qa="btn-recording-record-again"]`).trigger(`click`);

		expect(mockSend).toHaveBeenCalledWith(`recorder-record-start`);
	});

	test(`the record-again button is hidden while recording or playing`, () => {
		wrapper = mountWithStatus(`recording`, null);
		expect(wrapper.find(`[data-qa="btn-recording-record-again"]`).exists()).toBe(false);

		wrapper = mountWithStatus(`stopped`, `playing`);
		expect(wrapper.find(`[data-qa="btn-recording-record-again"]`).exists()).toBe(false);
	});

	test(`the stop-recording button has a tooltip explaining its action`, () => {
		wrapper = mountWithStatus(`recording`, null);

		expect(wrapper.find(`[data-qa="btn-recording-stop"]`).text()).toContain(`Stop Recording`);
	});

	test(`the stop-playback button has a tooltip explaining its action`, () => {
		wrapper = mountWithStatus(`stopped`, `playing`);

		expect(wrapper.find(`[data-qa="btn-recording-playback-stop"]`).text()).toContain(`Stop Playback`);
	});

	test(`the record-again and replay buttons each have a tooltip explaining their action`, () => {
		wrapper = mountWithStatus(`stopped`, null);

		expect(wrapper.find(`[data-qa="btn-recording-record-again"]`).text()).toContain(`New Recording`);
		expect(wrapper.find(`[data-qa="btn-recording-replay"]`).text()).toContain(`Replay Recording`);
	});

	// Replay checks a rich-text editor against what was recorded instead of overwriting it, so the
	// findings need somewhere to land — without this surface the inversion has no user-facing value.
	const MISMATCH = { selector: `testid/editor`, expected: `Rich text`, actual: `Rch txt`, stepIndex: 0 };

	function mountWithMismatches(mismatches: typeof MISMATCH[]): VueWrapper {
		const wrapperWithStatus = mountWithStatus(`stopped`, `stopped`);
		useRecordingStore().playbackMismatches = mismatches;
		return wrapperWithStatus;
	}

	test(`shows nothing when a replay finished with no findings`, () => {
		wrapper = mountWithMismatches([]);

		expect(wrapper.find(`[data-qa="recording-playback-mismatches"]`).exists()).toBe(false);
	});

	test(`reports the number of mismatches after a replay`, async () => {
		wrapper = mountWithMismatches([MISMATCH, { ...MISMATCH, stepIndex: 4 }]);
		await wrapper.vm.$nextTick();

		expect(wrapper.find(`[data-qa="recording-playback-mismatches"]`).text()).toContain(`2 mismatches`);
	});

	test(`says "mismatch" rather than "mismatches" for a single finding`, async () => {
		wrapper = mountWithMismatches([MISMATCH]);
		await wrapper.vm.$nextTick();

		expect(wrapper.find(`[data-qa="recording-playback-mismatches"]`).text()).toContain(`1 mismatch`);
		expect(wrapper.find(`[data-qa="recording-playback-mismatches"]`).text()).not.toContain(`mismatches`);
	});

	test(`spells out the expected and actual text in the tooltip`, async () => {
		wrapper = mountWithMismatches([MISMATCH]);
		await wrapper.vm.$nextTick();

		// a bare count would tell the tester something is wrong without telling them what
		const text = wrapper.find(`[data-qa="recording-playback-mismatches"]`).text();
		expect(text).toContain(`Rich text`);
		expect(text).toContain(`Rch txt`);
	});

	test(`shows findings alongside a failure, not instead of it`, async () => {
		wrapper = mountWithStatus(`stopped`, `failed`);
		const store = useRecordingStore();
		store.playbackError = `boom`;
		store.playbackMismatches = [MISMATCH];
		await wrapper.vm.$nextTick();

		// a replay can throw on a later step having already gathered findings from earlier ones
		expect(wrapper.find(`[data-qa="recording-playback-error"]`).exists()).toBe(true);
		expect(wrapper.find(`[data-qa="recording-playback-mismatches"]`).exists()).toBe(true);
	});

	// A session from a newer build replays with its unrecognized steps skipped. That's survivable, but
	// only if the tester knows — otherwise a structurally incomplete run looks like a clean one.
	test(`shows nothing when the session is one this build can read`, () => {
		wrapper = mountWithStatus(`stopped`, `playing`);

		expect(wrapper.find(`[data-qa="recording-playback-schema-warning"]`).exists()).toBe(false);
	});

	test(`warns that a replay may be incomplete when the session came from a newer build`, async () => {
		wrapper = mountWithStatus(`stopped`, `playing`);
		useRecordingStore().playbackSchemaWarning = `This recording was made by a newer version of Eyas (format 9.9.9).`;
		await wrapper.vm.$nextTick();

		const warning = wrapper.find(`[data-qa="recording-playback-schema-warning"]`);
		expect(warning.exists()).toBe(true);
		// the version is what makes it actionable — "something's off" alone isn't worth interrupting for
		expect(warning.text()).toContain(`9.9.9`);
	});

	test(`shows the panel toggle button even when idle (neither recording nor stopped)`, () => {
		wrapper = mountWithStatus(null, null);

		expect(wrapper.find(`[data-qa="btn-recording-panel-toggle"]`).exists()).toBe(true);
	});

	test(`keeps the panel toggle button visible while recording`, () => {
		wrapper = mountWithStatus(`recording`, null);

		expect(wrapper.find(`[data-qa="btn-recording-panel-toggle"]`).exists()).toBe(true);
	});

	test(`toggles the recording store's panel-open flag when clicked`, async () => {
		wrapper = mountWithStatus(null, null);
		const store = useRecordingStore();
		const togglePanel = vi.spyOn(store, `togglePanel`);

		await wrapper.find(`[data-qa="btn-recording-panel-toggle"]`).trigger(`click`);

		expect(togglePanel).toHaveBeenCalled();
	});

	test(`shows the schema warning next to the findings it explains, not instead of them`, async () => {
		wrapper = mountWithStatus(`stopped`, `stopped`);
		const store = useRecordingStore();
		store.playbackSchemaWarning = `Made by a newer version.`;
		store.playbackMismatches = [MISMATCH];
		await wrapper.vm.$nextTick();

		// skipped steps are a plausible *cause* of the mismatches below them, so the two belong together
		expect(wrapper.find(`[data-qa="recording-playback-schema-warning"]`).exists()).toBe(true);
		expect(wrapper.find(`[data-qa="recording-playback-mismatches"]`).exists()).toBe(true);
	});
});
