#!/usr/bin/env node

const fs = require(`fs-extra`);

const targets = [
	// UI Assets
	{ src: `src/eyas-interface/splash.html`, dest: `out/eyas-interface/splash.html` },
	{ src: `src/eyas-assets`, dest: `out/eyas-assets` },

	// Main Process Assets (relative to out/main)
	{ src: `package.json`, dest: `out/package.json` },
	{ src: `src/eyas-core/menu-template.js`, dest: `out/main/menu-template.js` },
	{ src: `src/eyas-core/update-dialog.js`, dest: `out/main/update-dialog.js` },
	{ src: `src/eyas-core/metrics-events.js`, dest: `out/main/metrics-events.js` },
	{ src: `src/eyas-core/settings-service.js`, dest: `out/main/settings-service.js` },
	{ src: `src/eyas-core/deep-link-handler.js`, dest: `out/main/deep-link-handler.js` },
	{ src: `src/eyas-core/test-server`, dest: `out/main/test-server` }
];

targets.forEach(target => {
	try {
		fs.copySync(target.src, target.dest, { overwrite: true });
		console.log(`Copied ${target.src} to ${target.dest}`);
	} catch (err) {
		console.error(`Failed to copy ${target.src} to ${target.dest}:`, err.message);
	}
});
