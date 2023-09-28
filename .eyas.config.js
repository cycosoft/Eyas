// export the config for the project
module.exports = {
	test: {
		source: `demo`,
		// port: ``,
		domain: `eyas.cycosoft.com/demo/path?query=string#hash`,
		routes: [{ from: `/REDIRECT`, to: `/demo/alt` }],
		title: `Eyas App Demo`,
		version: ``,
		viewports: [
			{ label: `Custom Size`, width: 1024, height: 768 }
		],
		menu: [
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
		expires: 7 * 24, // hours
		compression: `store`,
		// windows: true,
		// mac: true,
		// linux: true
	}
};
