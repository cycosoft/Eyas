const { defineConfig } = require(`@playwright/test`);

module.exports = defineConfig({
	testDir: `./tests/e2e`,
	timeout: 5000,
	expect: {
		timeout: 2000
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
