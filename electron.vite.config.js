import { bytecodePlugin } from 'electron-vite';

export default {
	main: {
		plugins: [bytecodePlugin()],
		build: {
			outDir: `dist/eyas`
		}
	}
};
