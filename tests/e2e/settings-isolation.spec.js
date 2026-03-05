const { test, expect } = require(`@playwright/test`);
const path = require(`path`);
const fs = require(`fs-extra`);
const {
	launchEyas,
	exitEyas,
	getUiView
} = require(`./eyas-utils`);

// ─────────────────────────────────────────────────────────────────────────────
// Helper: create a minimal temporary project directory with its own config
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates a temporary directory with a minimal `.eyas.config.js` that
 * includes a hard-coded, unique projectId so Eyas will treat it as a
 * distinct project from any other temp project in the same test run.
 *
 * @param {string} projectId - Stable unique string to use as the config's projectId
 * @returns {Promise<string>} Absolute path to the created temp directory
 */
async function createTempProject(projectId) {
	const dir = path.join(__dirname, `../../.test-data`, `project-${projectId}-${Date.now()}`);
	await fs.ensureDir(dir);

	// Minimal config that provides a distinguishable projectId in meta.
	// Using an inline object so we don't need to build or compile anything.
	const configContent = `
'use strict';
module.exports = {
	title: \`Test Project ${projectId}\`,
	domains: [
		{ url: \`https://staging.example.com\`, title: \`Staging\` },
		{ url: \`https://example.com\`, title: \`Production\` }
	],
	meta: {
		projectId: \`${projectId}\`,
		testId: require(\`crypto\`).randomUUID()
	}
};
`;
	await fs.writeFile(path.join(dir, `.eyas.config.js`), configContent, `utf8`);
	return dir;
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

test.describe(`Project Settings Isolation`, () => {
	/** Shared Electron userData directory — both projects will read/write here */
	let sharedUserDataDir;

	/** Paths to the two ephemeral project directories */
	let projectADir;
	let projectBDir;

	test.beforeAll(async () => {
		// Create a shared user-data dir (simulates a single user's machine having
		// settings for multiple projects stored in one place).
		sharedUserDataDir = path.join(__dirname, `../../.test-data`, `shared-user-data-${Date.now()}`);
		await fs.ensureDir(sharedUserDataDir);

		// Build the two project directories with distinct projectIds
		projectADir = await createTempProject(`alpha`);
		projectBDir = await createTempProject(`beta`);
	});

	test.afterAll(async () => {
		await fs.remove(sharedUserDataDir).catch(() => {});
		await fs.remove(projectADir).catch(() => {});
		await fs.remove(projectBDir).catch(() => {});
	});

	test(`settings saved in Project A do not appear in Project B`, async () => {
		// ─── Phase 1: Launch as Project A and enable "Always choose" ───────────
		let electronApp = await launchEyas([], sharedUserDataDir, projectADir);
		let uiPage = await getUiView(electronApp);

		// The environment selection modal should appear on first launch
		const envModal = uiPage.locator(`[data-qa="environment-modal-title"]`);
		await expect(envModal).toBeVisible({ timeout: 10_000 });

		// Tick "Always choose" so the preference is persisted for Project A
		const alwaysChooseCheckbox = uiPage.locator(`[data-qa="checkbox-always-choose"] input`);
		await alwaysChooseCheckbox.check();
		await expect(alwaysChooseCheckbox).toBeChecked();

		// Select an environment to dismiss the modal and trigger the save
		await uiPage.locator(`[data-qa="btn-env"]`).first().click();
		await expect(envModal).not.toBeVisible({ timeout: 5_000 });

		await exitEyas(electronApp);

		// ─── Phase 2: Launch as Project B (same userData, different projectId) ──
		// Project B should not inherit Project A's "Always choose" setting,
		// so the modal MUST appear again.
		electronApp = await launchEyas([], sharedUserDataDir, projectBDir);
		uiPage = await getUiView(electronApp);

		const envModalB = uiPage.locator(`[data-qa="environment-modal-title"]`);
		await expect(envModalB).toBeVisible({
			timeout: 10_000,
			message: `Project B should show the environment modal because it has no saved settings`
		});

		await exitEyas(electronApp);

		// ─── Phase 3: Relaunch as Project A — its setting should still be set ──
		// Because "Always choose" was saved under Project A's projectId, Project A
		// should skip the modal entirely when re-launched.
		electronApp = await launchEyas([], sharedUserDataDir, projectADir);
		uiPage = await getUiView(electronApp);

		const envModalA2 = uiPage.locator(`[data-qa="environment-modal-title"]`);

		// Give the app a moment to potentially show the modal (it should NOT)
		await new Promise(resolve => setTimeout(resolve, 3000));
		await expect(envModalA2).not.toBeVisible({
			message: `Project A should skip the modal because "Always choose" was already saved`
		});

		await exitEyas(electronApp);
	});
});
