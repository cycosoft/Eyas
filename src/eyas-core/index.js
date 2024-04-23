/* global __dirname, process */

'use strict';

// wrapped in an async function to allow for "root" await calls
(async () => {
	// imports
	const {
		app: electronLayer,
		BrowserWindow,
		BrowserView,
		Menu,
		dialog,
		shell,
		ipcMain
	} = require(`electron`);
	const express = require(`express`);
	const path = require(`path`);
	const https = require(`https`);
	const mkcert = require(`mkcert`);
	const { isURL } = require(`validator`);
	const parseURL = require(`url-parse`);
	const Mixpanel = require(`mixpanel`);
	const os = require(`os`);
	const crypto = require(`crypto`);

	// set dev mode if flag is detected
	const isDev = process.argv.includes(`--dev`);

	// Set up analytics
	const analytics = Mixpanel.init(`07f0475cb429f7de5ebf79a1c418dc5c`);
	const userId = crypto.randomUUID();
	const EVENTS = {
		core: {
			launch: `App Launch`,
			exit: `App Exit`
		},
		ui: {
			modalExitShown: `Modal Exit Shown`
		}
	};

	// setup
	const TEST_SOURCE = `source`;
	const roots = require(path.join(__dirname, `scripts`, `get-roots.js`));
	const paths = {
		configLoader: path.join(roots.eyas, `scripts`, `get-config.js`),
		icon: path.join(roots.eyas, `eyas-assets`, `eyas-logo.png`),
		packageJson: path.join(roots.eyas, `package.json`),
		testSrc: path.join(roots.config, TEST_SOURCE),
		eventBridge: path.join(roots.eyas, `scripts`, `event-bridge.js`),
		ui: {
			app: path.join(roots.eyas, `eyas-interface`, `index.html`)
		}
	};

	// get the app version
	const appVersion = require(paths.packageJson).version;
	const operatingSystem = os.platform();

	// track the app launch event
	!isDev && analytics.track(EVENTS.core.launch, {
		distinct_id: userId,
		$os: operatingSystem,
		$app_version_string: appVersion
	});

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
	let appLayer = null;
	let testServer = null;
	const allViewports = [
		...config.test.viewports,
		{ isDefault: true, label: `Desktop`, width: 1366, height: 768 },
		{ isDefault: true, label: `Tablet`, width: 768, height: 1024 },
		{ isDefault: true, label: `Mobile`, width: 360, height: 640 }
	];
	let currentViewport = [allViewports[0].width, allViewports[0].height];
	const windowConfig = {
		useContentSize: true,
		width: currentViewport[0],
		height: currentViewport[1],
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
						label: `📇 About`,
						click: () => {
							// setup
							const { format } = require(`date-fns/format`);
							const { differenceInDays } = require(`date-fns/differenceInDays`);
							const now = new Date();
							const expires = new Date(config.meta.expires);
							const dayCount = differenceInDays(expires, now);
							const expirationFormatted = format(expires, `MMM do @ p`);
							const relativeFormatted = dayCount ? `~${dayCount} days` : `soon`;
							const startYear = 2023;
							const currentYear = now.getFullYear();
							const yearRange = startYear === currentYear
								? startYear : `${startYear} - ${currentYear}`;

							// show the about dialog
							dialog.showMessageBox(clientWindow, {
								type: `info`,
								buttons: [`OK`],
								title: `About ${appName}`,
								icon: paths.icon,
								message: `
								Test name: ${config.test.title}
								Test version: ${config.test.version}
								Test expires: ${expirationFormatted} (${relativeFormatted})

								Built from: ${config.meta.gitBranch} #${config.meta.gitHash}
								Built by: ${config.meta.gitUser}
								Built on: ${new Date(config.meta.compiled).toLocaleString()}

								Runner: ${appName} v${appVersion}


								🏢 © ${yearRange} Cycosoft, LLC
								🌐 https://cycosoft.com
								✉️ support+eyas@cycosoft.com
								`
							});
						}
					},
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
					// populate with appropriate dev tools
					...(() => {
						const output = [
							{
								label: `⚙️ DevTools`,
								click: () => clientWindow.webContents.openDevTools()
							}
						];

						// add the dev tools for the app layer if in dev
						isDev && output.push(
							{
								label: `⚙️ DevTools (App Layer)`,
								click: () => appLayer.webContents.openDevTools()
							}
						);

						return output;
					})(),
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

		// build out the menu for selecting a screen size
		const viewportsMenu = [];
		const tolerance = 2;

		// add the viewports to the list
		let defaultsFound = false;
		allViewports.forEach(res => {
			const [width, height] = currentViewport || [];
			const isSizeMatch = Math.abs(res.width - width) <= tolerance && Math.abs(res.height - height) <= tolerance;

			// if this is the first default viewport
			if(!defaultsFound && res.isDefault){
				// add a separator
				viewportsMenu.push({ type: `separator` });

				// mark that the first default has been found
				defaultsFound = true;
			}

			viewportsMenu.push({
				label: `${isSizeMatch ? `🔘 ` : ``}${res.label} (${res.width} x ${res.height})`,
				click: () => clientWindow.setContentSize(res.width, res.height)
			});
		});

		// Add the custom viewport menu item if it's not already in the list
		(() => {
			// exit if there's no custom viewport set
			if(!currentViewport){ return; }

			// setup
			const [width, height] = currentViewport;

			// exit if the custom viewports are already in the list (within tolerance)
			if(allViewports.some(res => Math.abs(res.width - width) <= tolerance && Math.abs(res.height - height) <= tolerance)){ return; }

			// add the custom viewport to the list
			viewportsMenu.unshift(
				{
					label: `🔘 Current (${width} x ${height})`,
					click: () => clientWindow.setContentSize(width, height)
				},
				{ type: `separator` }
			);
		})();

		// Add the viewports submenu to the application menu
		menuDefault.push({ label: `📏 Viewport`, submenu: viewportsMenu });

		// Set the modified menu as the application menu
		Menu.setApplicationMenu(Menu.buildFromTemplate(menuDefault));
	}

	// manage navigation
	function navigate(url, external) {
		// go to the requested url in electron
		!external && clientWindow?.webContents?.loadURL(url);

		// open the requested url in the default browser
		external && shell.openExternal(url);
	}

	// Configure and create an instance of BrowserWindow to display the UI
	function startApplication() {
		// Create the browser window
		clientWindow = new BrowserWindow(windowConfig);

		// stop the user here if the test is expired
		const { isPast } = require(`date-fns/isPast`);
		const { format } = require(`date-fns/format`);
		const expiredAsDate = new Date(config.meta.expires);
		const isExpired = isPast(expiredAsDate);
		if(isExpired){
			dialog.showMessageBoxSync({
				title: `🚫 Test Expired`,
				message: `This test expired on ${format(expiredAsDate, `PPP`)} and can no longer be used`,
				buttons: [`Exit`],
				noLink: true
			});

			// track that the app is being closed
			!isDev && analytics.track(EVENTS.core.exit, { distinct_id: userId });

			// Exit the app
			electronLayer.quit();
		}

		// Create a menu template
		setMenu();

		// Prevent the title from changing automatically
		clientWindow.on(`page-title-updated`, onTitleUpdate);

		// listen for changes to the window size
		clientWindow.on(`resize`, () => {
			// get the current viewport dimensions
			const [newWidth, newHeight] = clientWindow.getContentSize();

			// if the dimensions have not changed
			if(newWidth === currentViewport[0] && newHeight === currentViewport[1]){
				return;
			}

			// update the current dimensions
			currentViewport = clientWindow.getContentSize();

			// update the menu
			setMenu();
		});

		// listen for messages from the UI
		ipcMain.on(`app-exit`, () => {
			// remove the close event listener so we don't get stuck in a loop
			clientWindow.removeListener(`close`, onAppClose);

			// track that the app is being closed
			!isDev && analytics.track(EVENTS.core.exit, { distinct_id: userId });

			// Shut down the test server AND THEN exit the app
			testServer.close(electronLayer.quit);
		});

		// open links in the browser when requested
		ipcMain.on(`open-in-browser`, (event, url) => {
			const validated = formatURL(url);
			validated && navigate(validated, true);
		});

		// hide the UI when requested
		ipcMain.on(`hide-ui`, () => enableUI(false));

		// listen for the window to close
		clientWindow.on(`close`, onAppClose);

		// Load Eyas analytics
		navigate(appUrl);

		// Overlay the appLayer
		appLayer = new BrowserView({ webPreferences: { preload: paths.eventBridge } });
		clientWindow.addBrowserView(appLayer);
		appLayer.setAutoResize({ width: true, height: true });
		appLayer.webContents.loadFile(paths.ui.app);
	}

	// Prevent the title from changing AND also update it based on the current URL
	function onTitleUpdate(evt) {
		// Prevent the app from changing the title automatically
		evt.preventDefault();

		// set a custom title
		clientWindow.setTitle(getAppTitle());
	}

	// listen for the window to close
	async function onAppClose(evt) {
		// stop the window from closing
		evt.preventDefault();

		// track that the modal is being opened
		!isDev && analytics.track(EVENTS.ui.modalExitShown, { distinct_id: userId });

		// enable the UI layer
		enableUI(true);

		// capture the current page as an image
		let screenshot = null;
		// disable the screenshot on windows as it isn't needed
		if(operatingSystem !== `win32`) {
			screenshot = await clientWindow.capturePage();
			screenshot = screenshot.toDataURL();
		}

		// send a message to the UI to show the exit modal with the captured image
		appLayer.webContents.send(`modal-exit-visible`, true, screenshot);
	}

	// sets the visibility of the UI so externalLayer can be interacted with
	function enableUI(enable) {
		if(enable){
			appLayer.setBounds({ x: 0, y: 0, width: currentViewport[0], height: currentViewport[1] });
		}else{
			appLayer.setBounds({ x: 0, y: 0, width: 0, height: 0 });
		}
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
		config.test.redirects.forEach(route => {
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
