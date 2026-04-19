import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';
import vuetify from 'vite-plugin-vuetify';
import { resolve } from 'path';

export default defineConfig({
	plugins: [
		vue(),
		vuetify({ autoImport: true })
	],
	resolve: {
		alias: {
			'@core': resolve(import.meta.dirname, `src/eyas-core`),
			'@scripts': resolve(import.meta.dirname, `src/scripts`),
			'@registry': resolve(import.meta.dirname, `src/types`),
			'@assets': resolve(import.meta.dirname, `src/eyas-assets`),
			'@interface': resolve(import.meta.dirname, `src/eyas-interface/app/src`),
			'@': resolve(import.meta.dirname, `src/eyas-interface/app/src`)
		}
	},

	css: {
		modules: {
			classNameStrategy: `non-scoped`
		}
	},
	test: {
		globals: true,
		environment: `jsdom`,
		pool: `vmThreads`,
		setupFiles: [`./tests/setup/vue-test-setup.ts`],
		include: [`tests/unit/**/*.test.{js,ts}`],
		exclude: [`tests/e2e/**`, `tests/electron/**`],
		css: {
			include: [/.+/]
		}
	}
});
