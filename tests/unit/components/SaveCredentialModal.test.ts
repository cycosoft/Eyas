import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import type { VueWrapper } from '@vue/test-utils';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import SaveCredentialModal from '@/components/SaveCredentialModal.vue';
import type { Mock } from 'vitest';
import type { WindowWithEyas } from '@registry/ipc.js';
import type { SaveCredentialModalVM } from '@registry/components.js';

describe(`SaveCredentialModal`, () => {
	let wrapper: VueWrapper;
	let mockSend: Mock;
	let mockReceive: Mock;

	beforeEach(() => {
		setActivePinia(createPinia());
		mockSend = vi.fn();
		mockReceive = vi.fn();
		const eyas = (window as unknown as WindowWithEyas).eyas;
		eyas.send = mockSend;
		eyas.receive = mockReceive;

		wrapper = mount(SaveCredentialModal);
	});

	afterEach(() => {
		if (wrapper) { wrapper.unmount(); }
		vi.clearAllMocks();
	});

	test(`modal is hidden by default`, () => {
		expect((wrapper.vm as unknown as SaveCredentialModalVM).visible).toBe(false);
	});

	test(`listens for show-save-credential-modal IPC and sets visible = true`, () => {
		const call = mockReceive.mock.calls.find(c => c[0] === `show-save-credential-modal`);
		if (!call) throw new Error(`call not found`);
		expect(call).toBeDefined();

		const credentialPayload = {
			origin: `https://test.eyas`,
			username: `user1`,
			passwordPlain: `pass123`
		};

		call[1](credentialPayload);
		expect((wrapper.vm as unknown as SaveCredentialModalVM).visible).toBe(true);
		expect((wrapper.vm as unknown as SaveCredentialModalVM).credential).toEqual(credentialPayload);
	});

	test(`save sends save-credential-confirm IPC and closes modal`, () => {
		const vm = wrapper.vm as unknown as SaveCredentialModalVM;
		vm.credential = {
			origin: `https://test.eyas`,
			username: `user1`,
			passwordPlain: `pass123`
		};
		vm.visible = true;

		vm.save();

		expect(mockSend).toHaveBeenCalledWith(`save-credential-confirm`, {
			origin: `https://test.eyas`,
			username: `user1`,
			passwordPlain: `pass123`
		});
		expect(vm.visible).toBe(false);
	});

	test(`cancel closes modal without sending IPC`, () => {
		const vm = wrapper.vm as unknown as SaveCredentialModalVM;
		vm.credential = {
			origin: `https://test.eyas`,
			username: `user1`,
			passwordPlain: `pass123`
		};
		vm.visible = true;

		vm.cancel();

		expect(mockSend).not.toHaveBeenCalled();
		expect(vm.visible).toBe(false);
	});
});
