import fs from 'fs-extra';
import path from 'path';
import { execSync } from 'child_process';

/**
 * Playwright global setup hook.
 * Ensures the application is compiled and deletes the .test-data directory
 * to ensure a clean slate for the test suite.
 */
async function globalSetup() {
	const testDataPath = path.join(import.meta.dirname, `../../.test-data`);

	// Ensure the directory exists or just remove it if it does
	if (await fs.pathExists(testDataPath)) {
		await fs.remove(testDataPath);
	}

	// Automate the compilation step so it's impossible to run tests against stale code.
	// We skip this if SKIP_BUILD=true is provided for manual debugging.
	if (process.env.SKIP_BUILD !== `true`) {
		console.log(`\n--- [Auto-Build] Ensuring Eyas is compiled ---`);
		execSync(`npm run compile:build`, { stdio: `inherit` });
		console.log(`--- [Auto-Build] Done ---\n`);
	}
}

export default globalSetup;
