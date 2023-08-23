/* global process */

//note https://httptoolkit.com/blog/javascript-mitm-proxy-mockttp/

// We have to deal with self-signed and therefore untrusted root certificates.
// process.env.NODE_TLS_REJECT_UNAUTHORIZED = `0`;

//wrapped in an async function to allow for await calls
(async () => {
	// imports
	const { app: electronLayer, BrowserWindow, Menu, dialog, shell } = require(`electron`);
	const express = require(`express`);
	const path = require(`path`);
	const http = require(`http`);
	const https = require(`https`);
	const mkcert = require(`mkcert`);
	const mockttp = require(`mockttp`);
	const config = require(path.join(process.cwd(), `.eyasrc.js`));

	// config
	const appTitle = `Eyas`;
	const testServerPort = config.serverPort || 3000;
	const testServerUrl = `https://localhost:${testServerPort}`;
	const proxyServerPort = 3100;
	const appUrl = config.appUrl || testServerUrl;
	const windowConfig = {
		width: config.appWidth,
		height: config.appHeight,
		title: `${appTitle} : ${config.appTitle} : ${config.buildVersion || `Unspecified Build`} ✨`.trim()
	};
	let clientWindow = null;
	let expressLayer = null;

	// Configure Electron to ignore certificate errors
	// electronLayer.commandLine.appendSwitch(`ignore-certificate-errors`);
	electronLayer.commandLine.appendSwitch(`proxy-server`, `https://localhost:${proxyServerPort}`);

	const ca = await mkcert.createCA({
		organization: `Cycosoft, LLC - Test Server`,
		countryCode: `US`,
		state: `Arizona`,
		locality: `Chandler`,
		validityDays: 7
	});

	// process.env.NODE_EXTRA_CA_CERTS = ca.cert;

	// start the test server
	await setupTestServer();

	// start the proxy server
	// await createProxyServer();

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

	function navigate (url, external) {
		console.log(`navigate`, url, {external});
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
		//NOTE: might not need express

		// Create the Express app
		expressLayer = express();

		// Serve static files from dist/
		expressLayer.use(express.static(path.join(process.cwd(), config.testSourceDirectory)));

		//is this actually doing anything?
		// expressLayer.use((req, res, next) => {
		// 	console.log(`Received request: ${req.method} ${req.url}`);
		// 	next();
		// });

		// create SSL certificate for the server
		// const ca = await mkcert.createCA({
		// 	organization: `Cycosoft, LLC - Test Server`,
		// 	countryCode: `US`,
		// 	state: `Arizona`,
		// 	locality: `Chandler`,
		// 	validityDays: 7
		// });

		// console.log({ca});



		const cert = await mkcert.createCert({
			domains: [`localhost`],
			validityDays: 7,
			caKey: ca.key,
			caCert: ca.cert
		});

		// console.log({cert});

		var testServerOptions = {
			key: cert.key,
			cert: cert.cert,
			ca: ca.cert,
			requestCert: true,
			rejectUnauthorized: true
		};

		// Start the server
		return https
			.createServer(testServerOptions, expressLayer)
			.listen(testServerPort, () => {
				console.log(`started test server on ${testServerPort}`);

				createProxyServer();
			});
	}

	// Properly close the server when the app is closed
	electronLayer.on(`before-quit`, () => process.exit(0));

	async function createProxyServer() {
		//if the user didn't specify an appUrl, don't create a proxy server
		if(!config.appUrl){ return; }

		//we only need a host name for the proxy server
		const { hostname } = new URL(config.appUrl);
		console.log(`proxy goal:`, {hostname});

		// create SSL certificate for the server
		// const ca = await mkcert.createCA({
		// 	organization: `Cycosoft, LLC - Proxy Server`,
		// 	countryCode: `US`,
		// 	state: `Arizona`,
		// 	locality: `Chandler`,
		// 	validityDays: 7
		// });

		// Configure the NODE_EXTRA_CA_CERTS environment variable to use the root CA certificate
		// process.env.NODE_EXTRA_CA_CERTS = ca.cert;

		const cert = await mkcert.createCert({
			domains: [`localhost`],
			validityDays: 7,
			caKey: ca.key,
			caCert: ca.cert
		});

		// const { createProxyMiddleware } = require(`http-proxy-middleware`);
		// const app = express();
		// console.log(`define proxy server`);
		// app.use(
		// 	`/`,
		// 	createProxyMiddleware({
		// 		target: testServerUrl,
		// 		ssl: { key: cert.key, cert: cert.cert },
		// 		changeOrigin: true,
		// 		secure: false,
		// 		onError: (err, req, res) => console.log(`proxy error:`, err),
		// 		onClose: () => console.log(`proxy closed`),
		// 		onProxyReq: (proxyReq, req, res) => {
		// 			console.log(`proxy request:`, req.url);
		// 		},
		// 		onProxyRes: (proxyRes, req, res) => {
		// 			console.log(`proxy response:`, req.url);
		// 		},
		// 		onOpen: proxySocket => {
		// 			console.log(`proxy open:`, proxySocket);
		// 		},
		// 		onProxyReqWs: (proxyReq, req, socket, options, head) => {
		// 			console.log(`proxy ws request:`, req.url);
		// 		}
		// 	})
		// );
		// app.listen(proxyServerPort, () => {
		// 	console.log(`started proxy server on ${proxyServerPort}`);

		// 	electronInit();
		// });

		const httpProxy = require(`http-proxy`);
		var proxy = httpProxy.createServer();
		// https://github.com/nodejitsu/node-http-proxy/issues/734
		//	this might not be needed any longer
		proxy.on(`proxyRes`, function(proxyRes, req, res) {
			console.log(`proxy response:`, req.url);
			if (res.shouldKeepAlive) {
				proxyRes.headers.connection = `keep-alive`;
			}
		});

		var proxyServer = http.createServer(function(req, res) {
			var proxyServerOptions = {
				target: {
					host: `localhost`,
					port: testServerPort,
					protocol: `https:`,
					key: cert.key,
					cert: cert.cert,
					ca: ca.cert
				},
				changeOrigin: true
			};

			proxy.web(req, res, proxyServerOptions, function(err) {
				console.log(`oh nooooo: ` + err.toString());

				if (!res.headersSent) {
					res.statusCode = 502;
					res.end(`bad gateway`);
				}
			});
		});

		proxyServer.listen(proxyServerPort, function() {
			console.log(`proxy server on port ${proxyServerPort}`);
			electronInit();
		});

		// const proxyServer = httpProxy.createProxyServer({
		// 	target: testServerUrl,
		// 	ssl: { key: cert.key, cert: cert.cert },
		// 	secure: false,
		// 	changeOrigin: true
		// }).listen(proxyServerPort);

		// https.createServer({
		// 	ssl: {
		// 		key: cert.key,
		// 		cert: cert.cert
		// 	},
		// 	target: testServerUrl,
		// 	secure: true
		// }, (req, res) => {
		// 	// res.writeHead(200);
		// 	// res.end(`hello world\n`);
		// 	console.log(req, res);
		// 	proxy.web(req, res, {
		// 		target: testServerUrl
		// 	});
		// }).listen(443, () => {
		// 	console.log(`started proxy server on 443`);
		// });

		// Create a proxy server with a self-signed HTTPS CA certificate:
		// const certs = await mockttp.generateCACertificate();
		// const certs = { key: cert.key, cert: cert.cert };
		// const proxyServer = mockttp.getLocal({ https });
		// const proxyServer = mockttp.getLocal({
		// 	cors: true,
		// 	debug: true,
		// 	http2: true,
		// 	https: certs,
		// 	recordTraffic: false
		// });
		// await proxyServer
		// 	.forAnyRequest()
		// 	.forHostname(hostname)
		// 	.always()
		// 	.thenForwardTo(testServerUrl);
		// await proxyServer.forAnyRequest().thenPassThrough();
		// await proxyServer.start(proxyServerPort);




		// const proxyServerPort = proxyServer.port;

		// console.log(`proxy server loaded on:`, proxyServerPort);
		// const caFingerprint = mockttp.generateSPKIFingerprint(https.cert);
		// console.log(`CA cert fingerprint ${caFingerprint}`);

		//require requests to be made through the proxy
		// await clientWindow.webContents.session.setProxy({
		// 	proxyRules: `https://localhost:${proxyServerPort}`
		// });

		// console.log(`setProxy:`, `https://localhost:${proxyServerPort}`);
	}

	// SSL/TSL: this is the self signed certificate support
	// electronLayer.on(`certificate-error`, (event, webContents, url, error, certificate, callback) => {
	// 	console.log(`cert error detected`);
	// // On certificate error we disable default behavior (stop loading the page)
	// // and we then say "it is all fine - true" to the callback
	// 	event.preventDefault();
	// 	callback(true);
	// });

	//perform app cleanup
	//	shut down test server
	//	shut down proxy server
})();