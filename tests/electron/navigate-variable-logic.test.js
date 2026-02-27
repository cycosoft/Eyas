import { describe, test, expect } from 'vitest';
import { isURL } from 'validator';

// ---------------------------------------------------------------------------
// Helpers that mirror the logic embedded in eyas-core/index.js
// ---------------------------------------------------------------------------

/**
 * Mirrors the stub-replacement + isURL validation that setMenu() performs
 * on every link item that contains variables, to decide whether the menu
 * entry should be enabled.
 *
 * Source: src/eyas-core/index.js  setMenu() → linkItems forEach
 *   const testUrl = itemUrl
 *     .replace(/{testdomain}/g, `validating.com`)
 *     .replace(/{[^{}]+}/g, `validating`);
 *   isValid = isURL(testUrl);
 */
function isVariableLinkValid(itemUrl) {
	const testUrl = itemUrl
		.replace(/{testdomain}/g, `validating.com`)
		.replace(/{[^{}]+}/g, `validating`);
	return isURL(testUrl);
}

/**
 * Mirrors the testdomain substitution in navigateVariable():
 *   const output = url.replace(/{testdomain}/g, $testDomainRaw);
 *
 * Returns null when $testDomainRaw is falsy and the URL contains {testdomain}
 * (mirrors the early-return guard).
 */
function substituteTestDomain(url, testDomainRaw) {
	// Guard: if the URL needs a domain but none is set, bail out
	if (url.match(/{testdomain}/g)?.length && !testDomainRaw) {
		return null;
	}
	return url.replace(/{testdomain}/g, testDomainRaw || ``);
}

/**
 * After testdomain substitution, check whether further user input is needed.
 * Mirrors the check in navigateVariable():
 *   if (output.match(/{[^{}]+}/g)?.length) → show variables modal
 *   else                                    → navigate directly
 */
function hasRemainingVariables(url) {
	return !!url.match(/{[^{}]+}/g)?.length;
}

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
		// e.g. a URL that was misconfigured with no valid host
		expect(isVariableLinkValid(`not-a-domain/{int}`)).toBe(false);
	});

	test(`{testdomain} alone (no path, no query) is valid after stub replacement`, () => {
		expect(isVariableLinkValid(`{testdomain}`)).toBe(true);
	});

	test(`URL without any variables and a valid HTTPS URL is valid`, () => {
		// Baseline: non-variable links use parseURL → isURL path (not part of this function,
		// but demonstrates isURL behaviour used by the sister code path)
		expect(isURL(`https://example.com`)).toBe(true);
	});

	test(`URL without any variables and an invalid URL is invalid`, () => {
		expect(isURL(`not-a-url`)).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// Tests: {testdomain} substitution (navigateVariable logic)
// ---------------------------------------------------------------------------

describe(`testdomain substitution (navigateVariable logic)`, () => {
	test(`returns null when URL needs testdomain but none is set`, () => {
		expect(substituteTestDomain(`{testdomain}?go`, null)).toBeNull();
		expect(substituteTestDomain(`{testdomain}?go`, ``)).toBeNull();
		expect(substituteTestDomain(`{testdomain}?enabled={bool}`, null)).toBeNull();
	});

	test(`substitutes testdomain when a domain is set — simple case`, () => {
		const result = substituteTestDomain(`{testdomain}?go`, `https://staging.eyas.cycosoft.com`);
		expect(result).toBe(`https://staging.eyas.cycosoft.com?go`);
	});

	test(`substitutes testdomain when a domain is set — with remaining bool variable`, () => {
		const result = substituteTestDomain(`{testdomain}?enabled={bool}`, `https://staging.eyas.cycosoft.com`);
		expect(result).toBe(`https://staging.eyas.cycosoft.com?enabled={bool}`);
	});

	test(`substitutes testdomain when a domain is set — dev domain`, () => {
		const result = substituteTestDomain(`{testdomain}?go`, `https://dev.eyas.cycosoft.com`);
		expect(result).toBe(`https://dev.eyas.cycosoft.com?go`);
	});

	test(`URL without {testdomain} is returned unchanged regardless of domain state`, () => {
		expect(substituteTestDomain(`https://example.com?id={int}`, null)).toBe(`https://example.com?id={int}`);
		expect(substituteTestDomain(`https://example.com?id={int}`, `https://staging.example.com`)).toBe(`https://example.com?id={int}`);
	});

	test(`multiple {testdomain} occurrences are all replaced`, () => {
		const result = substituteTestDomain(`{testdomain}/path?ref={testdomain}`, `https://staging.example.com`);
		expect(result).toBe(`https://staging.example.com/path?ref=https://staging.example.com`);
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
});
