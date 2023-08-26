//get the current branch name for the version number
const { execSync } = require(`child_process`);
const branch = execSync(`git rev-parse --abbrev-ref HEAD`).toString().trim();

//export the config for the project
module.exports = {
	testSourceDirectory: `src/demo`,
	// serverPort: 3000,
	// customDomain: `142.250.217.142`,
	// customDomain: `142.250.217.142:80`,
	// customDomain: `test.google.com`,
	// customDomain: `test.google.com:80`,
	customDomain: `https://test.google.com`,
	// customDomain: `https://test.google.com:80`,
	buildVersion: `${branch}`,
	appTitle: `Demo App`,
	appWidth: 1024,
	appHeight: 768,
	menu: [
		{ label: `Cycosoft.com`, url: `https://cycosoft.com`, external: false },
		{ label: `https://www.google.com`, url: `https://www.google.com`, external: false },
		{ label: `Test Server`, url: `https://localhost:3000`, external: false }
	]
};
