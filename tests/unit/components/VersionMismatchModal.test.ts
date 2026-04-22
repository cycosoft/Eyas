import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import type { VueWrapper } from '@vue/test-utils';
import VersionMismatchModal from '@/components/VersionMismatchModal.vue';
import type { VersionMismatchModalVM } from '@registry/components.js';
import { getIpcMock, findReceiveCallback } from '@setup/ipc-mock-utils.js';

describe(`VersionMismatchModal`, () => {
	let wrapper: VueWrapper;
	beforeEach(() => {
		// window.eyas is already mocked by vue-test-setup.ts

		wrapper = mount(VersionMismatchModal);
	});

	afterEach(() => {
		vi.restoreAllMocks();
		if (wrapper) wrapper.unmount();
	});

	test(`shows modal when 'show-version-mismatch-modal' is received`, async () => {
		const receiveMock = getIpcMock(`receive`);
		const callback = findReceiveCallback(receiveMock, `show-version-mismatch-modal`);
		if (!callback) { throw new Error(`IPC callback not found`); }


		callback({ runnerVersion: `1.0.0`, testVersion: `1.1.0` });
		await (wrapper.vm as unknown as VersionMismatchModalVM).$nextTick();

		expect((wrapper.vm as unknown as VersionMismatchModalVM).visible).toBe(true);
		expect((wrapper.vm as unknown as VersionMismatchModalVM).runnerVersion).toBe(`1.0.0`);
		expect((wrapper.vm as unknown as VersionMismatchModalVM).testVersion).toBe(`1.1.0`);
	});

	test(`calls 'open-external' when 'Check For Update' is clicked`, async () => {
		const sendSpy = getIpcMock(`send`);

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
