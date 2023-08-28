const { defineConfig, bytecodePlugin } = require(`electron-vite`);

module.export = defineConfig({
	main: {
		plugins: [bytecodePlugin()]
	},
	preload: {
		plugins: [bytecodePlugin()]
	},
	renderer: {
		// ...
	}
});
