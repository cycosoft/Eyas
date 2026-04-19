import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
	resolve: {
		alias: {
			'@core': resolve(import.meta.dirname, `src/eyas-core`),
			'@scripts': resolve(import.meta.dirname, `src/scripts`),
			'@registry': resolve(import.meta.dirname, `src/types`),
			'@assets': resolve(import.meta.dirname, `src/eyas-assets`)
		}
	},
	test: {
		globals: true,
		environment: `node`,
		include: [`tests/electron/**/*.test.{js,ts}`],
		exclude: [`tests/e2e/**`, `tests/unit/**`]
	}
});

