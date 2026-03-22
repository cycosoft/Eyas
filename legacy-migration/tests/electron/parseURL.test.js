import { describe, test, expect } from 'vitest';
import { parseURL } from '../../src/scripts/parse-url.js';

describe(`parseURL`, () => {
	test(`returns URL object for valid URL with protocol`, () => {
		const result = parseURL(`https://example.com`);
		expect(result).toBeInstanceOf(URL);
		expect(result.href).toBe(`https://example.com/`);
	});

	test(`adds https:// protocol when missing`, () => {
		const result = parseURL(`example.com`);
		expect(result).toBeInstanceOf(URL);
		expect(result.protocol).toBe(`https:`);
		expect(result.hostname).toBe(`example.com`);
	});

	test(`returns empty string for invalid URL`, () => {
		const result = parseURL(`not-a-url`);
		expect(result).toBe(``);
	});

	test(`returns empty string for empty input`, () => {
		const result = parseURL(``);
		expect(result).toBe(``);
	});

	test(`returns empty string for null/undefined`, () => {
		expect(parseURL(null)).toBe(``);
		expect(parseURL(undefined)).toBe(``);
	});
});
