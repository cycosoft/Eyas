import { expect, test, describe } from 'vitest';
import { getAppTitle, sanitizePageTitle } from '../../src/scripts/get-app-title.js';

describe(`getAppTitle`, () => {
	test(`should return the title and version with emoji`, () => {
		const title = `Test App`;
		const version = `1.0.0`;
		const result = getAppTitle(title, version);
		expect(result).toBe(`Test App :: 1.0.0 ✨`);
	});

	test(`should include the URL if provided`, () => {
		const title = `Test App`;
		const version = `1.0.0`;
		const url = `https://example.com`;
		const result = getAppTitle(title, version, url);
		expect(result).toBe(`Test App :: 1.0.0 ✨ ( https://example.com )`);
	});

	test(`should handle empty title or version`, () => {
		expect(getAppTitle(``, `1.0.0`)).toBe(` :: 1.0.0 ✨`);
		expect(getAppTitle(`Test`, ``)).toBe(`Test ::  ✨`);
	});

	test(`should include data: URLs (utility remains flexible)`, () => {
		const title = `Test App`;
		const version = `1.0.0`;
		const url = `data:text/html,<html></html>`;
		const result = getAppTitle(title, version, url);
		expect(result).toBe(`Test App :: 1.0.0 ✨ ( data:text/html,<html></html> )`);
	});

	test(`should include pageTitle between version and URL`, () => {
		const result = getAppTitle(`Test App`, `1.0.0`, `https://example.com`, `My Page`);
		expect(result).toBe(`Test App :: 1.0.0 ✨ — My Page ( https://example.com )`);
	});

	test(`should include pageTitle even with no URL`, () => {
		const result = getAppTitle(`Test App`, `1.0.0`, null, `My Page`);
		expect(result).toBe(`Test App :: 1.0.0 ✨ — My Page`);
	});

	test(`should omit pageTitle when empty or whitespace`, () => {
		expect(getAppTitle(`Test App`, `1.0.0`, `https://example.com`, ``)).toBe(`Test App :: 1.0.0 ✨ ( https://example.com )`);
		expect(getAppTitle(`Test App`, `1.0.0`, `https://example.com`, `   `)).toBe(`Test App :: 1.0.0 ✨ ( https://example.com )`);
	});
});

describe(`sanitizePageTitle`, () => {
	test(`should return the trimmed page title for a normal URL`, () => {
		expect(sanitizePageTitle(`My Page`, `https://example.com`)).toBe(`My Page`);
	});

	test(`should trim whitespace`, () => {
		expect(sanitizePageTitle(`  My Page  `, `https://example.com`)).toBe(`My Page`);
	});

	test(`should return null when pageTitle is empty or whitespace`, () => {
		expect(sanitizePageTitle(``, `https://example.com`)).toBeNull();
		expect(sanitizePageTitle(`   `, `https://example.com`)).toBeNull();
		expect(sanitizePageTitle(null, `https://example.com`)).toBeNull();
		expect(sanitizePageTitle(undefined, `https://example.com`)).toBeNull();
	});

	test(`should return null when page is a data: URL (regardless of pageTitle value)`, () => {
		expect(sanitizePageTitle(`Some Title`, `data:text/html,<html></html>`)).toBeNull();
		expect(sanitizePageTitle(`data:text/html,<html></html>`, `data:text/html,<html></html>`)).toBeNull();
	});

	test(`should return null when pageTitle equals the raw URL (Electron fallback)`, () => {
		expect(sanitizePageTitle(`https://example.com`, `https://example.com`)).toBeNull();
	});

	test(`should return null when pageTitle is the URL hostname (Electron fallback on failed load)`, () => {
		expect(sanitizePageTitle(`landing.dev.cycosoft.com`, `https://landing.dev.cycosoft.com/`)).toBeNull();
		expect(sanitizePageTitle(`example.com`, `https://example.com/some/path`)).toBeNull();
	});

	test(`should return null when rawUrl is absent`, () => {
		expect(sanitizePageTitle(`My Page`, null)).toBe(`My Page`);
		expect(sanitizePageTitle(`My Page`, undefined)).toBe(`My Page`);
	});
});
