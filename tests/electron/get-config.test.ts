import { expect, test, describe, vi } from 'vitest';
import getConfig from '../../src/scripts/get-config.js';
import { LOAD_TYPES } from '../../src/scripts/constants.js';

describe(`getConfig`, () => {
	test(`should return a default validated config object`, async () => {
		const config = await getConfig(LOAD_TYPES.AUTO);
		expect(config).toBeDefined();
		expect(config.title).toBeDefined();
		expect(config.meta).toBeDefined();
		expect(typeof config.meta.isConfigLoaded).toBe(`boolean`);
	});

	test(`should handle WEB load type`, async () => {
		const mockConfig = { title: `Mock Web Config`, source: `https://example.com` };
		global.fetch = vi.fn().mockResolvedValue({
			ok: true,
			json: () => Promise.resolve(mockConfig)
		});

		const config = await getConfig(LOAD_TYPES.WEB, `https://example.com`);
		expect(config.title).toBe(`Mock Web Config`);
		expect(config.meta.isConfigLoaded).toBe(true);
	});
});
