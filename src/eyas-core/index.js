/* global __dirname, process */

'use strict';

// constants
const APP_NAME = `Eyas`;
const MP_KEY = `07f0475cb429f7de5ebf79a1c418dc5c`;
const MP_EVENTS = {
	core: {
		launch: `App Launch`,
		exit: `App Exit`
	},
	ui: {
		modalExitShown: `Modal Exit Shown`
	}
};

// global imports _
const { app: _electronCore, BrowserWindow: _electronWindow, } = require(`electron`);
const _path = require(`path`);
const _os = require(`os`);

// global variables $
const $isDev = process.argv.includes(`--dev`);
let $appWindow = null;
let $eyasLayer = null;
let $testServer = null;
let $testDomainRaw = null;
let $testDomain = `eyas://local.test`;
const $defaultViewports = [
	{ isDefault: true, label: `Desktop`, width: 1366, height: 768 },
	{ isDefault: true, label: `Tablet`, width: 768, height: 1024 },
	{ isDefault: true, label: `Mobile`, width: 360, height: 640 }
];
let $allViewports = [];
const $currentViewport = [];
const $roots = require(_path.join(__dirname, `scripts`, `get-roots.js`));
const $paths = {
	icon: _path.join($roots.eyas, `eyas-assets`, `eyas-logo.png`),
	configLoader: _path.join($roots.eyas, `scripts`, `get-config.js`),
	packageJson: _path.join($roots.eyas, `package.json`),
	eventBridge: _path.join($roots.eyas, `scripts`, `event-bridge.js`),
	testSrc: null,
	eyasInterface: _path.join($roots.eyas, `eyas-interface`, `index.html`)
};
const $operatingSystem = _os.platform();
const { version: _appVersion } = require($paths.packageJson);

// APP_ENTRY: initialize the first layer of the app
initElectronCore();

// wrapped in an async IIFE to allow for "root" await calls
// (async () => {
	// imports
	// const express = require(`express`);
	// const https = require(`https`);
	// const mkcert = require(`mkcert`);
	//
	//

	// // config

	// const testServerPort = 3000;
	// const testServerUrl = `https://localhost:${testServerPort}`;
	// const appUrlOverride = parseURL(config().domains);
	// const appUrl = appUrlOverride || testServerUrl;
	// let expressLayer = null;

	//



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



	// Set up Express to serve files from the test directory
	// async function setupTestServer() {
	// 	// Create the Express app
	// 	expressLayer = express();

	// 	// Serve static files from the test directory
	// 	expressLayer.use(express.static($paths.testSrc));

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
	// 	$testServer = https
	// 		.createServer({ key: cert.key, cert: cert.cert }, expressLayer)
	// 		.listen(testServerPort, initElectronCore);
	// }

	// override requests to the custom domain to use the test server
	// _electronCore.commandLine.appendSwitch(`host-resolver-rules`, `MAP ${routeFrom} ${routeTo}`);
// })();

