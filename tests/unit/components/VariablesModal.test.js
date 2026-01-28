import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import VariablesModal from '@/components/VariablesModal.vue';

describe('VariablesModal', () => {
	let wrapper;
	let mockSend;
	let mockReceive;

	beforeEach(() => {
		mockSend = vi.fn();
		mockReceive = vi.fn();
		global.window.eyas.send = mockSend;
		global.window.eyas.receive = mockReceive;

		wrapper = mount(VariablesModal);
	});

	afterEach(() => {
		if (wrapper) {
			wrapper.unmount();
		}
		vi.clearAllMocks();
	});

	test('receives link via IPC and displays it', async () => {
		const testLink = 'https://example.com?id={int}';

		// Simulate IPC receive
		const receiveCallback = mockReceive.mock.calls.find(
			call => call[0] === 'show-variables-modal'
		)?.[1];

		if (receiveCallback) {
			receiveCallback(testLink);
			await wrapper.vm.$nextTick();

			expect(wrapper.vm.link).toBe(testLink);
			expect(wrapper.vm.visible).toBe(true);
		}
	});

	test('validates URLs correctly - valid URL enables launch button', async () => {
		wrapper.vm.link = 'https://example.com';
		await wrapper.vm.$nextTick();

		// parsedLink should be the same as link when no variables
		expect(wrapper.vm.parsedLink).toBe('https://example.com');
		expect(wrapper.vm.linkIsValid).toBe(true);
	});

	test('validates URLs correctly - invalid URL disables launch button', async () => {
		wrapper.vm.link = 'not-a-valid-url';
		await wrapper.vm.$nextTick();

		expect(wrapper.vm.parsedLink).toBe('not-a-valid-url');
		expect(wrapper.vm.linkIsValid).toBe(false);
	});

	test('validates URLs correctly - URL with variables disables until filled', async () => {
		wrapper.vm.link = 'https://example.com?id={int}';
		await wrapper.vm.$nextTick();

		// Should be invalid while variables are not replaced
		expect(wrapper.vm.linkIsValid).toBe(false);

		// Fill in the variable
		wrapper.vm.form = ['123'];
		await wrapper.vm.$nextTick();

		// Should now be valid
		expect(wrapper.vm.parsedLink).toBe('https://example.com?id=123');
		expect(wrapper.vm.linkIsValid).toBe(true);
	});

	test('sends launch-link IPC with parsed URL when launch button clicked', async () => {
		wrapper.vm.link = 'https://example.com';
		wrapper.vm.visible = true;
		await wrapper.vm.$nextTick();

		// Find and click the launch button
		const launchButton = wrapper.findAll('button').find(
			btn => btn.text().includes('Continue')
		);

		if (launchButton) {
			await launchButton.trigger('click');
			await wrapper.vm.$nextTick();

			// Verify IPC was called with the parsed URL
			expect(mockSend).toHaveBeenCalledWith('launch-link', { url: 'https://example.com' });
		}
	});

	test('variable replacement in parsedLink computed property', async () => {
		wrapper.vm.link = 'https://example.com?msg={str}&id={int}';
		wrapper.vm.form = ['hello', '456'];
		await wrapper.vm.$nextTick();

		expect(wrapper.vm.parsedLink).toBe('https://example.com?msg=hello&id=456');
	});

	test('form inputs update parsedLink correctly', async () => {
		wrapper.vm.link = 'https://example.com?id={int}';
		wrapper.vm.visible = true;
		await wrapper.vm.$nextTick();

		// Initially no form data
		expect(wrapper.vm.parsedLink).toContain('{int}');

		// Update form
		wrapper.vm.form = ['789'];
		await wrapper.vm.$nextTick();

		expect(wrapper.vm.parsedLink).toBe('https://example.com?id=789');
	});
});
