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
		setupFiles: [`./tests/setup/vue-test-setup.js`],
		include: [`tests/unit/**/*.test.js`],
		exclude: [`tests/e2e/**`, `tests/electron/**`],
		css: {
			include: [/.+/]
		}
	}
});
