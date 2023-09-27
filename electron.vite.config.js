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
					'get-roots': resolve(__dirname, `src/scripts/get-roots.js`),
					'get-config': resolve(__dirname, `src/scripts/get-config.js`),
					'event-bridge': resolve(__dirname, `src/scripts/event-bridge.js`)
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
	}
};
