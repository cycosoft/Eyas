'use strict';

function getConfig() {
	return {
		testSourceDirectory: `demo`,
		// serverPort: 3000,
		customDomain: `eyas.cycosoft.com`,
		// buildVersion: `v${version}`,
		appTitle: `CONFIG LOADER`,
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
}

// export the config for the project
module.exports = getConfig;
