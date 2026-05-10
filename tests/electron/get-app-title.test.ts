import { expect, test, describe } from 'vitest';
import { getAppTitle, sanitizePageTitle } from '@scripts/get-app-title.js';

describe(`getAppTitle`, () => {
	test(`should return the title and version without emoji`, () => {
		const title = `Test App`;
		const version = `1.0.0`;
		const result = getAppTitle(title, version);
		expect(result).toBe(`1.0.0 | Test App`);
	});

	test(`should not include the URL if provided`, () => {
		const title = `Test App`;
		const version = `1.0.0`;
		const url = `https://example.com`;
		const result = getAppTitle(title, version, url);
		expect(result).toBe(`1.0.0 | Test App`);
	});

	test(`should handle empty title or version`, () => {
		expect(getAppTitle(``, `1.0.0`)).toBe(`1.0.0 | `);
		expect(getAppTitle(`Test`, ``)).toBe(` | Test`);
	});

	test(`should not include data: URLs`, () => {
		const title = `Test App`;
		const version = `1.0.0`;
		const url = `data:text/html,<html></html>`;
		const result = getAppTitle(title, version, url);
		expect(result).toBe(`1.0.0 | Test App`);
	});

	test(`should ignore pageTitle and omit URL`, () => {
		const result = getAppTitle(`Test App`, `1.0.0`, `https://example.com`, `My Page`);
		expect(result).toBe(`1.0.0 | Test App`);
	});

	test(`should ignore pageTitle even with no URL`, () => {
		const result = getAppTitle(`Test App`, `1.0.0`, undefined, `My Page`);
		expect(result).toBe(`1.0.0 | Test App`);
	});

	test(`should omit pageTitle and keep simple format`, () => {
		expect(getAppTitle(`Test App`, `1.0.0`, `https://example.com`, ``)).toBe(`1.0.0 | Test App`);
		expect(getAppTitle(`Test App`, `1.0.0`, `https://example.com`, `   `)).toBe(`1.0.0 | Test App`);
	});
});

describe(`sanitizePageTitle`, () => {
	test(`should return the trimmed page title for a normal URL`, () => {
		expect(sanitizePageTitle(`My Page`, `https://example.com`)).toBe(`My Page`);
	});

	test(`should trim whitespace`, () => {
		expect(sanitizePageTitle(`  My Page  `, `https://example.com`)).toBe(`My Page`);
	});

	test(`should return undefined when pageTitle is empty or whitespace`, () => {
		expect(sanitizePageTitle(``, `https://example.com`)).toBeUndefined();
		expect(sanitizePageTitle(`   `, `https://example.com`)).toBeUndefined();
		expect(sanitizePageTitle(null, `https://example.com`)).toBeUndefined();
		expect(sanitizePageTitle(undefined, `https://example.com`)).toBeUndefined();
	});

	test(`should return undefined when page is a data: URL (regardless of pageTitle value)`, () => {
		expect(sanitizePageTitle(`Some Title`, `data:text/html,<html></html>`)).toBeUndefined();
		expect(sanitizePageTitle(`data:text/html,<html></html>`, `data:text/html,<html></html>`)).toBeUndefined();
	});

	test(`should return undefined when pageTitle equals the raw URL (Electron fallback)`, () => {
		expect(sanitizePageTitle(`https://example.com`, `https://example.com`)).toBeUndefined();
	});

	test(`should return undefined when pageTitle is the URL hostname (Electron fallback on failed load)`, () => {
		expect(sanitizePageTitle(`landing.dev.cycosoft.com`, `https://landing.dev.cycosoft.com/`)).toBeUndefined();
		expect(sanitizePageTitle(`example.com`, `https://example.com/some/path`)).toBeUndefined();
	});

	test(`should return undefined when rawUrl is absent`, () => {
		expect(sanitizePageTitle(`My Page`, undefined)).toBe(`My Page`);
		expect(sanitizePageTitle(`My Page`, undefined)).toBe(`My Page`);
	});
});