// start the core of the application
function initElectronCore() {
	// detect if the app was opened with a file (MacOS only)
	_electronCore.on(`open-file`, (event, path) => {
		// ensure the correct file type is being opened
		if(path.endsWith(`.eyas`)){
			// reload the config based on the new path
			config(path);

			// start a new test based on the newly loaded config
			startAFreshTest();
		}
	});

	// add support for eyas:// protocol
	registerCustomProtocol();

	// start the electron layer
	_electronCore.whenReady()
		// when the electron layer is ready
		.then(() => {
			// start listening for requests to the custom protocol
			handleRedirects();

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

// initiate the core electron UI layer
function initElectronUi() {
	// imports
	const { BrowserView } = require(`electron`);

	// set the current viewport to the first viewport in the list
	$currentViewport[0] = $defaultViewports[0].width;
	$currentViewport[1] = $defaultViewports[0].height;

	// Create the app window for this instance
	$appWindow = new _electronWindow({
		useContentSize: true,
		width: $currentViewport[0],
		height: $currentViewport[1],
		title: getAppTitle(),
		icon: $paths.icon
	});

	// load a default page so the app doesn't start black
	$appWindow.loadURL('data:text/html,' + encodeURIComponent(`<html><body></body></html>`));

	// track the app launch event
	trackEvent(MP_EVENTS.core.launch, {
		$os: $operatingSystem,
		$app_version_string: _appVersion
	});

	// exit the app if the test has expired
	// NOTE: THIS NEEDS TO BE MOVED TO THE UI LAYER
	checkTestExpiration();

	// listen for app events
	initElectronListeners();
	initEyasListeners();

	// Initialize the $eyasLayer
	$eyasLayer = new BrowserView({ webPreferences: { preload: $paths.eventBridge } });
	$appWindow.addBrowserView($eyasLayer);
	$eyasLayer.webContents.loadFile($paths.eyasInterface);

	// once the Eyas UI layer is ready, attempt navigation
	$eyasLayer.webContents.on(`did-finish-load`, startAFreshTest);
}

// initialize the Electron listeners
function initElectronListeners() {
	// listen for the window to close
	$appWindow.on(`close`, manageAppClose);

	// listen for changes to the window size
	$appWindow.on(`resize`, onResize);

	// Whenever a title update is requested
	$appWindow.on(`page-title-updated`, onTitleUpdate);

	// when there's a navigation failure
	$appWindow.webContents.on(`did-fail-load`, (event, errorCode, errorDescription) => {
		// log the error
		console.error(`Navigation failed: ${errorCode} - ${errorDescription}`);
	});
}

// initialize the Eyas listeners
function initEyasListeners() {
	// imports
	const { ipcMain } = require(`electron`);

	// hide the UI when requested
	ipcMain.on(`hide-ui`, () => toggleEyasUI(false));

	// open links in the browser when requested
	ipcMain.on(`open-in-browser`, (event, url) => {
		const validated = parseURL(url).toString();
		validated && navigate(validated, true);
	});

	// Whenever the UI layer has requested to close the app
	ipcMain.on(`app-exit`, () => {
		// remove the close event listener so we don't get stuck in a loop
		$appWindow.removeListener(`close`, manageAppClose);

		// track that the app is being closed
		trackEvent(MP_EVENTS.core.exit);

		// Shut down the test server AND THEN exit the app
		if ($testServer) {
			$testServer.close(_electronCore.quit);
		} else {
			_electronCore.quit();
		}
	});

	// listen for the user to select an environment
	ipcMain.on(`environment-selected`, (event, url) => {
		// update the test domain
		$testDomainRaw = url;
		$testDomain = parseURL(url).toString();

		// load the test
		navigate();
	});

	// listen for the user to launch a link
	ipcMain.on(`launch-link`, (event, url, external) => {
		// navigate to the requested url
		navigate(parseURL(url).toString(), external);
	});
}

// method for tracking events
function trackEvent(event, data) {
	// imports
	const Mixpanel = require(`mixpanel`);
	const crypto = require(`crypto`);

	// init if needed
	trackEvent.userId = trackEvent.userId || crypto.randomUUID();
	trackEvent.mixpanel = trackEvent.mixpanel || Mixpanel.init(MP_KEY);

	// if not running in dev mode
	!$isDev && trackEvent.mixpanel.track(event, {
		...data,
		distinct_id: trackEvent.userId // always include the user id
	});
}

// forces an exit if the loaded test has expired
function checkTestExpiration () {
	// imports
	const { isPast } = require(`date-fns/isPast`);
	const { format } = require(`date-fns/format`);
	const { dialog } = require(`electron`);

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
	trackEvent(MP_EVENTS.core.exit);

	// Exit the app
	_electronCore.quit();
}

// returns the current test's config
function config(eyasPath) {
	// import the config loader
	const parseConfig = require($paths.configLoader);

	// if a path was passed
	if (eyasPath) {
		// request config from the new path
		config.cache = parseConfig(eyasPath);
	}

	// if no path set
	else {
		// use the cache OR load the config using default methods
		config.cache = config.cache || parseConfig();
	}

	// return the config
	return config.cache;
}

// Get the app title
function getAppTitle() {
	// Always start with the main app name
	let output = APP_NAME;

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

// manage automatic title updates
function onTitleUpdate(evt) {
	// Disregard the default behavior
	evt.preventDefault();

	// update the title
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
	$currentViewport[0] = newWidth;
	$currentViewport[1] = newHeight

	// update the Eyas UI layer to match the new dimensions
	$eyasLayer.setBounds({ x: 0, y: 0, width: newWidth, height: newHeight });

	// update the menu
	setMenu();
}

// Set up the application menu
function setMenu () {
	// imports
	const { Menu, dialog } = require(`electron`);
	const { isURL } = require(`validator`);

	// build the default menu in MacOS style
	const menuDefault = [
		{
			label: APP_NAME,
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
							title: `About ${APP_NAME}`,
							icon: $paths.icon,
							message: `
							Test name: ${config().title}
							Test version: ${config().version}
							Test expires: ${expirationFormatted} (${relativeFormatted})

							Built from: ${config().meta.gitBranch} #${config().meta.gitHash}
							Built by: ${config().meta.gitUser}
							Built on: ${new Date(config().meta.compiled).toLocaleString()}

							Runner: ${APP_NAME} v${_appVersion}


							🏢 © ${yearRange} Cycosoft, LLC
							🌐 https://cycosoft.com
							🆘 https://github.com/cycosoft/Eyas/issues
							`
						});
					}
				},
				{ type: `separator` },
				{
					label: `🚪 Exit`,
					accelerator: `CmdOrCtrl+Q`,
					click: _electronCore.quit
				}
			]
		}
	];

	// Add the tools menu to the application menu
	menuDefault.push({
		label: `🔧 Tools`,
		submenu: [
			{
				label: `♻️ Reload Page`,
				click: () => $appWindow.webContents.reloadIgnoringCache()
			},
			{
				label: `🧪 Back to Test`,
				click: () => navigate()
			},
			{
				label: `🧪 Reset Test (clear cache 🚿)`,
				click: () => startAFreshTest()
			},
			// { type: `separator` },
			// {
			// 	label: `🌐 Open in Browser`,
			// 	click: () => {
			// 		// url to navigate to
			// 		let urlToNavigateTo = $appWindow.webContents.getURL();

			// 		// if the base url is the test defined domain
			// 		if(appUrlOverride){
			// 			// grab the base url parts
			// 			urlToNavigateTo = new URL(appUrlOverride);
			// 			urlToNavigateTo.port = testServerPort;

			// 			// alert the user that it needs to be defined in etc/hosts
			// 			dialog.showMessageBoxSync($appWindow, {
			// 				type: `warning`,
			// 				buttons: [`Open`],
			// 				title: `Open in Browser`,
			// 				message: `To run your test outside of Eyas, you must add the following to your "etc/hosts" file:

			// 				127.0.0.1     ${urlToNavigateTo.hostname}`
			// 			});

			// 			// convert the url to a string
			// 			urlToNavigateTo = urlToNavigateTo.toString();
			// 		}

			// 		// open the current url in the default browser
			// 		navigate(urlToNavigateTo, true);
			// 	}
			// },
			{ type: `separator` },
			{
				label: `🔧 Developer Tools${$isDev ? ' (Test)' : ''}`,
				click: () => $appWindow.webContents.openDevTools()
			}
		]
	});

	// Add the developer tools menu to the application menu for the UI layer
	$isDev && menuDefault[menuDefault.length - 1].submenu.push({
		label: `🔧 Developer Tools (UI)`,
		click: () => $eyasLayer.webContents.openDevTools()
	});

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

	// for each menu item where the list exists
	const customLinkList = [];
	config().links.forEach(item => {
		// setup
		let itemUrl = item.url;
		let isValid = false;
		let validUrl;

		// generically match bracket sets to check for variables
		const hasVariables = itemUrl.match(/{[^{}]+}/g)?.length;

		// if there are variables
		if(hasVariables){
			// replace the test domain variable with a test domain
			let testUrl = itemUrl.replace(/{testdomain}/g, `validating.com`);

			// replace all other variables with a generic value
			testUrl = testUrl.replace(/{[^{}]+}/g, `validating`);

			// check if the provided url is valid
			isValid = isURL(testUrl);
		} else {
			// check if the provided url is valid
			validUrl = parseURL(itemUrl).toString();
			isValid = !!validUrl;
		}

		// add the item to the menu
		customLinkList.push({
			label: `${item.label || item.url}${isValid ? `` : ` (invalid entry: "${item.url}")`}`,
			click: () => hasVariables ? navigateVariable(itemUrl) : navigate(validUrl, item.external),
			enabled: isValid // disable menu item if invalid url
		});
	});

	// if there are any valid items THEN add the list to the menu
	customLinkList.length && menuDefault.push({ label: `💼 Links`, submenu: customLinkList });

	// Set the modified menu as the application menu
	Menu.setApplicationMenu(Menu.buildFromTemplate(menuDefault));
}

