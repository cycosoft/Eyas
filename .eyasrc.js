//get the current branch name for the version number
const { execSync } = require(`child_process`);
const branch = execSync(`git rev-parse --abbrev-ref HEAD`).toString().trim();

//export the config for the project
module.exports = {
	testSourceDirectory: `src/demo`,
	// serverPort: 3000,
	// customDomain: `demo.google.com`, //MAP demo.google.com localhost:3000 yes
	customDomain: `sub.demo.google.com`, //MAP sub.demo.google.com localhost:3000 yes
	// customDomain: `https://142.250.217.142`,
	// customDomain: `142.250.217.142`,
	// customDomain: `142.250.217.142/`,
	// customDomain: `142.250.217.142:80`,
	// customDomain: `142.250.217.142:80/`,
	// customDomain: `www.test.google.com`,
	// customDomain: `google.com`,
	// customDomain: `https://google.com`,
	// customDomain: `test.google.com/`,
	// customDomain: `test.google.com:80`,
	// customDomain: `https://test.google.com`,
	// customDomain: `https://test.google.com:80`,
	// customDomain: `https://www.google.com`,
	// customDomain: `https://www.google.com/`,
	// customDomain: `https://localhost:3000`,
	buildVersion: `${branch}`,
	appTitle: `Demo App`,
	appWidth: 1024,
	appHeight: 768,
	menu: [
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
