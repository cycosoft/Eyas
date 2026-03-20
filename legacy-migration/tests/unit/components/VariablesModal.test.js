import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import VariablesModal from '@/components/VariablesModal.vue';

describe(`VariablesModal`, () => {
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

	test(`receives link via IPC and displays it`, async () => {
		const testLink = `https://example.com?id={int}`;

		// Simulate IPC receive
		const receiveCallback = mockReceive.mock.calls.find(
			call => call[0] === `show-variables-modal`
		)?.[1];

		if (receiveCallback) {
			receiveCallback(testLink);
			await wrapper.vm.$nextTick();

			expect(wrapper.vm.link).toBe(testLink);
			expect(wrapper.vm.visible).toBe(true);
		}
	});

	test(`validates URLs correctly - valid URL enables launch button`, async () => {
		wrapper.vm.link = `https://example.com`;
		await wrapper.vm.$nextTick();

		// parsedLink should be the same as link when no variables
		expect(wrapper.vm.parsedLink).toBe(`https://example.com`);
		expect(wrapper.vm.linkIsValid).toBe(true);
	});

	test(`validates URLs correctly - invalid URL disables launch button`, async () => {
		wrapper.vm.link = `not-a-valid-url`;
		await wrapper.vm.$nextTick();

		expect(wrapper.vm.parsedLink).toBe(`not-a-valid-url`);
		expect(wrapper.vm.linkIsValid).toBe(false);
	});

	test(`validates URLs correctly - URL with variables disables until filled`, async () => {
		wrapper.vm.link = `https://example.com?id={int}`;
		await wrapper.vm.$nextTick();

		// Should be invalid while variables are not replaced
		expect(wrapper.vm.linkIsValid).toBe(false);

		// Fill in the variable
		wrapper.vm.form = [`123`];
		await wrapper.vm.$nextTick();

		// Should now be valid
		expect(wrapper.vm.parsedLink).toBe(`https://example.com?id=123`);
		expect(wrapper.vm.linkIsValid).toBe(true);
	});

	test(`sends launch-link IPC with parsed URL when launch button clicked`, async () => {
		wrapper.vm.link = `https://example.com`;
		wrapper.vm.visible = true;
		await wrapper.vm.$nextTick();

		// Find and click the launch button
		const launchButton = wrapper.findAll(`button`).find(
			btn => btn.text().includes(`Continue`)
		);

		if (launchButton) {
			await launchButton.trigger(`click`);
			await wrapper.vm.$nextTick();

			// Verify IPC was called with the parsed URL
			expect(mockSend).toHaveBeenCalledWith(`launch-link`, { url: `https://example.com` });
		}
	});

	test(`variable replacement in parsedLink computed property`, async () => {
		wrapper.vm.link = `https://example.com?msg={str}&id={int}`;
		wrapper.vm.form = [`hello`, `456`];
		await wrapper.vm.$nextTick();

		expect(wrapper.vm.parsedLink).toBe(`https://example.com?msg=hello&id=456`);
	});

	test(`form inputs update parsedLink correctly`, async () => {
		wrapper.vm.link = `https://example.com?id={int}`;
		wrapper.vm.visible = true;
		await wrapper.vm.$nextTick();

		// Initially no form data
		expect(wrapper.vm.parsedLink).toContain(`{int}`);

		// Update form
		wrapper.vm.form = [`789`];
		await wrapper.vm.$nextTick();

		expect(wrapper.vm.parsedLink).toBe(`https://example.com?id=789`);
	});

	// -------------------------------------------------------------------------
	// variables computed — type detection
	// -------------------------------------------------------------------------
	describe(`variables computed — type detection`, () => {
		test(`{int} variable is detected with type "int"`, () => {
			wrapper.vm.link = `https://example.com?id={int}`;
			const vars = wrapper.vm.variables;
			expect(vars).toHaveLength(1);
			expect(vars[0].type).toBe(`int`);
		});

		test(`{str} variable is detected with type "str"`, () => {
			wrapper.vm.link = `https://example.com?msg={str}`;
			const vars = wrapper.vm.variables;
			expect(vars).toHaveLength(1);
			expect(vars[0].type).toBe(`str`);
		});

		test(`{bool} variable is detected with type "bool"`, () => {
			wrapper.vm.link = `https://example.com?enabled={bool}`;
			const vars = wrapper.vm.variables;
			expect(vars).toHaveLength(1);
			expect(vars[0].type).toBe(`bool`);
		});

		test(`{opt1|opt2|} list variable is detected with type "list"`, () => {
			wrapper.vm.link = `https://example.com?env={dev.|staging.|}`;
			const vars = wrapper.vm.variables;
			expect(vars).toHaveLength(1);
			expect(vars[0].type).toBe(`list`);
		});

		test(`list variable has correct options array including blank option`, () => {
			wrapper.vm.link = `https://example.com?env={dev.|staging.|}`;
			const vars = wrapper.vm.variables;
			const opts = vars[0].options;
			expect(opts).toContainEqual({ value: `dev.`, title: `dev.` });
			expect(opts).toContainEqual({ value: `staging.`, title: `staging.` });
			// trailing pipe produces a blank entry displayed as {blank}
			expect(opts).toContainEqual({ value: ``, title: `{blank}` });
		});

		test(`multiple variables in one URL produce the correct count and types`, () => {
			wrapper.vm.link = `https://example.com?id={int}&msg={str}&enabled={bool}`;
			const vars = wrapper.vm.variables;
			expect(vars).toHaveLength(3);
			expect(vars[0].type).toBe(`int`);
			expect(vars[1].type).toBe(`str`);
			expect(vars[2].type).toBe(`bool`);
		});
	});

	// -------------------------------------------------------------------------
	// variables computed — field label extraction
	// -------------------------------------------------------------------------
	describe(`variables computed — field label extraction`, () => {
		test(`query-param variable extracts the field name`, () => {
			wrapper.vm.link = `https://example.com?id={int}`;
			const vars = wrapper.vm.variables;
			expect(vars[0].field).toBe(`id`);
		});

		test(`query-param variable with string type extracts field "message"`, () => {
			wrapper.vm.link = `https://example.com?message={str}`;
			const vars = wrapper.vm.variables;
			expect(vars[0].field).toBe(`message`);
		});

		test(`non-query-param variable has no field property`, () => {
			// {int} appearing in a path segment has no ?field= prefix
			wrapper.vm.link = `https://example.com/{int}/page`;
			const vars = wrapper.vm.variables;
			expect(vars[0].field).toBeFalsy();
		});
	});

	// -------------------------------------------------------------------------
	// getFieldLabel method
	// -------------------------------------------------------------------------
	describe(`getFieldLabel method`, () => {
		test(`returns prefix only when no field is provided`, () => {
			expect(wrapper.vm.getFieldLabel(`Enter number`, ``)).toBe(`Enter number`);
			expect(wrapper.vm.getFieldLabel(`Enter number`, undefined)).toBe(`Enter number`);
		});

		test(`returns prefix with field name when field is provided`, () => {
			expect(wrapper.vm.getFieldLabel(`Enter number`, `id`)).toBe(`Enter number for "id" field`);
			expect(wrapper.vm.getFieldLabel(`Select value`, `enabled`)).toBe(`Select value for "enabled" field`);
		});
	});

	// -------------------------------------------------------------------------
	// {bool} and {list} — linkIsValid behavior
	// -------------------------------------------------------------------------
	describe(`bool and list variable link validity`, () => {
		test(`{bool} URL is invalid until a value is selected`, async () => {
			wrapper.vm.link = `https://example.com?enabled={bool}`;
			await wrapper.vm.$nextTick();
			expect(wrapper.vm.linkIsValid).toBe(false);
		});

		test(`{bool} URL becomes valid when "true" is selected`, async () => {
			wrapper.vm.link = `https://example.com?enabled={bool}`;
			wrapper.vm.form = [`true`];
			await wrapper.vm.$nextTick();
			expect(wrapper.vm.parsedLink).toBe(`https://example.com?enabled=true`);
			expect(wrapper.vm.linkIsValid).toBe(true);
		});

		test(`{bool} URL becomes valid when "false" is selected`, async () => {
			wrapper.vm.link = `https://example.com?enabled={bool}`;
			wrapper.vm.form = [`false`];
			await wrapper.vm.$nextTick();
			expect(wrapper.vm.parsedLink).toBe(`https://example.com?enabled=false`);
			expect(wrapper.vm.linkIsValid).toBe(true);
		});

		test(`list variable URL is invalid until an option is selected`, async () => {
			wrapper.vm.link = `https://{dev.|staging.|}cycosoft.com`;
			await wrapper.vm.$nextTick();
			expect(wrapper.vm.linkIsValid).toBe(false);
		});

		test(`list variable URL becomes valid when an option is selected`, async () => {
			wrapper.vm.link = `https://{dev.|staging.|}cycosoft.com`;
			wrapper.vm.form = [`dev.`];
			await wrapper.vm.$nextTick();
			expect(wrapper.vm.parsedLink).toBe(`https://dev.cycosoft.com`);
			expect(wrapper.vm.linkIsValid).toBe(true);
		});

		test(`list variable URL becomes valid when blank option is selected`, async () => {
			wrapper.vm.link = `https://{dev.|staging.|}cycosoft.com`;
			wrapper.vm.form = [``];
			await wrapper.vm.$nextTick();
			expect(wrapper.vm.parsedLink).toBe(`https://cycosoft.com`);
			expect(wrapper.vm.linkIsValid).toBe(true);
		});
	});

	// -------------------------------------------------------------------------
	// {testdomain} variable behavior
	// -------------------------------------------------------------------------
	describe(`testdomain variable behavior`, () => {
		test(`{testdomain} is NOT in the variables list when pre-resolved before modal opens`, () => {
			// Normal flow: navigateVariable() replaces {testdomain} before calling uiEvent('show-variables-modal', ...)
			// So the modal only ever receives a URL where {testdomain} is already gone.
			wrapper.vm.link = `https://staging.example.com?enabled={bool}`;
			const vars = wrapper.vm.variables;
			// Only {bool} remains — {testdomain} was already substituted
			expect(vars).toHaveLength(1);
			expect(vars[0].type).toBe(`bool`);
		});

		test(`{testdomain} only — pre-resolved URL with no other variables is immediately valid`, async () => {
			// After substitution, {testdomain}?go → https://staging.example.com?go
			wrapper.vm.link = `https://staging.example.com?go`;
			await wrapper.vm.$nextTick();
			expect(wrapper.vm.linkIsValid).toBe(true);
		});

		test(`if {testdomain} somehow reaches the modal it is treated as a generic variable token`, () => {
			// Documents what happens if the guard in navigateVariable() is bypassed:
			// the modal will identify it as an unknown type (not int/str/bool, no pipe) and
			// treat it like a string-ish custom token.
			wrapper.vm.link = `https://example.com/{testdomain}/path`;
			const vars = wrapper.vm.variables;
			expect(vars).toHaveLength(1);
			// type will be 'testdomain' (the raw token content) — not list/bool/int/str
			expect(vars[0].type).toBe(`testdomain`);
		});
	});

	// -------------------------------------------------------------------------
	// parsedLink — URI encoding behavior
	// -------------------------------------------------------------------------
	describe(`parsedLink URI encoding`, () => {
		test(`spaces in string values are percent-encoded`, async () => {
			wrapper.vm.link = `https://example.com?msg={str}`;
			wrapper.vm.form = [`hello world`];
			await wrapper.vm.$nextTick();
			expect(wrapper.vm.parsedLink).toBe(`https://example.com?msg=hello%20world`);
		});

		test(`special characters in string values are percent-encoded`, async () => {
			wrapper.vm.link = `https://example.com?q={str}`;
			wrapper.vm.form = [`foo&bar`];
			await wrapper.vm.$nextTick();
			expect(wrapper.vm.parsedLink).toBe(`https://example.com?q=foo%26bar`);
		});

		test(`empty string value replaces the variable with nothing`, async () => {
			wrapper.vm.link = `https://example.com?q={str}`;
			wrapper.vm.form = [``];
			await wrapper.vm.$nextTick();
			// empty string is falsy but '' === '' is true, so it should still replace
			expect(wrapper.vm.parsedLink).toBe(`https://example.com?q=`);
		});
	});

	// -------------------------------------------------------------------------
	// underscore-prefix (_env) variable behavior
	// -------------------------------------------------------------------------
	describe(`underscore-prefix (_env) variable behavior`, () => {
		test(`{_env.url} pre-resolved URL has no variables and is immediately valid`, async () => {
			// Normal flow: navigateVariable() replaces {_env.url} before calling uiEvent
			wrapper.vm.link = `https://staging.eyas.cycosoft.com?go`;
			await wrapper.vm.$nextTick();
			expect(wrapper.vm.variables).toHaveLength(0);
			expect(wrapper.vm.linkIsValid).toBe(true);
		});

		test(`{_env.key} pre-resolved URL has no variables and is immediately valid`, async () => {
			wrapper.vm.link = `https://staging.cycosoft.com`;
			await wrapper.vm.$nextTick();
			expect(wrapper.vm.variables).toHaveLength(0);
			expect(wrapper.vm.linkIsValid).toBe(true);
		});

		test(`{_env.url} token reaching the modal is treated as an unknown app token, not user-input`, () => {
			// Documents behavior if the substitution guard is somehow bypassed
			wrapper.vm.link = `https://example.com/{_env.url}/path`;
			const vars = wrapper.vm.variables;
			// Should NOT be in variables list (filtered by underscore prefix)
			expect(vars.every(v => !v.type.startsWith(`_`))).toBe(true);
		});

		test(`{_env.key} token reaching the modal is treated as an unknown app token, not user-input`, () => {
			wrapper.vm.link = `https://{_env.key}example.com`;
			const vars = wrapper.vm.variables;
			// Should NOT be in variables list (filtered by underscore prefix)
			expect(vars.every(v => !v.type.startsWith(`_`))).toBe(true);
		});

		test(`after {_env.url} and {_env.key} resolved, only remaining user vars appear in modal`, async () => {
			// Simulates the URL after substituteEnvVariables() has run
			wrapper.vm.link = `https://staging.eyas.cycosoft.com?env=staging.&enabled={bool}`;
			await wrapper.vm.$nextTick();
			const vars = wrapper.vm.variables;
			expect(vars).toHaveLength(1);
			expect(vars[0].type).toBe(`bool`);

			wrapper.vm.form = [`true`];
			await wrapper.vm.$nextTick();
			expect(wrapper.vm.linkIsValid).toBe(true);
		});
	});
});