// listen for the window to close
async function manageAppClose(evt) {
	// stop the window from closing
	evt.preventDefault();

	// enable the UI layer
	toggleEyasUI(true);

	// send a message to the UI to show the exit modal with the captured image
	$eyasLayer.webContents.send(`modal-exit-visible`, true);

	// track that the exit modal is being opened
	trackEvent(MP_EVENTS.ui.modalExitShown);
}

// Toggle the Eyas UI layer so the user can interact with it or their test
function toggleEyasUI(enable) {
	if(enable){
		// set the bounds to the current viewport
		$eyasLayer.setBounds({ x: 0, y: 0, width: $currentViewport[0], height: $currentViewport[1] });
	}else{
		// shrink the bounds to 0 to hide it
		$eyasLayer.setBounds({ x: 0, y: 0, width: 0, height: 0 });
	}
}

// manage navigation
function navigate(path, openInBrowser) {
	// setup
	let runningTestSource = false;

	// if the path wasn't provided (default to local test source)
	if(!path){
		// store that we're running the local test source
		runningTestSource = true;

		// if there's a custom domain, go there OR default to the local test source
		path = $testDomain;
	}

	if(
		// if requested to open in the browser AND
		openInBrowser &&
		(
			// not running the local test OR
			!runningTestSource ||
			// the test server is running AND we're running the local test
			($testServer && runningTestSource)
		)
	){
		// open the requested url in the default browser
		const { shell } = require(`electron`);
		shell.openExternal(path);
	} else {
		// otherwise load the requested path in the app window
		$appWindow.loadURL(path);
	}
}

