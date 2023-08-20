/* global process */

//note https://httptoolkit.com/blog/javascript-mitm-proxy-mockttp/

//wrapped in an async function to allow for await calls
(async () => {
	// imports
	const { app: electronLayer, BrowserWindow, Menu, dialog, shell } = require(`electron`);
	const express = require(`express`);
	const path = require(`path`);
	const https = require(`https`);
	const mkcert = require(`mkcert`);
	const mockttp = require(`mockttp`);
	const config = require(path.join(process.cwd(), `.eyasrc.js`));

	// config
	const appTitle = `Eyas`;
	const testServerPort = config.serverPort || 3000;
	const testServerUrl = `https://localhost:${testServerPort}`;
	const appUrl = config.appUrl || testServerUrl;
	const windowConfig = {
		width: config.appWidth,
		height: config.appHeight,
		title: `${appTitle} : ${config.appTitle} : ${config.buildVersion || `Unspecified Build`} ✨`.trim()
	};
	let clientWindow = null;
	let expressLayer = null;

	// start the test server
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
	async function startApplication () {
	// Create the browser window
		clientWindow = new BrowserWindow(windowConfig);

		// start the proxy server
		createProxyServer();

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
			.listen(testServerPort);

		console.log(`Test server listening on port ${testServerPort}`);

		// Properly close the server when the app is closed
		electronLayer.on(`before-quit`, () => process.exit(0));
	}

	async function createProxyServer() {
		//if the user didn't specify an appUrl, don't create a proxy server
		if(!config.appUrl){ return; }

		// Create a proxy server with a self-signed HTTPS CA certificate:
		const https = await mockttp.generateCACertificate();
		const proxyServer = mockttp.getLocal({ https });

		//set up a general rule to allow all requests to continue as normal
		proxyServer.forAnyRequest().thenPassThrough();

		// Redirect any github requests to wikipedia.org:
		proxyServer.forAnyRequest()
			.forHostname(appUrl)
			.thenForwardTo(testServerUrl);

		// Start the server
		await proxyServer.start();

		console.log(`proxy server.port`, proxyServer.port);

		//require requests to be made through the proxy
		clientWindow.webContents.session.setProxy({
			proxyRules: `http://localhost:${proxyServer.port}`
		});
	}

	// SSL/TSL: this is the self signed certificate support
	electronLayer.on(`certificate-error`, (event, webContents, url, error, certificate, callback) => {
	// On certificate error we disable default behavior (stop loading the page)
	// and we then say "it is all fine - true" to the callback
		event.preventDefault();
		callback(true);
	});
})();
