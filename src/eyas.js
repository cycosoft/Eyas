/* global process */

// imports
const { app: electronLayer, BrowserWindow, Menu, dialog, shell } = require(`electron`);
const express = require(`express`);
const path = require(`path`);
const https = require(`https`);
const { createProxyMiddleware } = require(`http-proxy-middleware`);
var httpProxy = require(`http-proxy`);
const mkcert = require(`mkcert`);
const config = require(path.join(process.cwd(), `.eyasrc.js`));

// config
const appTitle = `Eyas`;
const serverPort = config.serverPort;
const serverUrl = `https://localhost:${serverPort}`;
const appUrl = config.appUrl || serverUrl;
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
	//build the default menu in MacOS style
	const menuDefault = [
		{
			label: appTitle,
			submenu: [
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
				}
			]
		},

		{
			label: `🧪 Testing`,
			submenu: [
				{
					label: `📦 Test in App`,
					click: () => navigate(appUrl)
				},
				{ type: `separator` },
				{
					label: `🖥️ Test in Browser`,
					click: () => navigate(appUrl, true)
				},
				{ type: `separator` },
				{
					label: `⚙️ DevTools`,
					click: () => clientWindow.webContents.openDevTools()
				},
				{ type: `separator` },
				{
					label: `♻️ Reload Page`,
					click: () => clientWindow.webContents.reloadIgnoringCache()
				}
			]
		}
	];

	// Add the menu items from the config
	if(config.menu?.length){
		//add a custom menu item
		const finalIndex = menuDefault.push({ label: `💼 Custom`, submenu: [] }) - 1;

		//push the custom items into the menu
		config.menu.forEach(item => menuDefault[finalIndex].submenu.push({
			label: item.label,
			click: () => navigate(item.url, item.external)
		}));
	}

	// Set the modified menu as the application menu
	Menu.setApplicationMenu(Menu.buildFromTemplate(menuDefault));
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
	expressLayer.use(express.static(path.join(process.cwd(), config.testSourceDirectory)));

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

	expressLayer.use((req, res, next) => {
		console.log(`Received request: ${req.method} ${req.url}`);
		next();
	});

	// Start the server
	https
		.createServer({ key: cert.key, cert: cert.cert }, expressLayer)
		.listen(serverPort);



	const proxy = httpProxy.createProxyServer({
		target: serverUrl,
		secure: true
	});

	const proxyServer = https.createServer((req, res) => {
		console.log(req.method, req.url);

		// Check the requested hostname
		if (req.headers.host === `google.com`) {
			// Intercept requests to google.com and redirect to localhost
			console.log(`Intercepted request to google.com`);
			proxy.web(req, res);
		} else {
			// Handle other requests here (if needed)
			console.log(`Received request:`, req.method, req.url);
			res.writeHead(200, { 'Content-Type': `text/plain` });
			res.end(`Hello from proxy server!`);
		}
	});

	proxyServer.listen(443, () => {
		console.log(`Proxy server is running on port 443`);
	});

	proxyServer.on(`error`, error => {
		console.error(`Proxy server error:`, error);
	});

	proxy.on(`error`, error => {
		console.error(`Proxy error:`, error);
	});




	// Properly close the server when the app is closed
	electronLayer.on(`before-quit`, () => process.exit(0));
}

// SSL/TSL: this is the self signed certificate support
electronLayer.on(`certificate-error`, (event, webContents, url, error, certificate, callback) => {
	// On certificate error we disable default behavior (stop loading the page)
	// and we then say "it is all fine - true" to the callback
	event.preventDefault();
	callback(true);
});