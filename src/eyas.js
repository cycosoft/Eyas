/* global process */

'use strict';

// wrapped in an async function to allow for "root" await calls
(async () => {
	// imports
	const {
		app: electronLayer,
		BrowserWindow,
		Menu,
		dialog,
		shell
	} = require(`electron`);
	const express = require(`express`);
	const path = require(`path`);
	const https = require(`https`);
	const mkcert = require(`mkcert`);
	const config = require(path.join(process.cwd(), `.eyasrc.js`));
	const { isURL } = require(`validator`);
	const parseURL = require(`url-parse`);
	const ip = require(`ip`);

	// config
	const appName = `Eyas`;
	const testServerPort = config.serverPort || 3000;
	const testServerUrl = `https://localhost:${testServerPort}`;
	const appUrlOverride = formatURL(config.customDomain);
	const appUrl = appUrlOverride || testServerUrl;
	let clientWindow = null;
	let expressLayer = null;
	let testServer = null;
	const windowConfig = {
		width: config.appWidth,
		height: config.appHeight,
		title: getAppTitle()
	};

	// Configure Electron to ignore certificate errors
	electronLayer.commandLine.appendSwitch(`ignore-certificate-errors`);

	// if a custom domain is provided
	if(appUrlOverride){
		// config
		let map = `MAP `;
		const { hostname: routeFrom } = new URL(appUrlOverride);
		const { host: routeTo } = new URL(testServerUrl);

		// test if the string is an IP address
		if(!ip.isV4Format(routeFrom) && !ip.isV6Format(routeFrom)){
			// prepend MAP with wildcard
			// map += `*.`;
		}

		// add the route to the map
		map += `${routeFrom} ${routeTo}`;

		console.log({routeFrom}, {routeTo});
		console.log(`formatted as:`, map);

		// override requests to the custom domain to use the test server
		electronLayer.commandLine.appendSwitch(`host-resolver-rules`, map);
	}

	// start the test server
	setupTestServer();

	// format the url for electron consumption
	function formatURL(url) {
		// config
		let output = null;

		// exit if not a valid url
		if(!url || !isURL(url)){ return output; }

		// parse the url
		const parsed = parseURL(url);

		// if the url is missing a protocol
		if(!parsed.protocol){
			// default to https
			parsed.set(`protocol`, `https`);
		}

		// grab the url as a string from the parsed object
		output = parsed.toString();

		console.log({output});

		// console.log(`new URL`, new URL(output));

		// send back formatted string
		return output;
	}

	// then listen for the app to be ready
	function electronInit() {
		electronLayer.whenReady()
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
	}

	// Quit when all windows are closed, except on macOS. There, it`s common for
	// applications and their menu bar to stay active until the user quits
	electronLayer.on(`window-all-closed`, () => {
		if (process.platform !== `darwin`) {
			electronLayer.quit();
		}
	});

	function setMenu () {
	// build the default menu in MacOS style
		const menuDefault = [
			{
				label: appName,
				submenu: [
					{
						label: `🏃 Exit`,
						click: () => {
							dialog.showMessageBox({
								type: `question`,
								buttons: [`Yes`, `No`],
								title: `Exit Confirmation`,
								message: `Close ${appName}?`
							}).then(result => {
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
			// add a custom menu item
			const finalIndex = menuDefault.push({ label: `💼 Custom`, submenu: [] }) - 1;

			// push the custom items into the menu
			config.menu.forEach(item => menuDefault[finalIndex].submenu.push({
				label: item.label || item.url,
				click: () => navigate(formatURL(item.url) || testServerUrl, item.external)
			}));
		}

		// Set the modified menu as the application menu
		Menu.setApplicationMenu(Menu.buildFromTemplate(menuDefault));
	}

	// manage navigation
	function navigate (url, external) {
		// go to the requested url in electron
		!external && clientWindow.loadURL(url);

		// open the requested url in the default browser
		external && shell.openExternal(url);
	}

	// Configure and create an instance of BrowserWindow to display the UI
	function startApplication() {
		// Create the browser window
		clientWindow = new BrowserWindow(windowConfig);

		// Create a menu template
		setMenu();

		// Prevent the title from changing
		clientWindow.on(`page-title-updated`, evt => {
			// Prevent the app from changing the title automatically
			evt.preventDefault();

			// set a custom title
			clientWindow.setTitle(getAppTitle());
		});

		// Load the index.html of the app
		navigate(appUrl);
	}

	// Get the app title
	function getAppTitle() {
		// Always start with the app name
		let output = `${appName}`;

		// Add the app title
		output += ` :: ${config.appTitle.trim() || `Unknown App`}`;

		// Add the build version
		output += ` :: ${config.buildVersion.trim() || `Unspecified Build`} ✨`;

		// Add the current URL if it`s available
		if (clientWindow){
			output += ` :: ( ${clientWindow.webContents.getURL()} )`;
		}

		// Return the built title
		return output;
	}

	// Set up Express to serve files from dist/
	async function setupTestServer() {
		// Create the Express app
		expressLayer = express();

		// Serve static files from dist/
		expressLayer.use(express.static(path.join(process.cwd(), config.testSourceDirectory)));

		const ca = await mkcert.createCA({
			organization: `Cycosoft, LLC - Test Server`,
			countryCode: `US`,
			state: `Arizona`,
			locality: `Chandler`,
			validityDays: 7
		});

		const cert = await mkcert.createCert({
			ca,
			domains: [`localhost`],
			validity: 7
		});

		// Start the server
		testServer = https
			.createServer({ key: cert.key, cert: cert.cert }, expressLayer)
			.listen(testServerPort, electronInit);
	}

	// Properly close the server when the app is closed
	electronLayer.on(`before-quit`, () => {
		// Shut down the HTTPS server
		testServer.close(() => {
			// Exit the Node.js process with a status code of 0
			process.exit(0);
		});
	});
})();