import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Playwright global setup hook.
 * Deletes the .test-data directory to ensure a clean slate for the test suite.
 */
async function globalSetup() {
	const testDataPath = path.join(__dirname, `../../.test-data`);

	// Ensure the directory exists or just remove it if it does
	if (await fs.pathExists(testDataPath)) {
		await fs.remove(testDataPath);
	}
}

export default globalSetup;
