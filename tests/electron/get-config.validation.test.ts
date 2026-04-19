import { expect, test, describe, vi, beforeEach } from "vitest";
import * as validationUtils from "../../src/scripts/get-config.validation.js";

// Mock git utils
vi.mock(`../../src/scripts/get-config.git.js`, () => ({
	getBranchName: vi.fn(() => `mock-branch`),
	getCommitHash: vi.fn(() => `mock-hash`),
	getUserName: vi.fn(() => `mock-user`),
	getCompanyId: vi.fn(() => `mock-company`),
	getProjectId: vi.fn(() => `mock-project`)
}));

describe(`get-config.validation`, () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe(`validateExpiration`, () => {
		test(`should return default hours when no input is provided`, () => {
			expect(validationUtils.validateExpiration()).toBe(168);
		});

		test(`should return minimum hours when input is less than minimum`, () => {
			expect(validationUtils.validateExpiration(0)).toBe(1);
		});

		test(`should return maximum hours when input is more than maximum`, () => {
			expect(validationUtils.validateExpiration(1000)).toBe(720);
		});

		test(`should return integer hours when input is a decimal`, () => {
			expect(validationUtils.validateExpiration(1.5)).toBe(2);
		});
	});

	describe(`getExpirationDate`, () => {
		test(`should return a date in the future`, () => {
			const hours = 24;
			const expirationDate = validationUtils.getExpirationDate(hours);
			const now = new Date();
			expect(expirationDate.getTime()).toBeGreaterThan(now.getTime());
			// Allow for some execution time difference
			expect(expirationDate.getTime()).toBeLessThanOrEqual(now.getTime() + (hours * 60 * 60 * 1000) + 1000);
		});
	});

	describe(`validateCustomDomain`, () => {
		test(`should handle string input`, () => {
			expect(validationUtils.validateCustomDomain(`example.com`)).toEqual([{ url: `example.com`, title: `example.com` }]);
		});

		test(`should handle array of strings`, () => {
			expect(validationUtils.validateCustomDomain([`a.com`, `b.com`])).toEqual([
				{ url: `a.com`, title: `a.com` },
				{ url: `b.com`, title: `b.com` }
			]);
		});

		test(`should handle array of objects`, () => {
			const domains = [{ url: `a.com`, title: `A` }];
			expect(validationUtils.validateCustomDomain(domains)).toEqual(domains);
		});
	});

	describe(`getTestId`, () => {
		test(`should return a valid UUID`, () => {
			const id = validationUtils.getTestId();
			expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
		});
	});

	describe(`validateConfig`, () => {
		test(`should return a validated config with defaults`, () => {
			const config = validationUtils.validateConfig({});
			expect(config.title).toBe(`Eyas`);
			expect(config.version).toBe(`mock-branch.mock-hash`);
			expect(config.meta.gitBranch).toBe(`mock-branch`);
		});
	});
});
