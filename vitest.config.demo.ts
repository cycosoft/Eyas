import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		globals: true,
		environment: `jsdom`,
		include: [`tests/unit/demo/**/*.test.{js,ts}`],
		exclude: [`tests/e2e/**`, `tests/electron/**`]
	}
});
