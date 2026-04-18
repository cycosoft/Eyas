import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import type { VueWrapper } from '@vue/test-utils';
import type { Mock } from 'vitest';
import EnvironmentModal from '@/components/EnvironmentModal.vue';

interface ComponentVM {
	domains: unknown[];
	visible: boolean;
	choose: (domain: unknown, index: number) => void;
	alwaysChoose: boolean;
	projectId: string;
	domainsHash: string;
	onAlwaysChooseChange: (value: boolean) => void;
	$nextTick: () => Promise<void>;
	$options: { mounted?: Array<() => void> } & Record<string, unknown>;
}

describe(`EnvironmentModal`, () => {
	let wrapper: VueWrapper;
	let mockSend: Mock;
	let mockReceive: Mock;

	beforeEach(() => {
		mockSend = vi.fn();
		mockReceive = vi.fn();
		const eyas = (window as unknown as { eyas: { send: Mock; receive: Mock } }).eyas;
		eyas.send = mockSend;
		eyas.receive = mockReceive;

		wrapper = mount(EnvironmentModal);
	});

	afterEach(() => {
		if (wrapper) {
			wrapper.unmount();
		}
		vi.clearAllMocks();
	});

	test(`receives domains via IPC and displays them`, async () => {
		const domains = [
			{ url: `https://example.com`, title: `Example` },
			{ url: `test.com`, title: `Test` }
		];

		// Simulate IPC receive - call the callback that was registered in mounted()
		// The component registers: window.eyas?.receive('show-environment-modal', domains => {...})
		const receiveCallback = (wrapper.vm as unknown as ComponentVM).$options.mounted?.[0] ||
			((): void => {
				// Manually trigger the IPC receive
				const eyas = (window as unknown as { eyas: { receive: Mock } }).eyas;
				if (eyas.receive.mock.calls.length > 0) {
					const call = eyas.receive.mock.calls.find(
						c => c[0] === `show-environment-modal`
					);
					if (call && call[1]) {
						call[1](domains);
					}
				}
			});

		// Trigger the receive callback
		if (typeof receiveCallback === `function`) {
			receiveCallback();
		} else {
			// Directly set the data to test the component state
			(wrapper.vm as unknown as ComponentVM).domains = domains;
			(wrapper.vm as unknown as ComponentVM).visible = true;
		}

		await (wrapper.vm as unknown as ComponentVM).$nextTick();

		expect((wrapper.vm as unknown as ComponentVM).domains).toEqual(domains);
		expect((wrapper.vm as unknown as ComponentVM).visible).toBe(true);
	});

	test(`sends environment-selected IPC with URL when button clicked`, async () => {
		const domains = [
			{ url: `https://example.com`, title: `Example` }
		];

		// Set up the component with domains
		(wrapper.vm as unknown as ComponentVM).domains = domains;
		(wrapper.vm as unknown as ComponentVM).visible = true;
		await (wrapper.vm as unknown as ComponentVM).$nextTick();

		// Call choose method directly to test IPC sending
		(wrapper.vm as unknown as ComponentVM).choose(domains[0].url, 0);

		// Wait for setTimeout in choose method
		await new Promise(resolve => setTimeout(resolve, 250));

		// Verify IPC was called with the URL
		expect(mockSend).toHaveBeenCalledWith(`environment-selected`, `https://example.com`);
	});

	test(`sends URL without protocol correctly`, async () => {
		const domains = [
			{ url: `example.com`, title: `Example` }
		];

		(wrapper.vm as unknown as ComponentVM).domains = domains;
		(wrapper.vm as unknown as ComponentVM).visible = true;
		await (wrapper.vm as unknown as ComponentVM).$nextTick();

		// Call choose method directly to test IPC sending
		(wrapper.vm as unknown as ComponentVM).choose(domains[0].url, 0);

		await new Promise(resolve => setTimeout(resolve, 250));

		// URL without protocol should be sent as-is (parseURL will handle it in main process)
		expect(mockSend).toHaveBeenCalledWith(`environment-selected`, `example.com`);
	});

	test(`modal shows and hides correctly`, async () => {
		expect((wrapper.vm as unknown as ComponentVM).visible).toBe(false);

		const domains = [{ url: `https://example.com`, title: `Example` }];

		// Directly set the component state to test visibility
		(wrapper.vm as unknown as ComponentVM).domains = domains;
		(wrapper.vm as unknown as ComponentVM).visible = true;
		await (wrapper.vm as unknown as ComponentVM).$nextTick();
		expect((wrapper.vm as unknown as ComponentVM).visible).toBe(true);

		(wrapper.vm as unknown as ComponentVM).visible = false;
		await (wrapper.vm as unknown as ComponentVM).$nextTick();
		expect((wrapper.vm as unknown as ComponentVM).visible).toBe(false);
	});

	// -------------------------------------------------------------------------
	// _env: domain object IPC contract
	// Verifies that choose() sends the full domain object (not just url),
	// so the main process has access to domain.key for {_env.key} substitution.
	// -------------------------------------------------------------------------
	describe(`domain object IPC contract (_env support)`, () => {
		test(`choose() sends full domain object via environment-selected IPC`, async () => {
			const domains = [
				{ url: `https://dev.eyas.cycosoft.com`, title: `Development`, key: `dev.` }
			];

			(wrapper.vm as unknown as ComponentVM).domains = domains;
			(wrapper.vm as unknown as ComponentVM).visible = true;
			await (wrapper.vm as unknown as ComponentVM).$nextTick();

			(wrapper.vm as unknown as ComponentVM).choose(domains[0], 0);
			await new Promise(resolve => setTimeout(resolve, 250));

			expect(mockSend).toHaveBeenCalledWith(
				`environment-selected`,
				{ url: `https://dev.eyas.cycosoft.com`, title: `Development`, key: `dev.` }
			);
		});

		test(`choose() sends domain object without key when key is absent`, async () => {
			const domains = [
				{ url: `https://eyas.cycosoft.com`, title: `Production` }
			];

			(wrapper.vm as unknown as ComponentVM).domains = domains;
			(wrapper.vm as unknown as ComponentVM).visible = true;
			await (wrapper.vm as unknown as ComponentVM).$nextTick();

			(wrapper.vm as unknown as ComponentVM).choose(domains[0], 0);
			await new Promise(resolve => setTimeout(resolve, 250));

			// key is undefined — main process treats it as "" for {_env.key} substitution
			expect(mockSend).toHaveBeenCalledWith(
				`environment-selected`,
				{ url: `https://eyas.cycosoft.com`, title: `Production`, key: undefined }
			);
		});
	});

	// -------------------------------------------------------------------------
	// Settings -- "always choose" checkbox and save-setting IPC
	// -------------------------------------------------------------------------
	describe(`settings integration`, () => {
		test(`alwaysChoose initialises to false by default`, () => {
			expect((wrapper.vm as unknown as ComponentVM).alwaysChoose).toBe(false);
		});

		test(`show-environment-modal payload sets alwaysChoose`, () => {
			// Simulate the IPC receive callback
			const call = mockReceive.mock.calls.find(c => c[0] === `show-environment-modal`);
			if (!call) throw new Error(`call not found`);
			call[1]([], { alwaysChoose: true, projectId: `proj-x`, domainsHash: `abc` });
			expect((wrapper.vm as unknown as ComponentVM).alwaysChoose).toBe(true);
			expect((wrapper.vm as unknown as ComponentVM).projectId).toBe(`proj-x`);
			expect((wrapper.vm as unknown as ComponentVM).domainsHash).toBe(`abc`);
		});

		test(`onAlwaysChooseChange sends save-setting with correct projectId`, () => {
			(wrapper.vm as unknown as ComponentVM).projectId = `proj-y`;
			(wrapper.vm as unknown as ComponentVM).onAlwaysChooseChange(true);
			expect(mockSend).toHaveBeenCalledWith(`save-setting`, {
				key: `env.alwaysChoose`,
				value: true,
				projectId: `proj-y`
			});
		});

		test(`choose() sends save-setting for env.lastChoice`, async () => {
			const domain = { url: `https://example.com`, title: `Example` };
			(wrapper.vm as unknown as ComponentVM).domains = [domain];
			(wrapper.vm as unknown as ComponentVM).projectId = `proj-z`;
			(wrapper.vm as unknown as ComponentVM).visible = true;
			await (wrapper.vm as unknown as ComponentVM).$nextTick();

			(wrapper.vm as unknown as ComponentVM).choose(domain, 0);

			// save-setting is sent before the setTimeout delay
			expect(mockSend).toHaveBeenCalledWith(`save-setting`, expect.objectContaining({
				key: `env.lastChoice`,
				projectId: `proj-z`
			}));
		});

		test(`choose() sends save-setting for env.lastChoiceHash`, async () => {
			const domain = { url: `https://example.com`, title: `Example` };
			(wrapper.vm as unknown as ComponentVM).domains = [domain];
			(wrapper.vm as unknown as ComponentVM).domainsHash = `deadbeef`;
			(wrapper.vm as unknown as ComponentVM).projectId = `proj-z`;
			(wrapper.vm as unknown as ComponentVM).visible = true;
			await (wrapper.vm as unknown as ComponentVM).$nextTick();

			(wrapper.vm as unknown as ComponentVM).choose(domain, 0);

			expect(mockSend).toHaveBeenCalledWith(`save-setting`, {
				key: `env.lastChoiceHash`,
				value: `deadbeef`,
				projectId: `proj-z`
			});
		});
	});
});
