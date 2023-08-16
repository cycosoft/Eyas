// imports
const { app: electronLayer, BrowserWindow, Menu, dialog, shell } = require(`electron`);
const express = require(`express`);
const path = require(`path`);
const serverLayer = require(`https`);
const mkcert = require(`mkcert`);
const config = require(`./eyas.config.js`);

// config
const appTitle = `Eyas`;
const serverPort = config.serverPort;
const appUrl = config.appUrl || `https://localhost:${serverPort}`;
const windowConfig = {
	width: config.appWidth,
	height: config.appHeight,
	title: `${appTitle} : ${config.appTitle} : ${config.buildVersion || `Unspecified Build`} ✨`.trim()
};
let clientWindow = null;
let expressLayer = null;

// start the server to manage requests
setupServer()
	// then listen for the app to be ready
	.then(() => electronLayer.whenReady())
	// then create the UI
	.then(() => {
		startApplication();

		// On macOS it`s common to re-create a window in the app when the
		// dock icon is clicked and there are no other windows open
		electronLayer.on(`activate`, () => {
			if (BrowserWindow.getAllWindows().length === 0) {
				startApplication();
			}
		});
	});

// Quit when all windows are closed, except on macOS. There, it`s common for
// applications and their menu bar to stay active until the user quits
electronLayer.on(`window-all-closed`, () => {
	if (process.platform !== `darwin`) {
		electronLayer.quit();
	}
});

function setMenu () {
	// Create a new menu template
	const menuTemplate = [
		{
			label: `🏃 Exit`,
			click: () => {
				dialog.showMessageBox({
					type: `question`,
					buttons: [`Yes`, `No`],
					title: `Exit Confirmation`,
					message: `Close ${appTitle}?`
				}).then((result) => {
					// User clicked "Yes"
					if (result.response === 0) {
						electronLayer.quit();
					}
				});
			}
		},
		{
			label: `🩻 DevTools`,
			click: () => clientWindow.webContents.openDevTools()
		},
		{
			label: `📦 Test in App`,
			click: () => navigate(appUrl)
		},
		{
			label: `🖥️ Test in Browser`,
			click: () => navigate(appUrl, true)
		},
		{
			label: `♻️ Reload Page`,
			click: () => clientWindow.webContents.reloadIgnoringCache()
		}
	];

	// Add a separator if there are custom menu items
	if(config.menu.length > 0) menuTemplate.push({ type: `separator` });

	// Add the menu items from the config
	config.menu.forEach(item => menuTemplate.push({
		label: item.label,
		click: () => navigate(item.url, item.external)
	}));

	// Set the modified menu as the application menu
	Menu.setApplicationMenu(Menu.buildFromTemplate(menuTemplate));
}

function navigate (url, external) {
	// go to the requested url in electron
	!external && clientWindow.loadURL(url);

	// open the requested url in the default browser
	external && shell.openExternal(url);
}

// Configure and create an instance of BrowserWindow to display the UI
function startApplication () {
	// Create the browser window
	clientWindow = new BrowserWindow(windowConfig);

	// Create a menu template
	setMenu();

	// Prevent the title from changing
	clientWindow.on(`page-title-updated`, (evt) => evt.preventDefault());

	// Load the index.html of the app
	navigate(appUrl);
}

// Set up Express to serve files from dist/
async function setupServer () {
	// Create the Express app
	expressLayer = express();

	// Serve static files from dist/
	expressLayer.use(express.static(path.join(__dirname, config.testSourceDirectory)));

	// create SSL certificate for the server
	const ca = await mkcert.createCA({
		organization: `Cycosoft, LLC`,
		countryCode: `US`,
		state: `Arizona`,
		locality: `Chandler`,
		validityDays: 1
	});

	const cert = await mkcert.createCert({
		domains: [`localhost`],
		validityDays: 1,
		caKey: ca.key,
		caCert: ca.cert
	});

	// Start the server
	serverLayer
		.createServer({ key: cert.key, cert: cert.cert }, expressLayer)
		.listen(serverPort);

	// Properly close the server when the app is closed
	electronLayer.on(`before-quit`, () => process.exit(0));
}

// SSL/TSL: this is the self signed certificate support
electronLayer.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
	// On certificate error we disable default behavior (stop loading the page)
	// and we then say "it is all fine - true" to the callback
	event.preventDefault();
	callback(true);
});