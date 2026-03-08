import { describe, test, expect, vi, afterEach, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import TestServerActiveModal from '@/components/TestServerActiveModal.vue';
import { nextTick } from 'vue';

describe(`TestServerActiveModal`, () => {
	let wrapper;
	let callbacks = {};

	beforeEach(() => {
		callbacks = {};
		global.window.eyas = {
			send: vi.fn(),
			receive: vi.fn((channel, fn) => {
				callbacks[channel] = fn;
			})
		};
		vi.useFakeTimers();
	});

	afterEach(() => {
		if (wrapper) wrapper.unmount();
		vi.clearAllMocks();
		vi.useRealTimers();
	});

	async function setup(payload = null) {
		wrapper = mount(TestServerActiveModal, {
			global: {
				stubs: {
					ModalWrapper: {
						template: `<div v-if="modelValue"><slot /></div>`,
						props: [`modelValue`],
						methods: {
							pinDialogWidth: vi.fn()
						}
					}
				}
			}
		});
		await nextTick();

		if (payload) {
			const cb = callbacks[`show-test-server-active-modal`];
			if (cb) {
				cb(payload);
				await nextTick();
				await nextTick();
			}
		}
	}

	test(`receives show-test-server-active-modal and displays modal`, async () => {
		await setup({ domain: `http://localhost:1234`, startTime: Date.now(), endTime: Date.now() + 10000 });
		expect(wrapper.vm.visible).toBe(true);
		expect(wrapper.vm.domain).toBe(`http://localhost:1234`);
		expect(wrapper.text()).toContain(`Live Test Server`);
	});

	test(`Close Session button text is correct`, async () => {
		await setup({ domain: `http://localhost` });
		const stopBtn = wrapper.find(`#btn-close-session`);
		expect(stopBtn.exists()).toBe(true);
		expect(stopBtn.text()).toMatch(/close session/i);
	});

	test(`Open in Browser button is disabled when expired`, async () => {
		await setup();
		const cb = callbacks[`show-test-server-resume-modal`];
		if (cb) {
			cb(`30m`);
			await nextTick();
			await nextTick();
		}
		const openBtn = wrapper.find(`#btn-open-in-browser`);
		expect(openBtn.attributes(`disabled`)).toBeDefined();
	});

	test(`Open in Browser button emits test-server-open-browser with domain`, async () => {
		await setup({ domain: `http://localhost:1234`, startTime: 0, endTime: 1000 });
		wrapper.vm.openInBrowser();
		expect(global.window.eyas.send).toHaveBeenCalledWith(`test-server-open-browser`, `http://localhost:1234`);
	});

	test(`Open in Browser button is disabled when expired`, async () => {
		await setup();
		const cb = callbacks[`show-test-server-resume-modal`];
		if (cb) {
			cb(`30m`);
			await nextTick();
			await nextTick();
		}
		const openBtn = wrapper.find(`#btn-open-in-browser`);
		expect(openBtn.attributes(`disabled`)).toBeDefined();
	});

	test(`handles show-test-server-resume-modal and enters expired state`, async () => {
		await setup();
		const cb = callbacks[`show-test-server-resume-modal`];
		if (cb) {
			cb(`30m`);
			await nextTick();
			await nextTick();
		}
		expect(wrapper.vm.isExpired).toBe(true);
		expect(wrapper.vm.visible).toBe(true);
		expect(wrapper.text()).toContain(`session has timed out after 30m`);
	});

	test(`Extend Session button emits test-server-extend and resets on response`, async () => {
		await setup();
		const resumeCb = callbacks[`show-test-server-resume-modal`];
		if (resumeCb) {
			resumeCb(`30m`);
			await nextTick();
			await nextTick();
		}

		expect(wrapper.vm.isExpired).toBe(true);
		const extendBtn = wrapper.find(`#btn-extend-session`);
		expect(extendBtn.exists()).toBe(true);
		await extendBtn.trigger(`click`);
		expect(global.window.eyas.send).toHaveBeenCalledWith(`test-server-extend`);

		// Simulate backend response
		const activeCb = callbacks[`show-test-server-active-modal`];
		if (activeCb) {
			activeCb({ domain: `http://localhost`, startTime: Date.now(), endTime: Date.now() + 10000 });
			await nextTick();
			await nextTick();
		}
		expect(wrapper.vm.isExpired).toBe(false);
	});

	test(`Close Session resets expired state`, async () => {
		await setup();
		const cb = callbacks[`show-test-server-resume-modal`];
		if (cb) cb(`30m`);
		await nextTick();
		expect(wrapper.vm.isExpired).toBe(true);

		await wrapper.vm.stopServer();
		expect(wrapper.vm.isExpired).toBe(false);
	});

	test(`Copy to clipboard functionality`, async () => {
		await setup({ domain: `http://custom.local` });
		const mockClipboard = { writeText: vi.fn() };
		Object.assign(navigator, { clipboard: mockClipboard });

		await wrapper.vm.copyDomain();
		expect(navigator.clipboard.writeText).toHaveBeenCalledWith(`http://custom.local`);
		expect(wrapper.vm.copyIcon).toBe(`mdi-check`);

		vi.advanceTimersByTime(2000);
		expect(wrapper.vm.copyIcon).toBe(`mdi-content-copy`);
	});
});
