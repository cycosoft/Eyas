import { defineConfig } from 'vitest/config';
import { commonAliases } from './src/path-aliases.js';

export default defineConfig({
	resolve: {
		alias: commonAliases
	},

	test: {
		globals: true,
		environment: `node`,
		include: [`tests/electron/**/*.test.{js,ts}`],
		exclude: [`tests/e2e/**`, `tests/unit/**`],
		testTimeout: 15000
	}
});

