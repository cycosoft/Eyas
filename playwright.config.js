/* global process */

import { defineConfig } from '@playwright/test';

export default defineConfig({
	testDir: `./tests/e2e`,
	globalSetup: `./tests/e2e/global-setup.mjs`,
	timeout: 30000,
	expect: {
		timeout: 10000
	},
	fullyParallel: false,
	forbidOnly: !!process.env.CI,
	retries: 0,
	workers: 1,
	reporter: `list`,
	use: {
		trace: `on-first-retry`
	},
	projects: [
		{
			name: `electron`,
			use: {}
		}
	],
	// Disable screenshots and videos by default
	screenshot: `off`,
	video: `off`
});
