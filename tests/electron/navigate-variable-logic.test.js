import { describe, test, expect } from 'vitest';
import {
	substituteEnvVariables,
	isVariableLinkValid,
	hasRemainingVariables
} from '../../src/scripts/variable-utils.js';

// ---------------------------------------------------------------------------
// Tests: link validation (the stub-replacement + isURL gate in setMenu)
// ---------------------------------------------------------------------------

describe(`variable link validation (setMenu gate)`, () => {
	test(`{testdomain} stub-replaced URL is valid`, () => {
		expect(isVariableLinkValid(`{testdomain}?go`)).toBe(true);
	});

	test(`{testdomain} with bool stub-replaced URL is valid`, () => {
		expect(isVariableLinkValid(`{testdomain}?enabled={bool}`)).toBe(true);
	});

	test(`{int} variable URL is valid after stub replacement`, () => {
		expect(isVariableLinkValid(`https://example.com?id={int}`)).toBe(true);
	});

	test(`{str} variable URL is valid after stub replacement`, () => {
		expect(isVariableLinkValid(`https://example.com?message={str}`)).toBe(true);
	});

	test(`{bool} variable URL is valid after stub replacement`, () => {
		expect(isVariableLinkValid(`https://example.com?enabled={bool}`)).toBe(true);
	});

	test(`list variable {dev.|staging.|} URL is valid after stub replacement`, () => {
		expect(isVariableLinkValid(`https://{dev.|staging.|}cycosoft.com`)).toBe(true);
	});

	test(`combo URL with all variable types is valid after stub replacement`, () => {
		expect(
			isVariableLinkValid(`https://{dev.|staging.|}cycosoft.com?id={int}&message={str}&enabled={bool}`)
		).toBe(true);
	});

	test(`URL with invalid base domain is still invalid after stub replacement`, () => {
		expect(isVariableLinkValid(`not-a-domain/{int}`)).toBe(false);
	});

	test(`{testdomain} alone (no path, no query) is valid after stub replacement`, () => {
		expect(isVariableLinkValid(`{testdomain}`)).toBe(true);
	});
});

