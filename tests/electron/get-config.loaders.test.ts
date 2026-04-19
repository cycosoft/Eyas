import { expect, test, describe, vi, beforeEach } from "vitest";
import * as loaders from "../../src/scripts/get-config.loaders.js";

describe(`get-config.loaders`, () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	test(`getConfigViaUrl should handle valid URL`, async () => {
		const mockConfig = { title: `Mock Web Config` };
		global.fetch = vi.fn().mockResolvedValue({
			ok: true,
			json: () => Promise.resolve(mockConfig)
		});

		const config = await loaders.getConfigViaUrl(`https://example.com`);
		expect(config.title).toBe(`Mock Web Config`);
		expect(config.source).toBe(`https://example.com/`);
	});

	test(`getConfigViaUrl should throw on invalid URL`, async () => {
		await expect(loaders.getConfigViaUrl(`invalid-url`)).rejects.toThrow(`WEB: Invalid URL`);
	});
});
