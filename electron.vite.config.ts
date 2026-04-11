import { resolve } from 'path';
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import vue from '@vitejs/plugin-vue';
import vuetify from 'vite-plugin-vuetify';

export default defineConfig({
	main: {
		plugins: [
			externalizeDepsPlugin(),
			viteStaticCopy({
				targets: [
					{
						src: resolve(__dirname, `src/eyas-assets/**/*`).replace(/\\/g, `/`),
						dest: `../eyas-assets`
					}
				]
			})
		],
		build: {
			rollupOptions: {
				input: {
					index: resolve(__dirname, `src/eyas-core/index.js`),
					'menu-template': resolve(__dirname, `src/eyas-core/menu-template.js`),
					'update-dialog': resolve(__dirname, `src/eyas-core/update-dialog.js`),
					'metrics-events': resolve(__dirname, `src/eyas-core/metrics-events.js`),
					'settings-service': resolve(__dirname, `src/eyas-core/settings-service.js`),
					'deep-link-handler': resolve(__dirname, `src/eyas-core/deep-link-handler.js`),
					'test-server/test-server': resolve(__dirname, `src/eyas-core/test-server/test-server.js`),
					'test-server/test-server-certs': resolve(__dirname, `src/eyas-core/test-server/test-server-certs.js`),
					'test-server/test-server-timeout': resolve(__dirname, `src/eyas-core/test-server/test-server-timeout.js`)
				},
				output: {
					entryFileNames: `[name].js`
				},
				external: [/^..\/scripts\//, /^..\/..\/package\.json$/]
			},
			emptyOutDir: true
		}
	},
	preload: {
		plugins: [externalizeDepsPlugin()],
		build: {
			rollupOptions: {
				input: {
					'get-roots': resolve(__dirname, `src/scripts/get-roots.js`),
					'get-config': resolve(__dirname, `src/scripts/get-config.js`),
					'get-app-title': resolve(__dirname, `src/scripts/get-app-title.js`),
					constants: resolve(__dirname, `src/scripts/constants.js`),
					'event-bridge': resolve(__dirname, `src/scripts/event-bridge.js`),
					'test-preload': resolve(__dirname, `src/scripts/test-preload.js`),
					'parse-url': resolve(__dirname, `src/scripts/parse-url.js`),
					'path-utils': resolve(__dirname, `src/scripts/path-utils.js`),
					'time-utils': resolve(__dirname, `src/scripts/time-utils.js`),
					'variable-utils': resolve(__dirname, `src/scripts/variable-utils.js`)
				},
				output: {
					entryFileNames: `[name].js`
				}
			},
			outDir: `out/scripts`,
			emptyOutDir: true
		}
	},
	renderer: {
		plugins: [
			vue(),
			vuetify({ autoImport: true })
		],
		root: resolve(__dirname, `src/eyas-interface/app`),
		resolve: {
			alias: {
				vue: `vue/dist/vue.esm-bundler.js`,
				'@': resolve(__dirname, `src/eyas-interface/app/src`)
			}
		},
		build: {
			rollupOptions: {
				input: resolve(__dirname, `src/eyas-interface/app/index.html`)
			},
			outDir: resolve(__dirname, `out/eyas-interface`),
			emptyOutDir: true
		}
	}
});

