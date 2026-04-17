import { expect, test, describe, vi, beforeEach } from "vitest";
import getConfig from "../../src/scripts/get-config.js";
import { LOAD_TYPES } from "../../src/scripts/constants.js";

// Mock the child_process to avoid git command failures in environments without git
vi.mock(`node:child_process`, () => ({
	execSync: vi.fn(cmd => {
		if (cmd.includes(`rev-parse --short HEAD`)) return `mock-hash`;
		if (cmd.includes(`rev-parse --abbrev-ref HEAD`)) return `mock-branch`;
		if (cmd.includes(`git config user.name`)) return `mock-user`;
		if (cmd.includes(`git config user.email`)) return `user@example.com`;
		if (cmd.includes(`git remote`)) return `origin`;
		if (cmd.includes(`git remote get-url`)) return `https://github.com/example/repo.git`;
		return ``;
	})
}));

describe(`getConfig`, () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

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

	describe(`Validation Logic`, () => {
		test(`should apply defaults when no config is provided`, async () => {
			// Mock fetch to fail so it returns an empty object
			global.fetch = vi.fn().mockRejectedValue(new Error(`Fetch failed`));
			// Suppress console.error for this test
			const consoleSpy = vi.spyOn(console, `error`).mockImplementation(() => {});

			const config = await getConfig(LOAD_TYPES.WEB, `eyas://example.com`);

			expect(config.title).toBe(`Eyas`);
			expect(config.version).toBe(`mock-branch.mock-hash`);
			expect(config.viewports).toEqual([]);
			expect(config.links).toEqual([]);
			expect(config.meta.gitBranch).toBe(`mock-branch`);
			expect(config.meta.gitHash).toBe(`mock-hash`);
			expect(config.meta.gitUser).toBe(`mock-user`);

			consoleSpy.mockRestore();
		});

		test(`should use provided values instead of defaults`, async () => {
			const mockConfig = {
				title: `Custom Title`,
				version: `1.2.3`,
				domain: `example.com`,
				viewports: [{ label: `Mobile`, width: 375, height: 667 }],
				links: [{ label: `Home`, url: `/` }],
				outputs: { expires: 48 }
			};

			global.fetch = vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve(mockConfig)
			});

			const config = await getConfig(LOAD_TYPES.WEB, `https://example.com`);

			expect(config.title).toBe(`Custom Title`);
			expect(config.version).toBe(`1.2.3`);
			expect(config.domains).toEqual([{ url: `example.com` }]);
			expect(config.viewports).toHaveLength(1);
			expect(config.outputs.expires).toBe(48);
		});

		test(`should handle legacy 'domain' field`, async () => {
			global.fetch = vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({ domain: `legacy.com` })
			});

			const config = await getConfig(LOAD_TYPES.WEB, `https://example.com`);
			expect(config.domains).toEqual([{ url: `legacy.com` }]);
		});

		test(`should handle 'domains' array field`, async () => {
			const domains = [{ url: `a.com`, title: `A` }, { url: `b.com`, title: `B` }];
			global.fetch = vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({ domains })
			});

			const config = await getConfig(LOAD_TYPES.WEB, `https://example.com`);
			expect(config.domains).toEqual(domains);
		});
	});
});
