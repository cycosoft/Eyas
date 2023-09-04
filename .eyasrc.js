//export the config for the project
module.exports = {
	test: {
		source: ``, // dist
		port: ``, // 3000
		domain: ``, // `locahost:${port}`
		title: ``, // `Eyas`
		version: ``, // current branch name
		resolutions: [ // prepends to menu of resolutions; defaults to first in list
			{ label: `SD Desktop`, width: 1024, height: 768 },
		],
		menu: [ // Adds a menu items of custom links
			{ label: `Cycosoft.com (browser)`, url: `https://cycosoft.com`, external: true }
		]
	},

	// defaults to current platform
	outputs: {
		maxCompression: false, // false
		windows: undefined, // undefined
		mac: undefined, // undefined
		linux: undefined // undefined
	}

	testSourceDirectory: `demo`,
	// serverPort: 3000,
	customDomain: `eyas.cycosoft.com`,
	// buildVersion: `v${version}`,
	appTitle: `Eyas App Demo`,
	appWidth: 1024,
	appHeight: 768,
	menu: [
		{ url: `server` },
		{ label: `Cycosoft.com (electron)`, url: `https://cycosoft.com` },
		{ label: `Cycosoft.com (browser)`, url: `https://cycosoft.com`, external: true },
		{ url: `https://142.250.217.142` },
		{ url: `142.250.217.142` },
		{ url: `142.250.217.142/` },
		{ url: `142.250.217.142:80` },
		{ url: `142.250.217.142:80/` },
		{ url: `www.test.google.com` },
		{ url: `google.com` },
		{ url: `test.google.com` },
		{ url: `demo.google.com` },
		{ url: `test.google.com/` },
		{ url: `test.google.com:80` },
		{ url: `https://test.google.com` },
		{ url: `https://test.google.com:80` },
		{ url: `https://www.google.com` },
		{ url: `https://www.google.com/` },
		{ url: `https://localhost:3000`, external: false }
	]
};
