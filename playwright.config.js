/* global process */

const { defineConfig } = require(`@playwright/test`);

module.exports = defineConfig({
	testDir: `./tests/e2e`,
	globalSetup: require.resolve(`./tests/e2e/global-setup.js`),
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
