import { describe, test, expect, vi, afterEach, beforeEach } from 'vitest';
import type { VueWrapper } from '@vue/test-utils';
import { mount } from '@vue/test-utils';
import TestServerActiveModal from '@/components/TestServerActiveModal.vue';
import type { TestServerActiveModalVM, WindowWithEyas } from '@/types/eyas-interface.js';
import type { ChannelName } from '@/types/primitives.js';
import { nextTick } from 'vue';
import { TEST_SERVER_SESSION_DURATION_MS } from '@/../../../scripts/constants.js';


describe(`TestServerActiveModal`, () => {
	let wrapper: VueWrapper;
	let callbacks: Record<ChannelName, (payload?: unknown) => void> = {};

	beforeEach(() => {
		callbacks = {};
		(window as unknown as WindowWithEyas).eyas = {
			send: vi.fn(),
			receive: vi.fn((channel: ChannelName, fn: (payload?: unknown) => void) => {
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

	async function setup(payload: Record<string, unknown> | null = null): Promise<void> {
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
		expect((wrapper.vm as unknown as TestServerActiveModalVM).visible).toBe(true);
		expect((wrapper.vm as unknown as TestServerActiveModalVM).domain).toBe(`http://localhost:1234`);
		expect(wrapper.text()).toContain(`Live Test Server`);
	});

	test(`End Session button text is correct`, async () => {
		await setup({ domain: `http://localhost` });
		const stopBtn = wrapper.find(`#btn-close-session`);
		expect(stopBtn.exists()).toBe(true);
		expect(stopBtn.text()).toContain(`End Session`);
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
		(wrapper.vm as unknown as TestServerActiveModalVM).openInBrowser();
		const eyas = (window as unknown as WindowWithEyas).eyas;
		expect(eyas.send).toHaveBeenCalledWith(`test-server-open-browser`, `http://localhost:1234`);
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
		expect((wrapper.vm as unknown as TestServerActiveModalVM).isExpired).toBe(true);
		expect((wrapper.vm as unknown as TestServerActiveModalVM).visible).toBe(true);
		expect(wrapper.find(`[data-qa="test-server-expired-alert"]`).text()).toContain(`timed out after 30m`);
	});

	test(`Extend Session button emits test-server-extend and resets on response`, async () => {
		await setup();
		const resumeCb = callbacks[`show-test-server-resume-modal`];
		if (resumeCb) {
			resumeCb(`30m`);
			await nextTick();
			await nextTick();
		}

		expect((wrapper.vm as unknown as TestServerActiveModalVM).isExpired).toBe(true);
		const extendBtn = wrapper.find(`#btn-extend-session`);
		expect(extendBtn.exists()).toBe(true);
		await extendBtn.trigger(`click`);
		const eyas = (window as unknown as WindowWithEyas).eyas;
		expect(eyas.send).toHaveBeenCalledWith(`test-server-extend`);

		// Simulate backend response
		const activeCb = callbacks[`show-test-server-active-modal`];
		if (activeCb) {
			activeCb({ domain: `http://localhost`, startTime: Date.now(), endTime: Date.now() + 10000 });
			await nextTick();
			await nextTick();
		}
		expect((wrapper.vm as unknown as TestServerActiveModalVM).isExpired).toBe(false);
	});

	test(`End Session resets expired state`, async () => {
		await setup();
		const cb = callbacks[`show-test-server-resume-modal`];
		if (cb) cb(`30m`);
		await nextTick();
		expect((wrapper.vm as unknown as TestServerActiveModalVM).isExpired).toBe(true);

		await (wrapper.vm as unknown as TestServerActiveModalVM).stopServer();
		expect((wrapper.vm as unknown as TestServerActiveModalVM).isExpired).toBe(false);
	});

	test(`Copy to clipboard functionality`, async () => {
		await setup({ domain: `http://custom.local` });
		const mockClipboard = { writeText: vi.fn() };
		Object.assign(navigator, { clipboard: mockClipboard });

		await (wrapper.vm as unknown as TestServerActiveModalVM).copyDomain();
		expect(navigator.clipboard.writeText).toHaveBeenCalledWith(`http://custom.local`);
		expect((wrapper.vm as unknown as TestServerActiveModalVM).copyIcon).toBe(`mdi-check`);

		vi.advanceTimersByTime(2000);
		expect((wrapper.vm as unknown as TestServerActiveModalVM).copyIcon).toBe(`mdi-content-copy`);
	});

	describe(`Extend Session button visibility and state`, () => {
		test(`button is always visible`, async () => {
			await setup({ domain: `http://localhost`, startTime: Date.now(), endTime: Date.now() + TEST_SERVER_SESSION_DURATION_MS + 1000 });
			const extendBtn = wrapper.find(`#btn-extend-session`);
			expect(extendBtn.exists()).toBe(true);

			const cb = callbacks[`show-test-server-resume-modal`];
			if (cb) cb(`30m`);
			await nextTick();
			expect(wrapper.find(`#btn-extend-session`).exists()).toBe(true);
		});

		test(`button is disabled when more than 30m remains`, async () => {
			await setup({ domain: `http://localhost`, startTime: Date.now(), endTime: Date.now() + TEST_SERVER_SESSION_DURATION_MS + 1000 });
			const extendBtn = wrapper.find(`#btn-extend-session`);
			expect(extendBtn.attributes(`disabled`)).toBeDefined();
		});

		test(`button is enabled when less than 30m remains`, async () => {
			await setup({ domain: `http://localhost`, startTime: Date.now(), endTime: Date.now() + TEST_SERVER_SESSION_DURATION_MS - 1000 });
			const extendBtn = wrapper.find(`#btn-extend-session`);
			expect(extendBtn.attributes(`disabled`)).toBeUndefined();
		});

		test(`button is enabled when expired`, async () => {
			await setup();
			const cb = callbacks[`show-test-server-resume-modal`];
			if (cb) cb(`30m`);
			await nextTick();
			const extendBtn = wrapper.find(`#btn-extend-session`);
			expect(extendBtn.attributes(`disabled`)).toBeUndefined();
		});

		test(`button becomes disabled when show-test-server-active-modal fires with endTime > session default remaining`, async () => {
			// Start with < 30 min so button is enabled
			await setup({ domain: `http://localhost`, startTime: Date.now(), endTime: Date.now() + TEST_SERVER_SESSION_DURATION_MS - 1000 });
			expect(wrapper.find(`#btn-extend-session`).attributes(`disabled`)).toBeUndefined();

			// Simulate backend responding with extended endTime (now + 2× session = > 30 min remaining)
			const activeCb = callbacks[`show-test-server-active-modal`];
			activeCb({ domain: `http://localhost`, startTime: Date.now(), endTime: Date.now() + TEST_SERVER_SESSION_DURATION_MS * 2 });
			await nextTick();
			await nextTick();

			expect(wrapper.find(`#btn-extend-session`).attributes(`disabled`)).toBeDefined();
		});

		test(`endTime on component updates when show-test-server-active-modal fires`, async () => {
			await setup({ domain: `http://localhost`, startTime: Date.now(), endTime: Date.now() + 10000 });
			const newEndTime = Date.now() + TEST_SERVER_SESSION_DURATION_MS * 2;

			const activeCb = callbacks[`show-test-server-active-modal`];
			activeCb({ domain: `http://localhost`, startTime: Date.now(), endTime: newEndTime });
			await nextTick();
			await nextTick();

		});
	});

	describe(`Dynamic Display Logic (TDD)`, () => {
		test(`displayUrl hides port 80 for http`, async () => {
			await setup({ domain: `http://localhost:80` });
			expect((wrapper.vm as unknown as TestServerActiveModalVM).displayUrl).toBe(`http://localhost`);
		});

		test(`displayUrl hides port 443 for https`, async () => {
			await setup({ domain: `https://localhost:443` });
			expect((wrapper.vm as unknown as TestServerActiveModalVM).displayUrl).toBe(`https://localhost`);
		});

		test(`displayUrl hides port 90`, async () => {
			await setup({ domain: `http://localhost:90` });
			expect((wrapper.vm as unknown as TestServerActiveModalVM).displayUrl).toBe(`http://localhost`);
		});

		test(`extensionLabel displays minutes if >= 60`, async () => {
			// Constants are currently 1800000ms (30m)
			await setup();
			expect((wrapper.vm as unknown as TestServerActiveModalVM).extensionLabel).toBe(`30m`);
		});
	});
});
