/* global process */

//wrapped in an async function to allow for "root" await calls
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

	// config
	const appTitle = `Eyas`;
	const testServerPort = config.serverPort || 3000;
	const testServerUrl = `https://localhost:${testServerPort}`;
	const appUrl = config.appUrl || testServerUrl;
	const windowConfig = {
		width: config.appWidth,
		height: config.appHeight,
		title: `${appTitle} : ${config.appTitle} : ${config.buildVersion || `Unspecified Build`} ✨`.trim(),
		webPreferences: {
			contextIsolation: false
		}
	};
	let clientWindow = null;
	let expressLayer = null;

	// Configure Electron to ignore certificate errors
	electronLayer.commandLine.appendSwitch(`ignore-certificate-errors`);

	//if a custom domain is provided
	if(config.appUrl){
		//override requests to the custom domain to use the test server
		electronLayer.commandLine.appendSwitch(
			`host-resolver-rules`,
			`MAP *.google.com localhost:${testServerPort}`
		);
	}

	// start the test server
	await setupTestServer();

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

	//manage navigation
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

		// Create a menu template
		setMenu();

		// Prevent the title from changing
		clientWindow.on(`page-title-updated`, evt => evt.preventDefault());

		// Load the index.html of the app
		navigate(appUrl);
	}

	// Set up Express to serve files from dist/
	async function setupTestServer () {
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

		var testServerOptions = {
			key: cert.key,
			cert: cert.cert
		};

		// Start the server
		return https
			.createServer(testServerOptions, expressLayer)
			.listen(testServerPort, async () => {
				electronInit();
			});
	}

	// Properly close the server when the app is closed
	electronLayer.on(`before-quit`, () => process.exit(0));
})();