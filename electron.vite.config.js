import { bytecodePlugin } from 'electron-vite';

export default {
	main: {
		plugins: [bytecodePlugin()],
		build: {
			outDir: `dist/eyas`
		}
	}
	// preload: {
	// 	build: {
	// 		outDir: 'dist/preload'
	// 	}
	// },
	// renderer: {
	// 	build: {
	// 		outDir: 'dist/renderer'
	// 	}
	// }
};