// format the url for electron consumption
function parseURL(url) {
	// imports
	const { isURL } = require(`validator`);

	// config
	let output = '';

	// exit if not a valid url
	if(!url || !isURL(url)){ return output; }

	// if the url doesn't have a protocol
	if(!/^[a-z0-9]+:\/\//.test(url)){
		// add a default protocol of https
		url = `https://${url}`;
	}

	// parse the url
	output = new URL(url);

	// send back formatted string
	return output;
}

// register a custom protocol for loading local test files
function registerCustomProtocol() {
	// imports
	const { protocol } = require(`electron`);

	// register the custom protocol so a local test can be loaded with relative paths
	protocol.registerSchemesAsPrivileged([
		{ scheme: `eyas`, privileges: {
			standard: true,
			secure: true,
			allowServiceWorkers: true,
			supportFetchAPI: true
		} }
	]);
}

// handle requests to the custom protocol
function handleRedirects() {
	// imports
	const { protocol, net } = require(`electron`);

	// use this protocol to load files relatively from the local file system
	protocol.handle(`eyas`, request => {
		// imports
		const { pathToFileURL } = require(`url`);

		// grab the pathname from the request
		const { pathname } = parseURL(request.url.replace(`eyas://`, `https://`));

		// parse expected file attempting to load
		const fileIfNotDefined = `index.html`;

		// check if the pathname ends with a file + extension
		const hasExtension = pathname.split(`/`).pop().includes(`.`);

		// build the relative path to the file
		const relativePathToFile = hasExtension
			? pathname
			: _path.join(pathname, fileIfNotDefined);

		// build the expected path to the file
		const localFilePath = _path.join($paths.testSrc, relativePathToFile);

		// return the file from the local system to complete the request
		return net.fetch(pathToFileURL(localFilePath).toString());
	});

	// listen for requests to the specified domains and redirect to the custom protocol
	protocol.handle(`https`, request => {
		// setup
		const { hostname } = parseURL(request.url);

		// if the hostname matches a given custom domain
		if(config().domains.some(domain => hostname === parseURL(domain.url).hostname)){
			// navigate to the custom protocol to load locally
			const redirect = request.url.replace(`https://`, `eyas://`);

			// redirect to the custom protocol
			return net.fetch(redirect);
		}

		// otherwise, allow the request to pass through
		return net.fetch(request, { bypassCustomProtocolHandlers: true });
	});
}

