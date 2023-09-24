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

	// renderer: {
	// 	root: `src/eyas-interface/app/dist`,
	// 	plugins: [ViteMinifyPlugin()],
	// 	resolve: {
	// 		alias: {
	// 			'@': resolve(__dirname, `src/eyas-interface/app/src`)
	// 		}
	// 	},
	// 	build: {
	// 		rollupOptions: {
	// 			input: {
	// 				'eyas-ui': resolve(__dirname, `src/eyas-interface/app/index.html`)
	// 			}
	// 		},

	// 		outDir: `dist/eyas-interface`
	// 	}
	// }
};