describe(`variable link validation — _env variables (setMenu gate)`, () => {
	test(`{_env.url} stub-replaced URL is valid`, () => {
		expect(isVariableLinkValid(`{_env.url}?go`)).toBe(true);
	});

	test(`{_env.key} stub-replaced URL is valid`, () => {
		expect(isVariableLinkValid(`https://{_env.key}cycosoft.com`)).toBe(true);
	});

	test(`{_env.url} + {_env.key} combo is valid after stub replacement`, () => {
		expect(isVariableLinkValid(`{_env.url}/{_env.key}path`)).toBe(true);
	});

	test(`{_env.url} + {bool} combo is valid after stub replacement`, () => {
		expect(isVariableLinkValid(`{_env.url}?enabled={bool}`)).toBe(true);
	});

	test(`{_env.key} + {int} combo is valid after stub replacement`, () => {
		expect(isVariableLinkValid(`https://{_env.key}cycosoft.com?id={int}`)).toBe(true);
	});

	test(`combo URL with _env and user-input variables is valid`, () => {
		expect(
			isVariableLinkValid(`https://{_env.key}cycosoft.com?id={int}&message={str}&enabled={bool}`)
		).toBe(true);
	});

	test(`{_env.url} alone is valid after stub replacement`, () => {
		expect(isVariableLinkValid(`{_env.url}`)).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// Tests: _env variable substitution (navigateVariable logic)
// ---------------------------------------------------------------------------

describe(`_env variable substitution (navigateVariable logic)`, () => {
	const stagingEnv = { url: `https://staging.eyas.cycosoft.com`, key: `staging.` };
	const devEnv = { url: `https://dev.eyas.cycosoft.com`, key: `dev.` };
	const noKeyEnv = { url: `https://eyas.cycosoft.com`, key: undefined };

	test(`{_env.url} is replaced with the selected domain URL`, () => {
		expect(substituteEnvVariables(`{_env.url}?go`, stagingEnv))
			.toBe(`https://staging.eyas.cycosoft.com?go`);
	});

	test(`{_env.key} is replaced with the selected domain key`, () => {
		expect(substituteEnvVariables(`https://{_env.key}cycosoft.com`, stagingEnv))
			.toBe(`https://staging.cycosoft.com`);
	});

	test(`{_env.key} with undefined key is replaced with empty string`, () => {
		expect(substituteEnvVariables(`https://{_env.key}cycosoft.com`, noKeyEnv))
			.toBe(`https://cycosoft.com`);
	});

	test(`{_env.key} with null key is replaced with empty string`, () => {
		const nullKeyEnv = { url: `https://eyas.cycosoft.com`, key: null };
		expect(substituteEnvVariables(`https://{_env.key}cycosoft.com`, nullKeyEnv))
			.toBe(`https://cycosoft.com`);
	});

	test(`guard: {_env.url} + no env set → returns null`, () => {
		expect(substituteEnvVariables(`{_env.url}?go`, null)).toBeNull();
		expect(substituteEnvVariables(`{_env.url}?go`, { url: null, key: null })).toBeNull();
	});

	test(`URL with no {_env.url} passes through unchanged regardless of env`, () => {
		expect(substituteEnvVariables(`https://example.com?id={int}`, null))
			.toBe(`https://example.com?id={int}`);
		expect(substituteEnvVariables(`https://example.com?id={int}`, stagingEnv))
			.toBe(`https://example.com?id={int}`);
	});

	test(`{testdomain} (deprecated) behaves identically to {_env.url} — guard when no env`, () => {
		expect(substituteEnvVariables(`{testdomain}?go`, null)).toBeNull();
	});

	test(`{testdomain} (deprecated) behaves identically to {_env.url} — substitution`, () => {
		expect(substituteEnvVariables(`{testdomain}?go`, stagingEnv))
			.toBe(`https://staging.eyas.cycosoft.com?go`);
	});

	test(`combo URL: {_env.url} and {_env.key} resolved, {bool} remains for modal`, () => {
		const result = substituteEnvVariables(`{_env.url}?env={_env.key}&enabled={bool}`, stagingEnv);
		expect(result).toBe(`https://staging.eyas.cycosoft.com?env=staging.&enabled={bool}`);
	});

	test(`multiple {_env.url} occurrences are all replaced`, () => {
		const result = substituteEnvVariables(`{_env.url}/path?ref={_env.url}`, devEnv);
		expect(result).toBe(`https://dev.eyas.cycosoft.com/path?ref=https://dev.eyas.cycosoft.com`);
	});

	test(`{_env.key} has no guard — substitutes even when env has no key`, () => {
		// Unlike _env.url, _env.key never blocks navigation — it just outputs ""
		expect(substituteEnvVariables(`https://{_env.key}cycosoft.com`, noKeyEnv))
			.not.toBeNull();
	});
});

// ---------------------------------------------------------------------------
// Tests: hasRemainingVariables (decides modal vs. direct navigate)
// ---------------------------------------------------------------------------

describe(`hasRemainingVariables (post-substitution branch decision)`, () => {
	test(`URL with no variables → navigate directly (false)`, () => {
		expect(hasRemainingVariables(`https://staging.example.com?go`)).toBe(false);
	});

	test(`URL still containing {bool} → show modal (true)`, () => {
		expect(hasRemainingVariables(`https://staging.example.com?enabled={bool}`)).toBe(true);
	});

	test(`URL still containing {int} → show modal (true)`, () => {
		expect(hasRemainingVariables(`https://staging.example.com?id={int}`)).toBe(true);
	});

	test(`URL still containing {str} → show modal (true)`, () => {
		expect(hasRemainingVariables(`https://staging.example.com?msg={str}`)).toBe(true);
	});

	test(`URL still containing list variable → show modal (true)`, () => {
		expect(hasRemainingVariables(`https://{dev.|staging.|}example.com`)).toBe(true);
	});

	test(`URL with all variables substituted → navigate directly (false)`, () => {
		expect(hasRemainingVariables(`https://staging.example.com?id=42&msg=hello&enabled=true`)).toBe(false);
	});

	test(`URL still containing {_env.url} (should not reach here, but guard) → show modal (true)`, () => {
		// _env vars should always be substituted before this check, but if somehow still present:
		expect(hasRemainingVariables(`{_env.url}?go`)).toBe(true);
	});

	test(`URL still containing {_env.key} → show modal (true)`, () => {
		expect(hasRemainingVariables(`https://{_env.key}cycosoft.com`)).toBe(true);
	});
});
