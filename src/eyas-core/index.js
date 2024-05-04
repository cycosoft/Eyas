/* global __dirname, process */

'use strict';

// NEW METHOD
// init electron
// init the core layer
// display the UI (with a center loader)
// ask the user to select the environment OR use the default
// * start the server during this time
// load the test

// global imports _
const {
	app: _electronCore,
	BrowserWindow: _electronWindow,
	// BrowserView,
	// Menu,
	// dialog,
	// shell,
	// ipcMain
} = require(`electron`);

// global variables $
const $appName = `Eyas`;
let $appWindow = null;
const $currentViewport = [];
const $allViewports = [
	{ isDefault: true, label: `Desktop`, width: 1366, height: 768 },
	{ isDefault: true, label: `Tablet`, width: 768, height: 1024 },
	{ isDefault: true, label: `Mobile`, width: 360, height: 640 }
];
const paths = {
	icon: path.join(__dirname, `..`, `eyas-assets`, `eyas-logo.png`),
	configLoader: path.join(__dirname, `..`, `scripts`, `get-config.js`),
};

// initialize the first layer of the app
initElectronCore();

// wrapped in an async IIFE to allow for "root" await calls
(async () => {
	// imports
	// const express = require(`express`);
	// const path = require(`path`);
	// const https = require(`https`);
	// const mkcert = require(`mkcert`);
	// const { isURL } = require(`validator`);
	// const parseURL = require(`url-parse`);
	// const Mixpanel = require(`mixpanel`);
	// const os = require(`os`);
	// const crypto = require(`crypto`);

	// // set dev mode if flag is detected
	// const isDev = process.argv.includes(`--dev`);

	// // Set up analytics
	// const analytics = Mixpanel.init(`07f0475cb429f7de5ebf79a1c418dc5c`);
	// const userId = crypto.randomUUID();
	// const EVENTS = {
	// 	core: {
	// 		launch: `App Launch`,
	// 		exit: `App Exit`
	// 	},
	// 	ui: {
	// 		modalExitShown: `Modal Exit Shown`
	// 	}
	// };

	// // setup
	// const TEST_SOURCE = `source`;
	// const roots = require(path.join(__dirname, `scripts`, `get-roots.js`));
	// const paths = {
	//
	// 	packageJson: path.join(roots.eyas, `package.json`),
	// 	testSrc: path.join(roots.config, TEST_SOURCE),
	// 	eventBridge: path.join(roots.eyas, `scripts`, `event-bridge.js`),
	// 	ui: {
	// 		app: path.join(roots.eyas, `eyas-interface`, `index.html`)
	// 	}
	// };

	// // get the app version
	// const appVersion = require(paths.packageJson).version;
	// const operatingSystem = os.platform();

	// // track the app launch event
	// !isDev && analytics.track(EVENTS.core.launch, {
	// 	distinct_id: userId,
	// 	$os: operatingSystem,
	// 	$app_version_string: appVersion
	// });

	// // config

	// const testServerPort = config().port;
	// const testServerUrl = `https://localhost:${testServerPort}`;
	// const appUrlOverride = formatURL(config().domain);
	// const appUrl = appUrlOverride || testServerUrl;
	// let expressLayer = null;
	// let appLayer = null;
	// let testServer = null;



	// Configure Electron to ignore certificate errors
	// _electronCore.commandLine.appendSwitch(`ignore-certificate-errors`);

	// // if a custom domain is provided
	// if(appUrlOverride){
	// 	// config
	// 	const { hostname: routeFrom } = new URL(appUrlOverride);
	// 	const { host: routeTo } = new URL(testServerUrl);

	// 	// override requests to the custom domain to use the test server
	// 	_electronCore.commandLine.appendSwitch(`host-resolver-rules`, `MAP ${routeFrom} ${routeTo}`);
	// }

	// start the test server
	// setupTestServer();

	// format the url for electron consumption
	// function formatURL(url) {
	// 	// config
	// 	let output = null;

	// 	// exit if not a valid url
	// 	if(!url || !isURL(url)){ return output; }

	// 	// parse the url
	// 	const parsed = parseURL(url);

	// 	// if the url is missing a protocol
	// 	if(!parsed.protocol){
	// 		// default to https
	// 		parsed.set(`protocol`, `https`);
	// 	}

	// 	// grab the url as a string from the parsed object
	// 	output = parsed.toString();

	// 	// send back formatted string
	// 	return output;
	// }





	// manage navigation
	// function navigate(url, external) {
	// 	// go to the requested url in electron
	// 	!external && $appWindow?.webContents?.loadURL(url);

	// 	// open the requested url in the default browser
	// 	external && shell.openExternal(url);
	// }





	// listen for the window to close
	// async function onAppClose(evt) {
	// 	// stop the window from closing
	// 	evt.preventDefault();

	// 	// track that the modal is being opened
	// 	!isDev && analytics.track(EVENTS.ui.modalExitShown, { distinct_id: userId });

	// 	// enable the UI layer
	// 	enableUI(true);

	// 	// capture the current page as an image
	// 	let screenshot = null;
	// 	// disable the screenshot on windows as it isn't needed
	// 	if(operatingSystem !== `win32`) {
	// 		screenshot = await $appWindow.capturePage();
	// 		screenshot = screenshot.toDataURL();
	// 	}

	// 	// send a message to the UI to show the exit modal with the captured image
	// 	appLayer.webContents.send(`modal-exit-visible`, true, screenshot);
	// }

	// sets the visibility of the UI so externalLayer can be interacted with
	// function enableUI(enable) {
	// 	if(enable){
	// 		appLayer.setBounds({ x: 0, y: 0, width: $currentViewport[0], height: $currentViewport[1] });
	// 	}else{
	// 		appLayer.setBounds({ x: 0, y: 0, width: 0, height: 0 });
	// 	}
	// }

	// Set up Express to serve files from the test directory
	// async function setupTestServer() {
	// 	// Create the Express app
	// 	expressLayer = express();

	// 	// Serve static files from the test directory
	// 	expressLayer.use(express.static(paths.testSrc));

	// 	// For each provided route from the user
	// 	config().redirects.forEach(route => {
	// 		// Add a redirect to the test server
	// 		expressLayer.get(route.from, function (req, res) {
	// 			// Redirect to the provided route
	// 			res.redirect(route.to);
	// 		});
	// 	});

	// 	// Catch-all for bad requests
	// 	expressLayer.get(`*`, function (req, res) {
	// 		res.redirect(`/`);
	// 	});

	// 	// Create a certificate authority
	// 	const ca = await mkcert.createCA({
	// 		organization: `Cycosoft, LLC - Test Server`,
	// 		countryCode: `US`,
	// 		state: `Arizona`,
	// 		locality: `Chandler`,
	// 		validityDays: 7
	// 	});

	// 	// Create a certificate for the domain under the certificate authority
	// 	const cert = await mkcert.createCert({
	// 		ca,
	// 		domains: [`localhost`],
	// 		validity: 7
	// 	});

	// 	// Start the server
	// 	testServer = https
	// 		.createServer({ key: cert.key, cert: cert.cert }, expressLayer)
	// 		.listen(testServerPort, initElectronCore);
	// }
})();

