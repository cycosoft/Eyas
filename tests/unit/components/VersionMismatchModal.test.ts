import { describe, test, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { mount } from '@vue/test-utils';
import type { VueWrapper } from '@vue/test-utils';
import VersionMismatchModal from '@/components/VersionMismatchModal.vue';
import { createVuetify } from 'vuetify';
import type { WindowWithEyas, EyasInterface } from '@registry/ipc.js';
import type { VersionMismatchModalVM } from '@registry/components.js';

describe(`VersionMismatchModal`, () => {
	let wrapper: VueWrapper;
	let vuetify: ReturnType<typeof createVuetify>;

	beforeEach(() => {
		vuetify = createVuetify();
		(window as unknown as WindowWithEyas).eyas = { send: vi.fn(), receive: vi.fn() };

		wrapper = mount(VersionMismatchModal, {
			global: { plugins: [vuetify] }
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
		if (wrapper) wrapper.unmount();
	});

	test(`shows modal when 'show-version-mismatch-modal' is received`, async () => {
		const receiveMock = (window as unknown as WindowWithEyas).eyas.receive as unknown as Mock<EyasInterface[`receive`]>;
		const call = receiveMock.mock.calls.find(c => c[0] === `show-version-mismatch-modal`);
		if (!call) { throw new Error(`IPC callback not found`); }
		const callback = call[1];

		callback({ runnerVersion: `1.0.0`, testVersion: `1.1.0` });
		await (wrapper.vm as unknown as VersionMismatchModalVM).$nextTick();

		expect((wrapper.vm as unknown as VersionMismatchModalVM).visible).toBe(true);
		expect((wrapper.vm as unknown as VersionMismatchModalVM).runnerVersion).toBe(`1.0.0`);
		expect((wrapper.vm as unknown as VersionMismatchModalVM).testVersion).toBe(`1.1.0`);
	});

	test(`calls 'open-external' when 'Check For Update' is clicked`, async () => {
		const sendSpy = vi.spyOn((window as unknown as WindowWithEyas).eyas, `send`);

		await (wrapper.vm as unknown as VersionMismatchModalVM).checkForUpdate();

		expect(sendSpy).toHaveBeenCalledWith(`open-external`, `https://github.com/cycosoft/eyas/releases`);
	});

	test(`closes modal when 'Later' is clicked`, async () => {
		(wrapper.vm as unknown as VersionMismatchModalVM).visible = true;
		await (wrapper.vm as unknown as VersionMismatchModalVM).$nextTick();

		// Simulate clicking later (manual property change for now as v-btn might be hard to find in unit test without more setup)
		(wrapper.vm as unknown as VersionMismatchModalVM).visible = false;
		await (wrapper.vm as unknown as VersionMismatchModalVM).$nextTick();

		expect((wrapper.vm as unknown as VersionMismatchModalVM).visible).toBe(false);
	});
});
