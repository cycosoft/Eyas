/* global __dirname */

// imports
import { resolve } from 'path';
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

			outDir: `.build/scripts`
		}
	},

	main: {
		plugins: [terser()],
		build: {
			rollupOptions: {
				input: {
					index: resolve(__dirname, `src/eyas-core/index.js`)
				}
			},

			outDir: `.build/eyas-core`
		}
	}
};