// start the core of the application
function initElectronCore() {
	// start the electron layer
	_electronCore.whenReady()
		// when the electron layer is ready
		.then(() => {
			// start the UI layer
			initElectronUi();

			// if Electron receives the `activate` event
			_electronCore.on(`activate`, () => {
				// ensure the _electronWindow doesn't already exist
				if (_electronWindow.getAllWindows().length === 0) {
					// create the window
					initElectronUi();
				}
			});
		});
}

// initiate the Eyas UI
function initElectronUi() {
	// add test defined viewports to the front of the list
	$allViewports.unshift(...config().viewports);

	// set the current viewport to the first viewport in the list
	$currentViewport[0] = $allViewports[0].width;
	$currentViewport[1] = $allViewports[0].height;

	// Create the app window for this instance
	$appWindow = new _electronWindow({
		useContentSize: true,
		width: $currentViewport[0],
		height: $currentViewport[1],
		title: getAppTitle(),
		icon: paths.icon
	});

	// exit the app if the test has expired
	// NOTE: THIS NEEDS TO BE MOVED TO THE UI LAYER
	checkTestExpiration();

	// Set the application menu
	setMenu();

	// Prevent the title from changing automatically
	$appWindow.on(`page-title-updated`, onTitleUpdate);

	// listen for changes to the window size
	$appWindow.on(`resize`, onResize);

	// listen for messages from the UI
	ipcMain.on(`app-exit`, () => {
		// remove the close event listener so we don't get stuck in a loop
		$appWindow.removeListener(`close`, onAppClose);

		// track that the app is being closed
		!isDev && analytics.track(EVENTS.core.exit, { distinct_id: userId });

		// Shut down the test server AND THEN exit the app
		testServer.close(_electronCore.quit);
	});

	// open links in the browser when requested
	ipcMain.on(`open-in-browser`, (event, url) => {
		const validated = formatURL(url);
		validated && navigate(validated, true);
	});

	// hide the UI when requested
	ipcMain.on(`hide-ui`, () => enableUI(false));

	// listen for the window to close
	$appWindow.on(`close`, onAppClose);

	// navigate to the test url
	navigate(appUrl);

	// Overlay the appLayer
	appLayer = new BrowserView({ webPreferences: { preload: paths.eventBridge } });
	$appWindow.addBrowserView(appLayer);
	appLayer.setAutoResize({ width: true, height: true });
	appLayer.webContents.loadFile(paths.ui.app);
}

