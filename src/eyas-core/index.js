/* global __dirname, process */

'use strict';

// global imports _
const { app: _electronCore, BrowserWindow: _electronWindow } = require(`electron`);
const _path = require(`path`);
const _os = require(`os`);

// only allow a single instance of the app to be at a time
const isPrimaryInstance = _electronCore.requestSingleInstanceLock();
if (!isPrimaryInstance) {
	console.log(``);
	console.log(`Another instance of the app is already running. Exiting.`);
	console.log(``);

	_electronCore.quit();
}

// global variables $
const $isDev = process.argv.includes(`--dev`);
let $appWindow = null;
let $eyasLayer = null;
let $config = null;
let $configToLoad = {};
let $testNetworkEnabled = true;
let $exposeHttpsEnabled = false;
let $exposeMenuIntervalId = null;
let $testDomainRaw = null;
let $testDomain = `eyas://local.test`;
const $uiDomain = `ui://eyas.interface`;
const $defaultViewports = [
	{ isDefault: true, label: `Desktop`, width: 1366, height: 768 },
	{ isDefault: true, label: `Tablet`, width: 768, height: 1024 },
	{ isDefault: true, label: `Mobile`, width: 360, height: 640 }
];
let $allViewports = [];
const $currentViewport = [];
let $updateStatus = `idle`;
let $updateCheckUserTriggered = false;
let $onCheckForUpdates = () => {};
let $onInstallUpdate = () => {};
const $roots = require(_path.join(__dirname, `scripts`, `get-roots.js`));
const { parseURL } = require(_path.join(__dirname, `scripts`, `parse-url.js`));
const $paths = {
	icon: _path.join($roots.eyas, `eyas-assets`, `eyas-logo.png`),
	configLoader: _path.join($roots.eyas, `scripts`, `get-config.js`),
	packageJson: _path.join($roots.eyas, `package.json`),
	testPreload: _path.join($roots.eyas, `scripts`, `test-preload.js`),
	eventBridge: _path.join($roots.eyas, `scripts`, `event-bridge.js`),
	constants: _path.join($roots.eyas, `scripts`, `constants.js`),
	testSrc: null,
	uiSource: _path.join($roots.eyas, `eyas-interface`),
	eyasInterface: _path.join($roots.eyas, `eyas-interface`, `index.html`),
	splashScreen: _path.join($roots.eyas, `eyas-interface`, `splash.html`)
};
const $operatingSystem = _os.platform();
const { version: _appVersion } = require($paths.packageJson);
const { buildMenuTemplate } = require(_path.join(__dirname, `menu-template.js`));
const { getNoUpdateAvailableDialogOptions } = require(_path.join(__dirname, `update-dialog.js`));
const { MP_EVENTS } = require(_path.join(__dirname, `metrics-events.js`));
const exposeServer = require(_path.join(__dirname, `expose`, `expose-server.js`));
const exposeCerts = require(_path.join(__dirname, `expose`, `expose-certs.js`));
const exposeTimeout = require(_path.join(__dirname, `expose`, `expose-timeout.js`));
const exposeHosts = require(_path.join(__dirname, `expose`, `expose-hosts.js`));

