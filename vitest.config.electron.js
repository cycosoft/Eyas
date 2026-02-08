import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		globals: true,
		environment: `node`,
		include: [`tests/electron/**/*.test.js`],
		exclude: [`tests/e2e/**`, `tests/unit/**`]
	}
});