// forces an exit if the loaded test has expired
function checkTestExpiration () {
	// imports
	const { isPast } = require(`date-fns/isPast`);
	const { format } = require(`date-fns/format`);

	// setup
	const expirationDate = new Date(config().meta.expires);

	// stop if the test has not expired
	if(!isPast(expirationDate)){ return; }

	// alert the user that the test has expired
	dialog.showMessageBoxSync({
		title: `🚫 Test Expired`,
		message: `This test expired on ${format(expirationDate, `PPP`)} and can no longer be used`,
		buttons: [`Exit`],
		noLink: true
	});

	// track that the app is being closed
	!isDev && analytics.track(EVENTS.core.exit, { distinct_id: userId });

	// Exit the app
	_electronCore.quit();
}

// returns the current test's config
function config() {
	// use the cache OR load the config
	config.cache = config.cache || require(paths.configLoader);

	// return the config
	return config.cache;
}

// Get the app title
function getAppTitle() {
	// Always start with the main app name
	let output = $appName;

	// Add the test app title
	output += ` :: ${config().title}`;

	// Add the build version
	output += ` :: ${config().version} ✨`;

	// Add the current URL if it`s available
	if ($appWindow){
		output += ` ( ${$appWindow.webContents.getURL()} )`;
	}

	// Return the built title
	return output;
}

// Prevent the title from changing AND also update it based on the current URL
function onTitleUpdate(evt) {
	// Prevent the app from changing the title automatically
	evt.preventDefault();

	// set a custom title
	$appWindow.setTitle(getAppTitle());
}

// when the app resizes
function onResize() {
	// get the current viewport dimensions
	const [newWidth, newHeight] = $appWindow.getContentSize();

	// if the dimensions have not changed
	if(newWidth === $currentViewport[0] && newHeight === $currentViewport[1]){
		return;
	}

	// update the current dimensions
	$currentViewport = $appWindow.getContentSize();

	// update the menu
	setMenu();
}