// constants
const { LOAD_TYPES } = require($paths.constants);
const APP_NAME = `Eyas`;

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
// const appUrlOverride = parseURL($config.domains);
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
	// imports
	const {
		handleEyasProtocolUrl,
		getEyasUrlFromCommandLine
	} = require(_path.join(__dirname, `deep-link-handler.js`));

	// register the custom protocol for OS deep linking (native Electron API; macOS dev requires packaged app)
	if (process.defaultApp) {
		if (process.argv.length >= 2) {
			_electronCore.setAsDefaultProtocolClient(
				`eyas`,
				process.execPath,
				[_path.resolve(process.argv[1])]
			);
		} else {
			_electronCore.setAsDefaultProtocolClient(`eyas`);
		}
	} else {
		_electronCore.setAsDefaultProtocolClient(`eyas`);
	}

	const deepLinkContext = {
		getAppWindow: () => $appWindow,
		setConfigToLoad: p => { $configToLoad = p; },
		loadConfig: async (method, path) => {
			$config = await require($paths.configLoader)(method, path);
		},
		startAFreshTest,
		LOAD_TYPES
	};

	// macOS: detect if the app was opened with a file
	_electronCore.on(`open-file`, async (event, path) => {
		// ensure the correct file type is being opened
		if(!path.endsWith(`.eyas`)){ return; }

		// if the $appWindow was already initialized
		if($appWindow){
			// load the new config
			$config = await require($paths.configLoader)(LOAD_TYPES.ASSOCIATION, path);

			// start a new test based on the newly loaded config
			startAFreshTest();
		} else {
			// define the config to load when the app is ready
			$configToLoad = {
				method: LOAD_TYPES.ASSOCIATION,
				path
			};
		}
	});

	// macOS: handle eyas:// protocol (open-url); Windows/Linux: handle second instance with protocol URL
	_electronCore.on(`open-url`, (event, url) => {
		event.preventDefault();
		handleEyasProtocolUrl(url, deepLinkContext);
	});
	_electronCore.on(`second-instance`, (_event, commandLine) => {
		if ($appWindow) {
			if ($appWindow.isMinimized()) { $appWindow.restore(); }
			$appWindow.focus();
		}
		const url = getEyasUrlFromCommandLine(commandLine);
		if (url) {
			handleEyasProtocolUrl(url, deepLinkContext);
		}
	});

	// add support for eyas:// protocol
	registerInternalProtocols();

	// start the electron layer
	_electronCore.whenReady()
		// when the electron layer is ready
		.then(async () => {
			// get config based on the context
			$config = await require($paths.configLoader)($configToLoad.method || LOAD_TYPES.AUTO, $configToLoad.path);

			// start listening for requests to the custom protocol
			setupEyasNetworkHandlers();

			// start the UI layer
			initElectronUi();

			setupAutoUpdater();

			// if Electron receives the `activate` event
			_electronCore.on(`activate`, () => {
				// if the window does not already exist, create it
				!_electronWindow.getAllWindows().length && initElectronUi();
			});
		});
}

// initiate the core electron UI layer
async function initElectronUi() {
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
		icon: $paths.icon,
		show: false,
		webPreferences: {
			preload: $paths.testPreload,
			partition: `persist:${$config.meta.testId}`
		}
	});

	// intercept all web requests
	$appWindow.webContents.session.webRequest.onBeforeRequest({ urls: [`<all_urls>`] }, (request, callback) => {
		// validate this request
		if (disableNetworkRequest(request.url)) {
			return callback({ cancel: true });
		}

		// allow the request to continue
		callback({ cancel: false });
	});

	// display the splash screen to the user
	const splashScreen = createSplashScreen();

	// track the time the splash screen was created as a backup
	let splashVisible = performance.now();

	// when the splash screen content has loaded, set a new more specific time
	splashScreen.webContents.on(`did-finish-load`, () => splashVisible = performance.now());

	// load a default page so the app doesn't start black
	$appWindow.loadURL(`data:text/html,` + encodeURIComponent(`<html><body></body></html>`));

	// track the app launch event
	trackEvent(MP_EVENTS.core.launch);

	// exit the app if the test has expired
	// NOTE: THIS NEEDS TO BE MOVED TO THE UI LAYER
	checkTestExpiration();

	// listen for app events
	initTestListeners();
	initUiListeners();

	// Initialize the $eyasLayer
	$eyasLayer = new BrowserView({ webPreferences: {
		preload: $paths.eventBridge,
		partition: `persist:${$config.meta.testId}`,
		backgroundThrottling: false // allow to update even when hidden (e.g. modal close)
	} });
	$appWindow.addBrowserView($eyasLayer);
	$eyasLayer.webContents.loadURL(`${$uiDomain}/index.html`);

	// once the Eyas UI layer is ready, attempt navigation
	$eyasLayer.webContents.on(`did-finish-load`, async () => {
		// start the test
		await startAFreshTest();

		// set a minimum time for the splash screen to be visible
		const splashMinTime = 750;
		const splashDelta = performance.now() - splashVisible;
		const splashTimeout = splashDelta > splashMinTime ? 0 : splashMinTime - splashDelta;
		setTimeout(() => {
			// show the app window
			$appWindow.show();

			// we're done with the splash screen
			splashScreen.destroy();
		}, splashTimeout);
	});
}

