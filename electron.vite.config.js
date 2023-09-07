/* global __dirname */

// imports
import { resolve } from 'path';
import { bytecodePlugin } from 'electron-vite';
import terser from '@rollup/plugin-terser';

// export the configuration settings
export default {
	preload: {
		plugins: [terser()],
		build: {
			rollupOptions: {
				input: {
					paths: resolve(__dirname, `src/scripts/paths.js`),
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
					// update the path to the entry point
					index: resolve(__dirname, `src/eyas/index.js`)
				}
			},

			outDir: `dist/eyas`
		}
	}
};
