import { defineConfig } from 'vitest/config';
import { commonAliases } from './src/path-aliases.js';

export default defineConfig({
	resolve: {
		alias: commonAliases
	},
	test: {
		globals: true,
		environment: `jsdom`,
		include: [`tests/unit/demo/**/*.test.{js,ts}`],
		exclude: [`tests/e2e/**`, `tests/electron/**`]
	}
});
