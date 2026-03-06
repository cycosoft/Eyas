import { expect, test, describe } from 'vitest';
const getAppTitle = require(`../../src/scripts/get-app-title.js`);

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
});