// create a splash screen to display to the user while we wait for the $eyasLayer to load
function createSplashScreen() {
	// imports
	const { BrowserWindow } = require(`electron`);

	// create the splash screen
	const splashScreen = new BrowserWindow({
		width: 400,
		height: 400,
		frame: false,
		transparent: true,
		alwaysOnTop: true,
		show: false,
		webPreferences: {
			partition: `persist:${$config.meta.testId}`
		}
	});

	// load the splash screen
	splashScreen.webContents.loadURL(`${$uiDomain}/splash.html`);

	// when the splash screen content has loaded
	splashScreen.webContents.on(`did-finish-load`, () => {
		// center the splash screen
		splashScreen.center();

		// show the splash screen
		splashScreen.show();
	});

	// return the splashscreen handle so it can be later destroyed
	return splashScreen;
}

// initialize the listeners on the test content
function initTestListeners() {
	// listen for the window to close
	$appWindow.on(`close`, manageAppClose);

	// listen for changes to the window size
	$appWindow.on(`resize`, onResize);

	// Whenever a title update is requested
	$appWindow.on(`page-title-updated`, onTitleUpdate);

	// Whenever the content is loaded on the app window
	$appWindow.webContents.on(`did-finish-load`, () => {
		// update the title
		$appWindow.setTitle(getAppTitle());

		// update the cache menu
		setMenu();
	});

	// when there's a navigation failure
	$appWindow.webContents.on(`did-fail-load`, (event, errorCode, errorDescription) => {
		// log the error
		console.error(`Navigation failed: ${errorCode} - ${errorDescription}`);
	});
}

