import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import type { VueWrapper } from '@vue/test-utils';
import { mount } from '@vue/test-utils';
import VariablesModal from '@/components/VariablesModal.vue';
import type { Mock } from 'vitest';
import type { VariablesModalVM, WindowWithEyas, VariableItem } from '@/types/eyas-interface.js';


describe(`VariablesModal`, () => {
	let wrapper: VueWrapper;
	let mockSend: Mock;
	let mockReceive: Mock;

	beforeEach(() => {
		mockSend = vi.fn();
		mockReceive = vi.fn();
		const eyas = (window as unknown as WindowWithEyas).eyas;
		eyas.send = mockSend;
		eyas.receive = mockReceive;

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
			await (wrapper.vm as unknown as VariablesModalVM).$nextTick();

			expect((wrapper.vm as unknown as VariablesModalVM).link).toBe(testLink);
			expect((wrapper.vm as unknown as VariablesModalVM).visible).toBe(true);
		}
	});

	test(`validates URLs correctly - valid URL enables launch button`, async () => {
		(wrapper.vm as unknown as VariablesModalVM).link = `https://example.com`;
		await (wrapper.vm as unknown as VariablesModalVM).$nextTick();

		// parsedLink should be the same as link when no variables
		expect((wrapper.vm as unknown as VariablesModalVM).parsedLink).toBe(`https://example.com`);
		expect((wrapper.vm as unknown as VariablesModalVM).linkIsValid).toBe(true);
	});

	test(`validates URLs correctly - invalid URL disables launch button`, async () => {
		(wrapper.vm as unknown as VariablesModalVM).link = `not-a-valid-url`;
		await (wrapper.vm as unknown as VariablesModalVM).$nextTick();

		expect((wrapper.vm as unknown as VariablesModalVM).parsedLink).toBe(`not-a-valid-url`);
		expect((wrapper.vm as unknown as VariablesModalVM).linkIsValid).toBe(false);
	});

	test(`validates URLs correctly - URL with variables disables until filled`, async () => {
		(wrapper.vm as unknown as VariablesModalVM).link = `https://example.com?id={int}`;
		await (wrapper.vm as unknown as VariablesModalVM).$nextTick();

		// Should be invalid while variables are not replaced
		expect((wrapper.vm as unknown as VariablesModalVM).linkIsValid).toBe(false);

		// Fill in the variable
		(wrapper.vm as unknown as VariablesModalVM).form = [`123`];
		await (wrapper.vm as unknown as VariablesModalVM).$nextTick();

		// Should now be valid
		expect((wrapper.vm as unknown as VariablesModalVM).parsedLink).toBe(`https://example.com?id=123`);
		expect((wrapper.vm as unknown as VariablesModalVM).linkIsValid).toBe(true);
	});

	test(`sends launch-link IPC with parsed URL when launch button clicked`, async () => {
		(wrapper.vm as unknown as VariablesModalVM).link = `https://example.com`;
		(wrapper.vm as unknown as VariablesModalVM).visible = true;
		await (wrapper.vm as unknown as VariablesModalVM).$nextTick();

		// Find and click the launch button
		const launchButton = wrapper.findAll(`button`).find(
			btn => btn.text().includes(`Continue`)
		);

		if (launchButton) {
			await launchButton.trigger(`click`);
			await (wrapper.vm as unknown as VariablesModalVM).$nextTick();

			// Verify IPC was called with the parsed URL
			expect(mockSend).toHaveBeenCalledWith(`launch-link`, { url: `https://example.com` });
		}
	});

	test(`variable replacement in parsedLink computed property`, async () => {
		(wrapper.vm as unknown as VariablesModalVM).link = `https://example.com?msg={str}&id={int}`;
		(wrapper.vm as unknown as VariablesModalVM).form = [`hello`, `456`];
		await (wrapper.vm as unknown as VariablesModalVM).$nextTick();

		expect((wrapper.vm as unknown as VariablesModalVM).parsedLink).toBe(`https://example.com?msg=hello&id=456`);
	});

	test(`form inputs update parsedLink correctly`, async () => {
		(wrapper.vm as unknown as VariablesModalVM).link = `https://example.com?id={int}`;
		(wrapper.vm as unknown as VariablesModalVM).visible = true;
		await (wrapper.vm as unknown as VariablesModalVM).$nextTick();

		// Initially no form data
		expect((wrapper.vm as unknown as VariablesModalVM).parsedLink).toContain(`{int}`);

		// Update form
		(wrapper.vm as unknown as VariablesModalVM).form = [`789`];
		await (wrapper.vm as unknown as VariablesModalVM).$nextTick();

		expect((wrapper.vm as unknown as VariablesModalVM).parsedLink).toBe(`https://example.com?id=789`);
	});

	// -------------------------------------------------------------------------
	// variables computed — type detection
	// -------------------------------------------------------------------------
	describe(`variables computed — type detection`, () => {
		test(`{int} variable is detected with type "int"`, () => {
			(wrapper.vm as unknown as VariablesModalVM).link = `https://example.com?id={int}`;
			const vars = (wrapper.vm as unknown as VariablesModalVM).variables;
			expect(vars).toHaveLength(1);
			expect(vars[0].type).toBe(`int`);
		});

		test(`{str} variable is detected with type "str"`, () => {
			(wrapper.vm as unknown as VariablesModalVM).link = `https://example.com?msg={str}`;
			const vars = (wrapper.vm as unknown as VariablesModalVM).variables;
			expect(vars).toHaveLength(1);
			expect(vars[0].type).toBe(`str`);
		});

		test(`{bool} variable is detected with type "bool"`, () => {
			(wrapper.vm as unknown as VariablesModalVM).link = `https://example.com?enabled={bool}`;
			const vars = (wrapper.vm as unknown as VariablesModalVM).variables;
			expect(vars).toHaveLength(1);
			expect(vars[0].type).toBe(`bool`);
		});

		test(`{opt1|opt2|} list variable is detected with type "list"`, () => {
			(wrapper.vm as unknown as VariablesModalVM).link = `https://example.com?env={dev.|staging.|}`;
			const vars = (wrapper.vm as unknown as VariablesModalVM).variables;
			expect(vars).toHaveLength(1);
			expect(vars[0].type).toBe(`list`);
		});

		test(`list variable has correct options array including blank option`, () => {
			(wrapper.vm as unknown as VariablesModalVM).link = `https://example.com?env={dev.|staging.|}`;
			const vars = (wrapper.vm as unknown as VariablesModalVM).variables;
			const opts = vars[0].options;
			expect(opts).toContainEqual({ value: `dev.`, title: `dev.` });
			expect(opts).toContainEqual({ value: `staging.`, title: `staging.` });
			// trailing pipe produces a blank entry displayed as {blank}
			expect(opts).toContainEqual({ value: ``, title: `{blank}` });
		});

		test(`multiple variables in one URL produce the correct count and types`, () => {
			(wrapper.vm as unknown as VariablesModalVM).link = `https://example.com?id={int}&msg={str}&enabled={bool}`;
			const vars = (wrapper.vm as unknown as VariablesModalVM).variables;
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
			(wrapper.vm as unknown as VariablesModalVM).link = `https://example.com?id={int}`;
			const vars = (wrapper.vm as unknown as VariablesModalVM).variables;
			expect(vars[0].field).toBe(`id`);
		});

		test(`query-param variable with string type extracts field "message"`, () => {
			(wrapper.vm as unknown as VariablesModalVM).link = `https://example.com?message={str}`;
			const vars = (wrapper.vm as unknown as VariablesModalVM).variables;
			expect(vars[0].field).toBe(`message`);
		});

		test(`non-query-param variable has no field property`, () => {
			// {int} appearing in a path segment has no ?field= prefix
			(wrapper.vm as unknown as VariablesModalVM).link = `https://example.com/{int}/page`;
			const vars = (wrapper.vm as unknown as VariablesModalVM).variables;
			expect(vars[0].field).toBeFalsy();
		});
	});

	// -------------------------------------------------------------------------
	// getFieldLabel method
	// -------------------------------------------------------------------------
	describe(`getFieldLabel method`, () => {
		test(`returns prefix only when no field is provided`, () => {
			expect((wrapper.vm as unknown as VariablesModalVM).getFieldLabel(`Enter number`, ``)).toBe(`Enter number`);
			expect((wrapper.vm as unknown as VariablesModalVM).getFieldLabel(`Enter number`, undefined)).toBe(`Enter number`);
		});

		test(`returns prefix with field name when field is provided`, () => {
			expect((wrapper.vm as unknown as VariablesModalVM).getFieldLabel(`Enter number`, `id`)).toBe(`Enter number for "id" field`);
			expect((wrapper.vm as unknown as VariablesModalVM).getFieldLabel(`Select value`, `enabled`)).toBe(`Select value for "enabled" field`);
		});
	});

	// -------------------------------------------------------------------------
	// {bool} and {list} — linkIsValid behavior
	// -------------------------------------------------------------------------
	describe(`bool and list variable link validity`, () => {
		test(`{bool} URL is invalid until a value is selected`, async () => {
			(wrapper.vm as unknown as VariablesModalVM).link = `https://example.com?enabled={bool}`;
			await (wrapper.vm as unknown as VariablesModalVM).$nextTick();
			expect((wrapper.vm as unknown as VariablesModalVM).linkIsValid).toBe(false);
		});

		test(`{bool} URL becomes valid when "true" is selected`, async () => {
			(wrapper.vm as unknown as VariablesModalVM).link = `https://example.com?enabled={bool}`;
			(wrapper.vm as unknown as VariablesModalVM).form = [`true`];
			await (wrapper.vm as unknown as VariablesModalVM).$nextTick();
			expect((wrapper.vm as unknown as VariablesModalVM).parsedLink).toBe(`https://example.com?enabled=true`);
			expect((wrapper.vm as unknown as VariablesModalVM).linkIsValid).toBe(true);
		});

		test(`{bool} URL becomes valid when "false" is selected`, async () => {
			(wrapper.vm as unknown as VariablesModalVM).link = `https://example.com?enabled={bool}`;
			(wrapper.vm as unknown as VariablesModalVM).form = [`false`];
			await (wrapper.vm as unknown as VariablesModalVM).$nextTick();
			expect((wrapper.vm as unknown as VariablesModalVM).parsedLink).toBe(`https://example.com?enabled=false`);
			expect((wrapper.vm as unknown as VariablesModalVM).linkIsValid).toBe(true);
		});

		test(`list variable URL is invalid until an option is selected`, async () => {
			(wrapper.vm as unknown as VariablesModalVM).link = `https://{dev.|staging.|}cycosoft.com`;
			await (wrapper.vm as unknown as VariablesModalVM).$nextTick();
			expect((wrapper.vm as unknown as VariablesModalVM).linkIsValid).toBe(false);
		});

		test(`list variable URL becomes valid when an option is selected`, async () => {
			(wrapper.vm as unknown as VariablesModalVM).link = `https://{dev.|staging.|}cycosoft.com`;
			(wrapper.vm as unknown as VariablesModalVM).form = [`dev.`];
			await (wrapper.vm as unknown as VariablesModalVM).$nextTick();
			expect((wrapper.vm as unknown as VariablesModalVM).parsedLink).toBe(`https://dev.cycosoft.com`);
			expect((wrapper.vm as unknown as VariablesModalVM).linkIsValid).toBe(true);
		});

		test(`list variable URL becomes valid when blank option is selected`, async () => {
			(wrapper.vm as unknown as VariablesModalVM).link = `https://{dev.|staging.|}cycosoft.com`;
			(wrapper.vm as unknown as VariablesModalVM).form = [``];
			await (wrapper.vm as unknown as VariablesModalVM).$nextTick();
			expect((wrapper.vm as unknown as VariablesModalVM).parsedLink).toBe(`https://cycosoft.com`);
			expect((wrapper.vm as unknown as VariablesModalVM).linkIsValid).toBe(true);
		});
	});

	// -------------------------------------------------------------------------
	// {testdomain} variable behavior
	// -------------------------------------------------------------------------
	describe(`testdomain variable behavior`, () => {
		test(`{testdomain} is NOT in the variables list when pre-resolved before modal opens`, () => {
			// Normal flow: navigateVariable() replaces {testdomain} before calling uiEvent('show-variables-modal', ...)
			// So the modal only ever receives a URL where {testdomain} is already gone.
			(wrapper.vm as unknown as VariablesModalVM).link = `https://staging.example.com?enabled={bool}`;
			const vars = (wrapper.vm as unknown as VariablesModalVM).variables;
			// Only {bool} remains — {testdomain} was already substituted
			expect(vars).toHaveLength(1);
			expect(vars[0].type).toBe(`bool`);
		});

		test(`{testdomain} only — pre-resolved URL with no other variables is immediately valid`, async () => {
			// After substitution, {testdomain}?go → https://staging.example.com?go
			(wrapper.vm as unknown as VariablesModalVM).link = `https://staging.example.com?go`;
			await (wrapper.vm as unknown as VariablesModalVM).$nextTick();
			expect((wrapper.vm as unknown as VariablesModalVM).linkIsValid).toBe(true);
		});

		test(`if {testdomain} somehow reaches the modal it is treated as a generic variable token`, () => {
			// Documents what happens if the guard in navigateVariable() is bypassed:
			// the modal will identify it as an unknown type (not int/str/bool, no pipe) and
			// treat it like a string-ish custom token.
			(wrapper.vm as unknown as VariablesModalVM).link = `https://example.com/{testdomain}/path`;
			const vars = (wrapper.vm as unknown as VariablesModalVM).variables;
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
			(wrapper.vm as unknown as VariablesModalVM).link = `https://example.com?msg={str}`;
			(wrapper.vm as unknown as VariablesModalVM).form = [`hello world`];
			await (wrapper.vm as unknown as VariablesModalVM).$nextTick();
			expect((wrapper.vm as unknown as VariablesModalVM).parsedLink).toBe(`https://example.com?msg=hello%20world`);
		});

		test(`special characters in string values are percent-encoded`, async () => {
			(wrapper.vm as unknown as VariablesModalVM).link = `https://example.com?q={str}`;
			(wrapper.vm as unknown as VariablesModalVM).form = [`foo&bar`];
			await (wrapper.vm as unknown as VariablesModalVM).$nextTick();
			expect((wrapper.vm as unknown as VariablesModalVM).parsedLink).toBe(`https://example.com?q=foo%26bar`);
		});

		test(`empty string value replaces the variable with nothing`, async () => {
			(wrapper.vm as unknown as VariablesModalVM).link = `https://example.com?q={str}`;
			(wrapper.vm as unknown as VariablesModalVM).form = [``];
			await (wrapper.vm as unknown as VariablesModalVM).$nextTick();
			// empty string is falsy but '' === '' is true, so it should still replace
			expect((wrapper.vm as unknown as VariablesModalVM).parsedLink).toBe(`https://example.com?q=`);
		});
	});

	// -------------------------------------------------------------------------
	// underscore-prefix (_env) variable behavior
	// -------------------------------------------------------------------------
	describe(`underscore-prefix (_env) variable behavior`, () => {
		test(`{_env.url} pre-resolved URL has no variables and is immediately valid`, async () => {
			// Normal flow: navigateVariable() replaces {_env.url} before calling uiEvent
			(wrapper.vm as unknown as VariablesModalVM).link = `https://staging.eyas.cycosoft.com?go`;
			await (wrapper.vm as unknown as VariablesModalVM).$nextTick();
			expect((wrapper.vm as unknown as VariablesModalVM).variables).toHaveLength(0);
			expect((wrapper.vm as unknown as VariablesModalVM).linkIsValid).toBe(true);
		});

		test(`{_env.key} pre-resolved URL has no variables and is immediately valid`, async () => {
			(wrapper.vm as unknown as VariablesModalVM).link = `https://staging.cycosoft.com`;
			await (wrapper.vm as unknown as VariablesModalVM).$nextTick();
			expect((wrapper.vm as unknown as VariablesModalVM).variables).toHaveLength(0);
			expect((wrapper.vm as unknown as VariablesModalVM).linkIsValid).toBe(true);
		});

		test(`{_env.url} token reaching the modal is treated as an unknown app token, not user-input`, () => {
			// Documents behavior if the substitution guard is somehow bypassed
			(wrapper.vm as unknown as VariablesModalVM).link = `https://example.com/{_env.url}/path`;
			const vars = (wrapper.vm as unknown as VariablesModalVM).variables;
			// Should NOT be in variables list (filtered by underscore prefix)
			expect(vars.every((v: VariableItem) => !v.type.startsWith(`_`))).toBe(true);
		});

		test(`{_env.key} token reaching the modal is treated as an unknown app token, not user-input`, () => {
			(wrapper.vm as unknown as VariablesModalVM).link = `https://{_env.key}example.com`;
			const vars = (wrapper.vm as unknown as VariablesModalVM).variables;
			// Should NOT be in variables list (filtered by underscore prefix)
			expect(vars.every((v: VariableItem) => !v.type.startsWith(`_`))).toBe(true);
		});

		test(`after {_env.url} and {_env.key} resolved, only remaining user vars appear in modal`, async () => {
			// Simulates the URL after substituteEnvVariables() has run
			(wrapper.vm as unknown as VariablesModalVM).link = `https://staging.eyas.cycosoft.com?env=staging.&enabled={bool}`;
			await (wrapper.vm as unknown as VariablesModalVM).$nextTick();
			const vars = (wrapper.vm as unknown as VariablesModalVM).variables;
			expect(vars).toHaveLength(1);
			expect(vars[0].type).toBe(`bool`);

			(wrapper.vm as unknown as VariablesModalVM).form = [`true`];
			await (wrapper.vm as unknown as VariablesModalVM).$nextTick();
			expect((wrapper.vm as unknown as VariablesModalVM).linkIsValid).toBe(true);
		});
	});
});