// refresh the app
async function startAFreshTest() {
	// imports
	const semver = require(`semver`);

	// clear all caches for the session
	await $appWindow.webContents.session.clearCache(); // web cache
	await $appWindow.webContents.session.clearStorageData(); // cookies, filesystem, indexdb, localstorage, shadercache, websql, serviceworkers, cachestorage

	// set the available viewports
	$allViewports = [...config().viewports, ...$defaultViewports];

	// reset the current viewport to the first in the list
	$currentViewport[0] = $allViewports[0].width;
	$currentViewport[1] = $allViewports[0].height;
	$appWindow.setContentSize($currentViewport[0], $currentViewport[1]);

	// Set the application menu
	setMenu();

	// reset the path to the test source
	$paths.testSrc = config().source;

	// if there are no custom domains defined
	if (!config().domains.length) {
		// load the test using the default domain
		navigate();
	}

	// if the user has a single custom domain
	if (config().domains.length === 1) {
		// update the default domain
		$testDomainRaw = config().domains[0].url;
		$testDomain = parseURL($testDomainRaw).toString();

		// directly load the user's test using the new default domain
		navigate();
	}

	// if the user has multiple custom domains
	if (config().domains.length > 1) {
		// show the Eyas UI layer
		toggleEyasUI(true);

		// display the environment chooser modal
		$eyasLayer.webContents.send(`show-environment-modal`, config().domains);
	}

	// if the app is older than the version that built the test
	if(config().meta.eyas && semver.lt(_appVersion, config().meta.eyas)){
		// send request to the UI layer
		$eyasLayer.webContents.send(`show-version-mismatch-modal`, _appVersion, config().meta.eyas);
	}
}

// navigate to a variable url
function navigateVariable(url) {
	// if the url has the test domain variable AND the test domain is not set
	if(url.match(/{testdomain}/g)?.length && !$testDomainRaw){
		const { dialog } = require(`electron`);

		// alert the user that they need to select an environment first
		dialog.showMessageBoxSync($appWindow, {
			type: `warning`,
			buttons: [`OK`],
			title: `Select an Environment`,
			message: `You must select an environment before you can use this link`
		});

		return;
	}

	// show the Eyas UI layer
	toggleEyasUI(true);

	// use whichever test domain is currently active
	const output = url.replace(/{testdomain}/g, $testDomainRaw);

	// if the url still has variables
	if(output.match(/{[^{}]+}/g)?.length){
		// send request to the UI layer
		$eyasLayer.webContents.send(`show-variables-modal`, output);
	} else {
		// just pass through to navigate
		navigate(parseURL(output).toString());
	}
}