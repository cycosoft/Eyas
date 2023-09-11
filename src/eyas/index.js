/* global process, __dirname */

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
	let resizedResolution = null; // [width, height]
	const defaultResolutions = [
		{ label: `Desktop`, width: 1366, height: 768 },
		{ label: `Tablet`, width: 768, height: 1024 },
		{ label: `Mobile`, width: 360, height: 640 }
	];
	const resolution = getResolution();
	const windowConfig = {
		width: resolution.width,
		height: resolution.height,
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

		// build out the menu for selecting a resolution
		const resolutionMenu = [];

		// add the default resolutions to the list
		defaultResolutions.forEach(res => {
			resolutionMenu.push({
				label: `${res.label} (${res.width} x ${res.height})`,
				click: () => clientWindow.setSize(res.width, res.height)
			});
		});

		// Add the custom resolution menu item if it's not already in the list
		(() => {
			// exit if there's no custom resolution set
			if(!resizedResolution){ return; }

			// setup
			const [width, height] = resizedResolution;

			// exit if the custom resolution is already in the list
			const matchesExistingResolution = [...defaultResolutions, ...config.test.resolutions]
				.some(res => res.width === width && res.height === height);
			if(matchesExistingResolution){ return; }

			// add the resized resolution to the list
			resolutionMenu.unshift(
				{
					label: `Current: (${width} x ${height})`,
					click: () => clientWindow.setSize(width, height)
				},
				{ type: `separator` }
			);
		})();

		// Add the resolution submenu to the application menu
		menuDefault.push({ label: `📐 Resolution`, submenu: resolutionMenu });

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
			// update the resized resolution
			resizedResolution = clientWindow.getSize();

			// update the menu
			setMenu();
		});

		// Load the index.html of the app
		navigate(appUrl);
	}

	// Get the app title
	function getAppTitle() {
		// Always start with the app name
		let output = `${appName}`;

		// Add the app title
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

	// Properly close the server when the app is closed
	electronLayer.on(`before-quit`, () => {
		// Shut down the HTTPS server
		testServer.close(() => {
			// Exit the Node.js process with a status code of 0
			process.exit(0);
		});
	});

	// returns the requested resolution
	function getResolution(index) {
		// error check
		if(!index){ index = 0; }

		// config
		const userResolutions = config.test.resolutions;


		return defaultResolutions[0];
	}
})();
