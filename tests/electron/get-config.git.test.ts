import { expect, test, describe, vi, beforeEach } from "vitest";
import * as gitUtils from "../../src/scripts/get-config.git.js";

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

describe(`get-config.git`, () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	test(`getCommitHash should return the mock hash`, () => {
		expect(gitUtils.getCommitHash()).toBe(`mock-hash`);
	});

	test(`getBranchName should return the mock branch`, () => {
		expect(gitUtils.getBranchName()).toBe(`mock-branch`);
	});

	test(`getUserName should return the mock user`, () => {
		expect(gitUtils.getUserName()).toBe(`mock-user`);
	});

	test(`getCompanyId should hash the domain from git email`, () => {
		const companyId = gitUtils.getCompanyId();
		expect(companyId).toBeDefined();
		expect(typeof companyId).toBe(`string`);
	});

	test(`getProjectId should hash the remote url`, () => {
		const projectId = gitUtils.getProjectId();
		expect(projectId).toBeDefined();
		expect(typeof projectId).toBe(`string`);
	});
});
