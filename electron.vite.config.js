/* global __dirname */

// imports
import { resolve } from 'path';
import { bytecodePlugin } from 'electron-vite';
import terser from '@rollup/plugin-terser';
import { ViteMinifyPlugin } from 'vite-plugin-minify';

// export the configuration settings
export default {
	preload: {
		plugins: [terser()],
		build: {
			rollupOptions: {
				input: {
					'get-roots': resolve(__dirname, `src/scripts/get-roots.js`),
					'get-config': resolve(__dirname, `src/scripts/get-config.js`)
				}
			},

			outDir: `dist/scripts`
		}
	},

	main: {
		plugins: [bytecodePlugin()],
		build: {
			rollupOptions: {
				input: {
					index: resolve(__dirname, `src/eyas-core/index.js`)
				}
			},

			outDir: `dist/eyas-core`
		}
	},

	renderer: {
		root: `src/eyas-interface`,
		plugins: [ViteMinifyPlugin()],
		build: {
			rollupOptions: {
				input: {
					interface: resolve(__dirname, `src/eyas-interface/analytics/index.html`)
				}
			},

			outDir: `dist/eyas-interface`
		}
	}
};
