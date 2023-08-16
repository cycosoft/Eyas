module.exports = {
	appInput: `dist`,
	serverPort: 443,
	appUrl: `https://localhost:443`,
	buildVersion: (process.env.CURRENT_BRANCH || `Unknown Source Branch`).trim(),
	appTitle: ``,
	appWidth: 1024,
	appHeight: 768,
	menu: []
};
