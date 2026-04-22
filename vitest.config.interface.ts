import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';
import vuetify from 'vite-plugin-vuetify';
import { rendererAliases } from './src/path-aliases.js';

export default defineConfig({
	plugins: [
		vue(),
		vuetify({ autoImport: true })
	],
	resolve: {
		alias: rendererAliases
	},


	test: {
		globals: true,
		environment: `jsdom`,
		pool: `vmThreads`,
		setupFiles: [`./tests/setup/vue-test-setup.ts`],
		include: [`tests/unit/**/*.test.{js,ts}`],
		exclude: [`tests/e2e/**`, `tests/electron/**`]
		// css: {
		// 	include: [/.+/]
		// }
	}
});
