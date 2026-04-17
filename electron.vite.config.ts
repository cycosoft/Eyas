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
						src: resolve(import.meta.dirname, `src/eyas-assets/**/*`).replace(/\\/g, `/`),
						dest: `../eyas-assets`
					}
				]
			})
		],
		build: {
			rollupOptions: {
				input: {
					index: resolve(import.meta.dirname, `src/eyas-core/index.js`),
					'menu-template': resolve(import.meta.dirname, `src/eyas-core/menu-template.js`),
					'update-dialog': resolve(import.meta.dirname, `src/eyas-core/update-dialog.js`),
					'metrics-events': resolve(import.meta.dirname, `src/eyas-core/metrics-events.js`),
					'settings-service': resolve(import.meta.dirname, `src/eyas-core/settings-service.js`),
					'deep-link-handler': resolve(import.meta.dirname, `src/eyas-core/deep-link-handler.js`),
					'test-server/test-server': resolve(import.meta.dirname, `src/eyas-core/test-server/test-server.js`),
					'test-server/test-server-certs': resolve(import.meta.dirname, `src/eyas-core/test-server/test-server-certs.js`),
					'test-server/test-server-timeout': resolve(import.meta.dirname, `src/eyas-core/test-server/test-server-timeout.js`)
				},
				output: {
					// Output as native ESM. The root package.json has "type": "module",
					// and out/package.json mirrors this, so Node.js treats .js files as ESM.
					entryFileNames: `[name].js`,
					format: `es`
				},
				external: []
			},
			emptyOutDir: true
		}
	},
	preload: {
		plugins: [externalizeDepsPlugin()],
		build: {
			rollupOptions: {
				input: {
					'get-roots': resolve(import.meta.dirname, `src/scripts/get-roots.js`),
					'get-config': resolve(import.meta.dirname, `src/scripts/get-config.js`),
					'get-app-title': resolve(import.meta.dirname, `src/scripts/get-app-title.js`),
					constants: resolve(import.meta.dirname, `src/scripts/constants.js`),
					'event-bridge': resolve(import.meta.dirname, `src/scripts/event-bridge.js`),
					'test-preload': resolve(import.meta.dirname, `src/scripts/test-preload.js`),
					'parse-url': resolve(import.meta.dirname, `src/scripts/parse-url.js`),
					'path-utils': resolve(import.meta.dirname, `src/scripts/path-utils.js`),
					'time-utils': resolve(import.meta.dirname, `src/scripts/time-utils.js`),
					'variable-utils': resolve(import.meta.dirname, `src/scripts/variable-utils.js`)
				},
				output: {
					// IMPORTANT: Electron's preload sandbox REQUIRES CommonJS (.js) scripts.
					// Do NOT change this to 'es' format. Even though the project uses
					// "type": "module", Electron enforces CJS for preload scripts as a
					// hard security constraint. Changing this will break the app at runtime.
					entryFileNames: `[name].js`,
					format: `cjs`
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
		root: resolve(import.meta.dirname, `src/eyas-interface/app`),
		resolve: {
			alias: {
				vue: `vue/dist/vue.esm-bundler.js`,
				'@': resolve(import.meta.dirname, `src/eyas-interface/app/src`)
			}
		},
		build: {
			rollupOptions: {
				input: resolve(import.meta.dirname, `src/eyas-interface/app/index.html`)
			},
			outDir: resolve(import.meta.dirname, `out/eyas-interface`),
			emptyOutDir: true
		}
	}
});

