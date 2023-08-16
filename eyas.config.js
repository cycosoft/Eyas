module.exports = {
	testSourceDirectory: `demo`,
	serverPort: 3000,
	appUrl: null,
	buildVersion: (process.env.CURRENT_BRANCH || `Unknown Source Branch`).trim(),
	appTitle: `Demo App`,
	appWidth: 1024,
	appHeight: 768,
	menu: []
};
