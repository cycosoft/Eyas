/* global __dirname */

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
	const { isURL } = require(`validator`);
	const parseURL = require(`url-parse`);

	// setup
	const roots = require(path.join(__dirname, `scripts`, `get-roots.js`));
	const paths = {
		configLoader: path.join(roots.eyas, `scripts`, `get-config.js`),
		icon: path.join(roots.eyas, `eyas-assets`, `eyas-logo.png`),
		testSrc: path.join(roots.eyas, `test`)
	};

	// load the users config
	const config = require(paths.configLoader);

	// config
	const appName = `Eyas`;
	const testServerPort = config.test.port;
	const testServerUrl = `https://localhost:${testServerPort}`;
	const appUrlOverride = formatURL(config.test.domain);
	const appUrl = appUrlOverride || testServerUrl;
	let clientWindow = null;
	let expressLayer = null;
	let testServer = null;
	const appDimensions = [
		...config.test.dimensions,
		{ isDefault: true, label: `Desktop`, width: 1366, height: 768 },
		{ isDefault: true, label: `Tablet`, width: 768, height: 1024 },
		{ isDefault: true, label: `Mobile`, width: 360, height: 640 }
	];
	let currentDimensions = [appDimensions[0].width, appDimensions[0].height];
	const windowConfig = {
		useContentSize: true,
		width: currentDimensions[0],
		height: currentDimensions[1],
		title: getAppTitle(),
		icon: paths.icon
	};

	// Configure Electron to ignore certificate errors
	electronLayer.commandLine.appendSwitch(`ignore-certificate-errors`);

	// if a custom domain is provided
	if(appUrlOverride){
		// config
		const { hostname: routeFrom } = new URL(appUrlOverride);
		const { host: routeTo } = new URL(testServerUrl);

		// override requests to the custom domain to use the test server
		electronLayer.commandLine.appendSwitch(`host-resolver-rules`, `MAP ${routeFrom} ${routeTo}`);
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

	// Set up the application menu
	function setMenu () {
		// build the default menu in MacOS style
		const menuDefault = [
			{
				label: appName,
				submenu: [
					{
						label: `🏃 Exit`,
						accelerator: `CmdOrCtrl+Q`,
						click: electronLayer.quit
					}
				]
			},

			{
				label: `🧪 Testing`,
				submenu: [
					{
						label: `📦 Load Packaged App`,
						click: () => navigate(appUrl)
					},
					{ type: `separator` },
					{
						label: `🖥️ Open in Browser`,
						click: () => shell.openExternal(clientWindow.webContents.getURL())
					},
					{ type: `separator` },
					{
						label: `⚙️ DevTools`,
						click: clientWindow.webContents.openDevTools
					},
					{ type: `separator` },
					{
						label: `♻️ Reload Page`,
						click: clientWindow.webContents.reloadIgnoringCache
					}
				]
			}
		];

		// for each menu item where the list exists
		const customLinkList = [];
		config.test.menu.forEach(item => {
			// check if the provided url is valid
			const itemUrl = formatURL(item.url);

			// add the item to the menu
			customLinkList.push({
				label: `${item.label || item.url}${itemUrl ? `` : ` (invalid entry)`}`,
				click: () => navigate(itemUrl, item.external),
				enabled: !!itemUrl // disable menu item if invalid url
			});
		});

		// if there are any valid items THEN add the list to the menu
		customLinkList.length && menuDefault.push({ label: `💼 Links`, submenu: customLinkList });

		// build out the menu for selecting a screen size
		const dimensionsMenu = [];
		const tolerance = 2;

		// add the dimensions to the list
		let defaultsFound = false;
		appDimensions.forEach(res => {
			const [width, height] = currentDimensions || [];
			const isSizeMatch = Math.abs(res.width - width) <= tolerance && Math.abs(res.height - height) <= tolerance;

			// if this is the first default dimension
			if(!defaultsFound && res.isDefault){
				// add a separator
				dimensionsMenu.push({ type: `separator` });

				// mark that the first default has been found
				defaultsFound = true;
			}

			dimensionsMenu.push({
				label: `${isSizeMatch ? `🔘 ` : ``}${res.label} (${res.width} x ${res.height})`,
				click: () => clientWindow.setContentSize(res.width, res.height)
			});
		});

		// Add the custom dimension menu item if it's not already in the list
		(() => {
			// exit if there's no custom dimension set
			if(!currentDimensions){ return; }

			// setup
			const [width, height] = currentDimensions;

			// exit if the custom dimensions are already in the list (within tolerance)
			if(appDimensions.some(res => Math.abs(res.width - width) <= tolerance && Math.abs(res.height - height) <= tolerance)){ return; }

			// add the custom dimension to the list
			dimensionsMenu.unshift(
				{
					label: `🔘 Current (${width} x ${height})`,
					click: () => clientWindow.setContentSize(width, height)
				},
				{ type: `separator` }
			);
		})();

		// Add the dimensions submenu to the application menu
		menuDefault.push({ label: `📐 Size`, submenu: dimensionsMenu });

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

		// listen for changes to the window size
		clientWindow.on(`resize`, () => {
			// get the current dimensions
			const [newWidth, newHeight] = clientWindow.getContentSize();

			// if the dimensions have not changed
			if(newWidth === currentDimensions[0] && newHeight === currentDimensions[1]){
				return;
			}

			// update the current dimensions
			currentDimensions = clientWindow.getContentSize();

			// update the menu
			setMenu();
		});

		// listen for the window to close
		clientWindow.on(`close`, onAppClose);

		// Load the index.html of the app
		navigate(appUrl);
	}

	// listen for the window to close
	function onAppClose(evt) {
		// stop the window from closing
		evt.preventDefault();

		// ask the user to confirm closing the app
		dialog.showMessageBox({
			type: `question`,
			buttons: [`Close ${appName}`, `Cancel`],
			title: `Exit Confirmation`,
			message: `
			Get your brand seen on this screen by tens of people! 😂

			Contact <support+eyas@cycosoft.com> for more information.
			`,
			icon: paths.icon
		}).then(result => {
			// if the user clicks the first option
			if (result.response === 0) {
				// remove the close event listener so we don't get stuck in a loop
				clientWindow.removeListener(`close`, onAppClose);

				// Shut down the test server AND THEN exit the app
				testServer.close(electronLayer.quit);
			}
		});
	}

	// Get the app title
	function getAppTitle() {
		// Always start with the main app name
		let output = `${appName}`;

		// Add the test app title
		output += ` :: ${config.test.title}`;

		// Add the build version
		output += ` :: ${config.test.version} ✨`;

		// Add the current URL if it`s available
		if (clientWindow){
			output += ` ( ${clientWindow.webContents.getURL()} )`;
		}

		// Return the built title
		return output;
	}

	// Set up Express to serve files from test/
	async function setupTestServer() {
		// Create the Express app
		expressLayer = express();

		// Serve static files from test/
		expressLayer.use(express.static(paths.testSrc));

		// For each provided route from the user
		config.test.routes.forEach(route => {
			// Add a redirect to the test server
			expressLayer.get(route.from, function (req, res) {
				// Redirect to the provided route
				res.redirect(route.to);
			});
		});

		// Catch-all for bad requests
		expressLayer.get(`*`, function (req, res) {
			res.redirect(`/`);
		});

		// Create a certificate authority
		const ca = await mkcert.createCA({
			organization: `Cycosoft, LLC - Test Server`,
			countryCode: `US`,
			state: `Arizona`,
			locality: `Chandler`,
			validityDays: 7
		});

		// Create a certificate for the domain under the certificate authority
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
})();