// Set up the application menu
function setMenu () {
	// build the default menu in MacOS style
	const menuDefault = [
		{
			label: $appName,
			submenu: [
				{
					label: `📇 About`,
					click: () => {
						// setup
						const { format } = require(`date-fns/format`);
						const { differenceInDays } = require(`date-fns/differenceInDays`);
						const now = new Date();
						const expires = new Date(config().meta.expires);
						const dayCount = differenceInDays(expires, now);
						const expirationFormatted = format(expires, `MMM do @ p`);
						const relativeFormatted = dayCount ? `~${dayCount} days` : `soon`;
						const startYear = 2023;
						const currentYear = now.getFullYear();
						const yearRange = startYear === currentYear
							? startYear : `${startYear} - ${currentYear}`;

						// show the about dialog
						dialog.showMessageBox($appWindow, {
							type: `info`,
							buttons: [`OK`],
							title: `About ${$appName}`,
							icon: paths.icon,
							message: `
							Test name: ${config().title}
							Test version: ${config().version}
							Test expires: ${expirationFormatted} (${relativeFormatted})

							Built from: ${config().meta.gitBranch} #${config().meta.gitHash}
							Built by: ${config().meta.gitUser}
							Built on: ${new Date(config().meta.compiled).toLocaleString()}

							Runner: ${$appName} v${appVersion}


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
					click: _electronCore.quit
				}
			]
		},

		{
			label: `🧪 Testing`,
			submenu: [
				{
					label: `📦 Load Test Files`,
					click: () => navigate(appUrl)
				},
				{ type: `separator` },
				{
					label: `🖥️ Open in Browser`,
					click: () => {
						// url to navigate to
						let urlToNavigateTo = $appWindow.webContents.getURL();

						// if the base url is the test defined domain
						if(appUrlOverride){
							// grab the base url parts
							urlToNavigateTo = new URL(appUrlOverride);
							urlToNavigateTo.port = testServerPort;

							// alert the user that it needs to be defined in etc/hosts
							dialog.showMessageBoxSync($appWindow, {
								type: `warning`,
								buttons: [`Open`],
								title: `Open in Browser`,
								message: `To run your test outside of Eyas, you must add the following to your "etc/hosts" file:

								127.0.0.1     ${urlToNavigateTo.hostname}`
							});

							// convert the url to a string
							urlToNavigateTo = urlToNavigateTo.toString();
						}

						// open the current url in the default browser
						navigate(urlToNavigateTo, true);
					}
				},
				{ type: `separator` },
				// populate with appropriate dev tools
				...(() => {
					const output = [
						{
							label: `⚙️ DevTools`,
							click: () => $appWindow.webContents.openDevTools()
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
					click: () => $appWindow.webContents.reloadIgnoringCache()
				}
			]
		}
	];

	// for each menu item where the list exists
	const customLinkList = [];
	config().links.forEach(item => {
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
	$allViewports.forEach(res => {
		const [width, height] = $currentViewport || [];
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
			click: () => $appWindow.setContentSize(res.width, res.height)
		});
	});

	// Add the custom viewport menu item if it's not already in the list
	(() => {
		// exit if there's no custom viewport set
		if(!$currentViewport){ return; }

		// setup
		const [width, height] = $currentViewport;

		// exit if the custom viewports are already in the list (within tolerance)
		if($allViewports.some(res => Math.abs(res.width - width) <= tolerance && Math.abs(res.height - height) <= tolerance)){ return; }

		// add the custom viewport to the list
		viewportsMenu.unshift(
			{
				label: `🔘 Current (${width} x ${height})`,
				click: () => $appWindow.setContentSize(width, height)
			},
			{ type: `separator` }
		);
	})();

	// Add the viewports submenu to the application menu
	menuDefault.push({ label: `📏 Viewport`, submenu: viewportsMenu });

	// Set the modified menu as the application menu
	Menu.setApplicationMenu(Menu.buildFromTemplate(menuDefault));
}