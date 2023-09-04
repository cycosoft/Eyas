//export the config for the project
module.exports = {
	test: {
		source: `demo`, // dist
		port: ``, // 3000
		domain: `eyas.cycosoft.com`, // `locahost:${port}`
		title: `Eyas App Demo`, // `Eyas`
		version: ``, // current branch name
		resolutions: [ // prepends to menu of resolutions; defaults to first in list
			{ label: `SD Desktop`, width: 1024, height: 768 },
		],
		menu: [ // Adds a menu items of custom links
			{ label: `Cycosoft.com (browser)`, url: `https://cycosoft.com`, external: true },
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
	},

	// defaults to current platform
	outputs: {
		maxCompression: false, // false
		windows: undefined, // undefined
		mac: undefined, // undefined
		linux: undefined // undefined
	}
};
