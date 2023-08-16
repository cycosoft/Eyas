// imports
const { app: electronLayer, BrowserWindow, Menu, dialog, shell } = require(`electron`);
const express = require(`express`);
const path = require(`path`);
const serverLayer = require(`https`);
const mkcert = require(`mkcert`);
const config = require(`./eyas.config.js`);

// TODO manage config defaults

// config
const serverPort = config.port;
const appUrl = config.appUrl || `https://localhost:${serverPort}`;
const windowConfig = {
	width: config.appWidth,
	height: config.appHeight,
	title: `Eyas : ${config.appTitle} : ${config.buildVersion}`
};
let clientWindow = null;
let expressLayer = null;

// start the server to manage requests
setupServer()
	// then listen for the app to be ready
	.then(() => electronLayer.whenReady())
	// then create the UI
	.then(() => {
		console.log(`whenReady ()`, 0);
		startApplication();
		console.log(`whenReady ()`, 1);

		// On macOS it`s common to re-create a window in the app when the
		// dock icon is clicked and there are no other windows open
		electronLayer.on(`activate`, () => {
			console.log(`activate ()`, 0);
			if (BrowserWindow.getAllWindows().length === 0) {
				console.log(`activate ()`, 1);
				startApplication();
			}
		});
	});

// Quit when all windows are closed, except on macOS. There, it`s common for
// applications and their menu bar to stay active until the user quits
electronLayer.on(`window-all-closed`, () => {
	console.log(`window-all-closed ()`, 0);
	if (process.platform !== `darwin`) {
		console.log(`window-all-closed ()`, 1);
		electronLayer.quit();
	}
});

function setMenu () {
	console.log(`setMenu ()`, 0);
	// Create a new menu template
	const menuTemplate = [
		{
			label: `Exit`,
			click: () => {
				dialog.showMessageBox({
					type: `question`,
					buttons: [`Yes`, `No`],
					title: `Exit Confirmation`,
					message: `Close the test?`
				}).then((result) => {
					// User clicked "Yes"
					if (result.response === 0) {
						electronLayer.quit();
					}
				});
			}
		},
		{ type: `separator` },
		{
			label: `Open Dev Tools`,
			click: () => clientWindow.webContents.openDevTools()
		},
		{ type: `separator` },
		{
			label: `Test in App`,
			click: () => navigate(appUrl)
		},
		{ type: `separator` },
		{
			label: `Test in Browser`,
			click: () => navigate(appUrl, true)
		},
		{ type: `separator` },
		{
			label: `Reload Page`,
			click: () => clientWindow.webContents.reloadIgnoringCache()
		}
	];
	console.log(`setMenu ()`, 1);

	// Add the menu items from the config
	// config.menu.forEach(item => menuTemplate.push({
	// 	label: item.label,
	// 	click: () => navigate(item.url)
	// }));
	console.log(`setMenu ()`, 2);

	// Set the modified menu as the application menu
	Menu.setApplicationMenu(Menu.buildFromTemplate(menuTemplate));
	console.log(`setMenu ()`, 3);
}

function navigate (url, external) {
	console.log(`navigate ()`, 0);
	// go to the requested url in electron
	!external && clientWindow.loadURL(url);
	console.log(`navigate ()`, 1);

	// open the requested url in the default browser
	external && shell.openExternal(url);
	console.log(`navigate ()`, 2);
}

// Configure and create an instance of BrowserWindow to display the UI
function startApplication () {
	console.log(`startApplication ()`, 0);
	// Create the browser window
	clientWindow = new BrowserWindow(windowConfig);
	console.log(`startApplication ()`, 1);

	// Prevent the title from changing
	// clientWindow.on(`page-title-updated`, (evt) => evt.preventDefault());
	console.log(`startApplication ()`, 2);

	// Create a menu template
	// setMenu();
	console.log(`startApplication ()`, 3);

	// Load the index.html of the app
	// navigate(appUrl);
	console.log(`startApplication ()`, 4);
}

// Set up Express to serve files from dist/
async function setupServer () {
	// Create the Express app
	expressLayer = express();
	console.log(`setupServer ()`, 0);

	// Serve static files from dist/
	expressLayer.use(express.static(path.join(__dirname, config.appInput)));
	console.log(`setupServer ()`, 1);

	// create SSL certificate for the server
	const ca = await mkcert.createCA({
		organization: `Cycosoft, LLC`,
		countryCode: `US`,
		state: `Arizona`,
		locality: `Chandler`,
		validityDays: 1
	});
	console.log(`setupServer ()`, 2);

	const cert = await mkcert.createCert({
		domains: [`localhost`],
		validityDays: 1,
		caKey: ca.key,
		caCert: ca.cert
	});
	console.log(`setupServer ()`, 3);

	// Start the server
	serverLayer
		.createServer({ key: cert.key, cert: cert.cert }, expressLayer)
		.listen(serverPort);
	console.log(`setupServer ()`, 4);

	// Properly close the server when the app is closed
	electronLayer.on(`before-quit`, () => process.exit(0));
	console.log(`setupServer ()`, 5);
}

// SSL/TSL: this is the self signed certificate support
electronLayer.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
	console.log(`certificate-error ()`, 0);
	// On certificate error we disable default behaviour (stop loading the page)
	// and we then say "it is all fine - true" to the callback
	event.preventDefault();
	callback(true);
});