// initialize the Eyas listeners
function initUiListeners() {
	// imports
	const { ipcMain } = require(`electron`);

	// update the network status
	ipcMain.on(`network-status`, (event, status) => {
		$testNetworkEnabled = status;
		setMenu();
	});

	// hide the UI when requested
	ipcMain.on(`hide-ui`, () => toggleEyasUI(false));

	// Whenever the UI layer has requested to close the app
	ipcMain.on(`app-exit`, () => {
		// remove the close event listener so we don't get stuck in a loop
		$appWindow.removeListener(`close`, manageAppClose);

		// track that the app is being closed
		trackEvent(MP_EVENTS.core.exit);

		// Shut down expose server if running, then exit
		stopExposeServer();
		_electronCore.quit();
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
	ipcMain.on(`launch-link`, (event, { url, openInBrowser }) => {
		// navigate to the requested url
		navigate(parseURL(url).toString(), openInBrowser);
	});

	// expose setup modal: user clicked Continue, start the server
	ipcMain.on(`expose-setup-continue`, (event, { useHttps }) => {
		$exposeHttpsEnabled = !!useHttps;
		doStartExpose();
	});
}

// method for tracking events
async function trackEvent(event, extraData) {
	// setup
	const MP_KEY_PROD = `07f0475cb429f7de5ebf79a1c418dc5c`;
	const MP_KEY_DEV = `02b67bb94dd797e9a2cbb31d021c3cef`;

	// imports
	const Mixpanel = require(`mixpanel`);

	// if mixpanel has not been initialized
	if (!trackEvent.mixpanel) {
		// initialize mixpanel to the correct environment
		trackEvent.mixpanel ||= Mixpanel.init($isDev ? MP_KEY_DEV : MP_KEY_PROD);

		// get information about the user
		const { machineId } = require(`node-machine-id`);
		trackEvent.deviceId ||= await machineId();

		// define who the user is in mixpanel
		trackEvent.mixpanel.people.set(trackEvent.deviceId);
	}

	// if not running in dev mode
	trackEvent.mixpanel.track(event, {
		// core data to send with every request
		distinct_id: trackEvent.deviceId, // device to link action to
		$os: $operatingSystem,
		$app_version_string: _appVersion,
		companyId: $config.meta.companyId,
		projectId: $config.meta.projectId,
		testId: $config.meta.testId,

		// provided data to send with the event
		...extraData
	});
}

// forces an exit if the loaded test has expired
function checkTestExpiration () {
	// imports
	const { isPast } = require(`date-fns/isPast`);
	const { format } = require(`date-fns/format`);
	const { dialog } = require(`electron`);

	// setup
	const expirationDate = new Date($config.meta.expires);

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

// Get the app title
function getAppTitle() {
	// Always start with the main app name
	let output = APP_NAME;

	// Add the test app title
	output += ` :: ${$config.title}`;

	// Add the build version
	output += ` :: ${$config.version} ✨`;

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
	$currentViewport[1] = newHeight;

	// get the $eyasLayer dimensions
	const { width, height } = $eyasLayer.getBounds();

	// if the Eyas UI layer is visible
	if(width && height){
		// update the Eyas UI layer to match the new dimensions
		$eyasLayer.setBounds({ x: 0, y: 0, width: newWidth, height: newHeight });
	}

	// update the menu
	setMenu();
}

function stopExposeServer() {
	exposeHosts.removeAutoAdded();
	exposeServer.stopExpose();
	exposeTimeout.cancelExposeTimeout();
	if ($exposeMenuIntervalId) {
		clearInterval($exposeMenuIntervalId);
		$exposeMenuIntervalId = null;
	}
	setMenu();
}

function copyExposedUrlHandler() {
	const state = exposeServer.getExposeState();
	if (state && state.url) {
		require(`electron`).clipboard.writeText(state.url);
	}
}

function openExposedInBrowserHandler() {
	const state = exposeServer.getExposeState();
	if (state && state.url) {
		require(`electron`).shell.openExternal(state.url);
	}
}

async function startExposeHandler() {
	if (exposeServer.getExposeState()) return;
	if (!$paths.testSrc) return;

	// Always show the setup modal
	if ($eyasLayer) {
		const caInstalled = exposeCerts.isCaInstalled();
		const steps = [
			{ id: `ca`, label: `Install mkcert CA (bypass browser certificate warnings)`, status: caInstalled ? `done` : `pending`, canInitiate: !caInstalled },
			{ id: `hosts`, label: `Add domain to etc/hosts (optional)`, status: `pending`, canInitiate: false }
		];
		uiEvent(`show-expose-setup-modal`, {
			domain: `http://127.0.0.1`,
			hostnameForHosts: `local.test`,
			steps,
			useHttps: $exposeHttpsEnabled
		});
	}
}

async function doStartExpose() {
	let certs;
	if ($exposeHttpsEnabled) {
		try {
			certs = await exposeCerts.getCerts([`127.0.0.1`, `localhost`]);
		} catch (err) {
			console.error(`Expose HTTPS cert generation failed:`, err);
			return;
		}
	}
	try {
		await exposeServer.startExpose({
			rootPath: $paths.testSrc,
			useHttps: $exposeHttpsEnabled,
			certs: certs || undefined
		});
	} catch (err) {
		console.error(`Expose server start failed:`, err);
		return;
	}
	// Optional: add local.test to etc/hosts so user can open http://local.test:port (may require root)
	try {
		exposeHosts.addHostEntry(`local.test`);
	} catch {
		// addHostEntry may fail (e.g. no root for /etc/hosts)
	}
	exposeTimeout.startExposeTimeout(() => {
		if ($appWindow && typeof $appWindow.flashFrame === `function`) {
			$appWindow.flashFrame(true);
		}
		stopExposeServer();
	});
	$exposeMenuIntervalId = setInterval(() => setMenu(), 60 * 1000);
	setMenu();
}

// Set up the application menu
async function setMenu () {
	const { Menu, dialog } = require(`electron`);
	const { isURL } = require(`validator`);

	const sessionAge = getSessionAge();
	const cacheSize = await $appWindow.webContents.session.getCacheSize();

	const tolerance = 2;
	const viewportItems = [];
	let defaultsFound = false;
	$allViewports.forEach(res => {
		const [width, height] = $currentViewport || [];
		const isSizeMatch = Math.abs(res.width - width) <= tolerance && Math.abs(res.height - height) <= tolerance;
		if (!defaultsFound && res.isDefault) {
			viewportItems.push({ type: `separator` });
			defaultsFound = true;
		}
		viewportItems.push({
			label: `${isSizeMatch ? `🔘 ` : ``}${res.label} (${res.width} x ${res.height})`,
			click: () => $appWindow.setContentSize(res.width, res.height)
		});
	});
	if ($currentViewport && !$allViewports.some(res => Math.abs(res.width - $currentViewport[0]) <= tolerance && Math.abs(res.height - $currentViewport[1]) <= tolerance)) {
		viewportItems.unshift(
			{ label: `🔘 Current (${$currentViewport[0]} x ${$currentViewport[1]})`, click: () => $appWindow.setContentSize($currentViewport[0], $currentViewport[1]) },
			{ type: `separator` }
		);
	}

	const linkItems = [];
	$config.links.forEach(item => {
		const itemUrl = item.url;
		let isValid = false;
		let validUrl;
		const hasVariables = itemUrl.match(/{[^{}]+}/g)?.length;
		if (hasVariables) {
			const testUrl = itemUrl.replace(/{testdomain}/g, `validating.com`).replace(/{[^{}]+}/g, `validating`);
			isValid = isURL(testUrl);
		} else {
			validUrl = parseURL(itemUrl).toString();
			isValid = !!validUrl;
		}
		linkItems.push({
			label: `${item.external ? `🌐 ` : ``}${item.label || item.url}${isValid ? `` : ` (invalid entry: "${item.url}")`}`,
			click: () => hasVariables ? navigateVariable(itemUrl) : navigate(validUrl, item.external),
			enabled: isValid
		});
	});

	const context = {
		appName: APP_NAME,
		isDev: $isDev,
		testNetworkEnabled: $testNetworkEnabled,
		sessionAge,
		cacheSize,
		showAbout: () => {
			const { format } = require(`date-fns/format`);
			const { differenceInDays } = require(`date-fns/differenceInDays`);
			const now = new Date();
			const expires = new Date($config.meta.expires);
			const dayCount = differenceInDays(expires, now);
			const expirationFormatted = format(expires, `MMM do @ p`);
			const relativeFormatted = dayCount ? `~${dayCount} days` : `soon`;
			const startYear = 2023;
			const currentYear = now.getFullYear();
			const yearRange = startYear === currentYear ? startYear : `${startYear} - ${currentYear}`;
			dialog.showMessageBox($appWindow, {
				type: `info`,
				buttons: [`OK`],
				title: `About`,
				icon: $paths.icon,
				message: `
Name: ${$config.title}
Version: ${$config.version}
Expires: ${expirationFormatted} (${relativeFormatted})

Branch: ${$config.meta.gitBranch} #${$config.meta.gitHash}
User: ${$config.meta.gitUser}
Created: ${new Date($config.meta.compiled).toLocaleString()}
CLI: v${$config.meta.eyas}

Runner: v${_appVersion}

🏢 © ${yearRange} Cycosoft, LLC
🌐 https://cycosoft.com
🆘 https://github.com/cycosoft/Eyas/issues
`
			});
		},
		quit: _electronCore.quit,
		startAFreshTest,
		copyUrl: () => require(`electron`).clipboard.writeText($appWindow.webContents.getURL()),
		openUiDevTools: () => $eyasLayer.webContents.openDevTools(),
		navigateHome: () => navigate(),
		reload: () => $appWindow.webContents.reloadIgnoringCache(),
		back: () => $appWindow.webContents.goBack(),
		forward: () => $appWindow.webContents.goForward(),
		toggleNetwork: () => {
			$testNetworkEnabled = !$testNetworkEnabled;
			setMenu();
		},
		clearCache,
		openCacheFolder: () => require(`electron`).shell.openPath($appWindow.webContents.session.getStoragePath()),
		refreshMenu: setMenu,
		viewportItems,
		linkItems,
		updateStatus: typeof $updateStatus !== `undefined` ? $updateStatus : `idle`,
		onCheckForUpdates: typeof $onCheckForUpdates === `function` ? $onCheckForUpdates : () => {},
		onInstallUpdate: typeof $onInstallUpdate === `function` ? $onInstallUpdate : () => {},
		exposeActive: !!exposeServer.getExposeState(),
		exposeRemainingMinutes: (() => {
			const s = exposeServer.getExposeState();
			if (!s) { return 0; }
			const EXPIRE_MS = 30 * 60 * 1000;
			const elapsed = Date.now() - s.startedAt;
			const remaining = EXPIRE_MS - elapsed;
			return Math.max(0, Math.ceil(remaining / 60000));
		})(),
		onStartExpose: startExposeHandler,
		onStopExpose: stopExposeServer,
		onCopyExposedUrl: copyExposedUrlHandler,
		onOpenExposedInBrowser: openExposedInBrowserHandler,
		exposeHttpsEnabled: $exposeHttpsEnabled,
		onToggleExposeHttps: () => {
			$exposeHttpsEnabled = !$exposeHttpsEnabled;
			setMenu();
		}
	};

	const template = buildMenuTemplate(context);
	Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function setupAutoUpdater() {
	const { autoUpdater } = require(`electron-updater`);
	const { dialog } = require(`electron`);

	autoUpdater.forceDevUpdateConfig = true;

	// Silence internal logging to prevent duplicate stack traces
	autoUpdater.logger = null;

	autoUpdater.setFeedURL({
		provider: `github`,
		owner: `cycosoft`,
		repo: `Eyas`
	});

	$onCheckForUpdates = () => {
		$updateCheckUserTriggered = true;
		autoUpdater.checkForUpdates().catch(() => {});
	};
	$onInstallUpdate = () => autoUpdater.quitAndInstall();

	autoUpdater.on(`update-available`, () => {
		$updateStatus = `downloading`;
		setMenu();
	});
	autoUpdater.on(`update-downloaded`, () => {
		$updateStatus = `downloaded`;
		setMenu();
	});
	const showNoUpdateIfUserTriggered = () => {
		if ($updateCheckUserTriggered) {
			$updateCheckUserTriggered = false;
			dialog.showMessageBox($appWindow, getNoUpdateAvailableDialogOptions());
		}
	};
	autoUpdater.on(`update-not-available`, showNoUpdateIfUserTriggered);
	autoUpdater.on(`error`, err => {
		if (err.message?.includes(`404`)) {
			console.error(`Auto-update error: update server not found`);
		} else {
			console.error(`Auto-update error:`, err);
		}
		showNoUpdateIfUserTriggered();
	});

	autoUpdater.checkForUpdates().catch(() => {});
}

function getSessionAge() {
	const { formatDistanceToNow } = require(`date-fns/formatDistanceToNow`);
	let output = new Date();

	// get the path to the cache
	const cachePath = $appWindow.webContents.session.getStoragePath();

	// if the cache path was found
	if(cachePath){
		const fs = require(`fs`);

		// create a path to the `Session Storage` folder
		const sessionFolder = _path.join(cachePath, `Session Storage`);

		// if the session folder exists
		if(fs.existsSync(sessionFolder)){
			// get the date the folder was created
			output = fs.statSync(sessionFolder).birthtime;
		}
	}

	// format the output to a relative time
	output = formatDistanceToNow(output);

	return output;
}

// listen for the window to close
async function manageAppClose(evt) {
	// stop the window from closing
	evt.preventDefault();

	// send a message to the UI to show the exit modal with the captured image
	uiEvent(`modal-exit-visible`, true);

	// track that the modal background content was viewed
	trackEvent(MP_EVENTS.ui.modalBackgroundContentViewed);
}

// Toggle the Eyas UI layer so the user can interact with it or their test
function toggleEyasUI(enable) {
	if(enable) {
		// set the bounds to the current viewport
		$eyasLayer.setBounds({
			x: 0,
			y: 0,
			width: $currentViewport[0],
			height: $currentViewport[1]
		});

		// give the layer focus
		focusUI();
	} else {
		// close all modals in the UI
		$eyasLayer.webContents.send(`close-modals`);

		// shrink the bounds to 0 to hide it
		$eyasLayer.setBounds({ x: 0, y: 0, width: 0, height: 0 });
	}
}

// focus the UI layer
function focusUI() {
	// track the number of attempts to focus the UI to prevent infinite loops
	focusUI.attempts = focusUI.attempts || 0;
	focusUI.attempts++;

	// if the number of attempts is greater than 5
	if(focusUI.attempts > 5){
		// reset the number of attempts
		focusUI.attempts = 0;

		// stop trying to focus the UI
		return;
	}

	// give the layer focus
	$eyasLayer.webContents.focus();

	// check if the UI is focused
	setTimeout(() => {
		const isFocused = $eyasLayer.webContents.isFocused();

		// if the UI is not focused
		if(!isFocused){
			// call the focus method again
			focusUI();
		} else {
			// reset the number of attempts
			focusUI.attempts = 0;
		}
	}, 250);
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
			(exposeServer.getExposeState() && runningTestSource)
		)
	){
		// open the requested url in the default browser
		const { shell } = require(`electron`);
		shell.openExternal(path);
	} else {
		// otherwise load the requested path in the app window
		$appWindow.loadURL(path);
	}

	// ensure the UI is closed so the user can interact with the content
	toggleEyasUI(false);
}

// register a custom protocol for loading local test files and the UI
function registerInternalProtocols() {
	// imports
	const { protocol } = require(`electron`);

	// register the custom protocols for relative paths + crypto support
	protocol.registerSchemesAsPrivileged([
		{ scheme: `eyas`, privileges: {
			standard: true,
			secure: true,
			allowServiceWorkers: true,
			supportFetchAPI: true,
			corsEnabled: true,
			stream: true
		} },

		{ scheme: `ui`, privileges: {
			standard: true,
			secure: true
		} }
	]);
}

// handle blocking requests when the user disables the network
function disableNetworkRequest(url) {
	const output = false;

	// exit if the network is not disabled
	if($testNetworkEnabled){ return output; }

	// don't allow blocking the UI layer
	if(url.startsWith(`ui://`)){ return output; }

	return true;
}

// handle requests to the custom protocol
function setupEyasNetworkHandlers() {
	// imports
	const { session } = require(`electron`);
	const ses = session.fromPartition(`persist:${$config.meta.testId}`);

	// use the "ui" protocol to load the Eyas UI layer
	ses.protocol.handle(`ui`, request => {
		const { pathToFileURL } = require(`url`);

		// drop the protocol from the request
		const { pathname: relativePathToFile } = parseURL(request.url.replace(`ui://`, `https://`));

		// build the expected path to the requested file
		const localFilePath = _path.join($paths.uiSource, relativePathToFile);

		// return the Eyas UI layer to complete the request
		return ses.fetch(pathToFileURL(localFilePath).toString());
	});

	// use this protocol to load files relatively from the local file system
	ses.protocol.handle(`eyas`, request => {
		// validate this request
		if (disableNetworkRequest(request.url)) {
			return { cancel: true };
		}

		// imports
		const { pathToFileURL } = require(`url`);
		const fs = require(`fs`);

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
		let localFilePath = _path.join($paths.testSrc, relativePathToFile);

		if(
			// if the file doesn't exist
			!fs.existsSync(localFilePath)
			// AND the requested path isn't the root path
			&& $paths.testSrc !== _path.join($paths.testSrc, pathname)
		){
			// load root file instead
			localFilePath = _path.join($paths.testSrc, fileIfNotDefined);
		}

		// return the file from the local system to complete the request
		return ses.fetch(pathToFileURL(localFilePath).toString());
	});

	// listen for requests to the specified domains and redirect to the custom protocol
	ses.protocol.handle(`https`, async request => {
		// setup
		const { hostname, pathname } = parseURL(request.url);
		let bypassCustomProtocolHandlers = true;

		// if the request's hostname matches the test domain
		if(hostname === parseURL($testDomain).hostname) {
			// check if the config.source is a valid url
			const sourceOnWeb = parseURL($config.source);

			// if the config.source is a url
			if(sourceOnWeb){
				// redirect to the source domain with the same path
				request = sourceOnWeb.origin
					+ (sourceOnWeb.pathname + pathname)
						.replaceAll(`//`, `/`);
			} else {
				// otherwise the config.source is a file, look locally
				request = request.url.replace(`https://`, `eyas://`);
				bypassCustomProtocolHandlers = false;
			}
		}

		// make the request
		return ses.fetch(request, { bypassCustomProtocolHandlers });
	});
}

// clears the test cache
function clearCache() {
	// clear all caches for the session
	$appWindow.webContents.session.clearCache(); // web cache
	$appWindow.webContents.session.clearStorageData(); // cookies, filesystem, indexed db, local storage, shader cache, web sql, service workers, cache storage

	// update the menu to reflect the cache changes
	setMenu();
}

// refresh the app
async function startAFreshTest() {
	// imports
	const semver = require(`semver`);

	// stop expose server when test changes
	if (exposeServer.getExposeState()) {
		stopExposeServer();
	}

	// set the available viewports
	$allViewports = [...$config.viewports, ...$defaultViewports];

	// reset the current viewport to the first in the list
	$currentViewport[0] = $allViewports[0].width;
	$currentViewport[1] = $allViewports[0].height;
	$appWindow.setContentSize($currentViewport[0], $currentViewport[1]);

	// Set the application menu
	setMenu();

	// reset the path to the test source
	$paths.testSrc = $config.source;

	// check if $config.source is a url
	const sourceOnWeb = parseURL($config.source);
	if(sourceOnWeb){
		$testDomainRaw = $config.source;
		$testDomain = sourceOnWeb.toString();
	}

	// if there are no custom domains defined
	if (!$config.domains.length) {
		// load the test using the default domain
		navigate();
	}

	// if the user has a single custom domain
	if ($config.domains.length === 1) {
		// update the default domain
		$testDomainRaw = $config.domains[0].url;
		$testDomain = parseURL($testDomainRaw).toString();

		// directly load the user's test using the new default domain
		navigate();
	}

	// if the user has multiple custom domains
	if ($config.domains.length > 1) {
		// display the environment chooser modal
		uiEvent(`show-environment-modal`, $config.domains);
	}

	// if the runner is older than the version that built the test
	if($config.meta.eyas && semver.lt(_appVersion, $config.meta.eyas)){
		// send request to the UI layer
		uiEvent(`show-version-mismatch-modal`, _appVersion, $config.meta.eyas);
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

	// use whichever test domain is currently active
	const output = url.replace(/{testdomain}/g, $testDomainRaw);

	// if the url still has variables
	if(output.match(/{[^{}]+}/g)?.length){
		// send request to the UI layer
		uiEvent(`show-variables-modal`, output);
	} else {
		// just pass through to navigate
		navigate(parseURL(output).toString());
	}
}

// request the UI layer to launch an event
function uiEvent(eventName, ...args) {
	// display the UI layer
	toggleEyasUI(true);

	// send the interaction to the UI layer
	$eyasLayer.webContents.send(eventName, ...args);
}