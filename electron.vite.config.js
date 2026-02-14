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
					constants: resolve(__dirname, `src/scripts/constants.js`),
					'event-bridge': resolve(__dirname, `src/scripts/event-bridge.js`),
					'test-preload': resolve(__dirname, `src/scripts/test-preload.js`),
					'parse-url': resolve(__dirname, `src/scripts/parse-url.js`),
					'path-utils': resolve(__dirname, `src/scripts/path-utils.js`)
				}
			},

			outDir: `.pre-build/scripts`
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

			outDir: `.pre-build/eyas-core`
		}
	}
};
