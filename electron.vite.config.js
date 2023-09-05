/* global __dirname */

// imports
import { resolve } from 'path';
import { bytecodePlugin } from 'electron-vite';

// export the configuration settings
export default {
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
