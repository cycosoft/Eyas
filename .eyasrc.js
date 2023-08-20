//get the current branch name for the version number
const execSync = require(`child_process`).execSync;
const branch = execSync(`git rev-parse --abbrev-ref HEAD`).toString().trim();

//export the config for the project
module.exports = {
	testSourceDirectory: `src/demo`,
	// serverPort: 3000,
	appUrl: `https://google.com`,
	buildVersion: `${branch}`,
	appTitle: `Demo App`,
	appWidth: 1024,
	appHeight: 768,
	menu: [{ label: `Cycosoft.com`, url: `https://cycosoft.com`, external: false }]
};
