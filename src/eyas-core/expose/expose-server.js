/* global __dirname */

'use strict';

const path = require(`path`);
const express = require(`express`);
const getPortModule = require(`get-port`);
const getPort = typeof getPortModule === `function` ? getPortModule : getPortModule.default;
const http = require(`http`);
const https = require(`https`);

// Resolve path-utils.js robustly for both src and .build structures
const pathUtilsPath = [
	path.join(__dirname, `..`, `..`, `scripts`, `path-utils.js`),
	path.join(__dirname, `..`, `scripts`, `path-utils.js`)
].find(p => require(`fs`).existsSync(p));

const { safeJoin } = require(pathUtilsPath);

let server = null;
let state = null;
let cachedPort = null;
const HOST = `127.0.0.1`;
const DEFAULT_PORT = 12701;

async function getAvailablePort() {
	if (!cachedPort) {
		cachedPort = await getPort({ port: DEFAULT_PORT });
	}
	return cachedPort;
}

async function startExpose(options) {
	const { rootPath, useHttps = false, certs } = options;
	if (server) {
		return getExposeState();
	}

	// use cached port if available, otherwise try default port 12701, then find a new one
	const port = await getAvailablePort();
	const app = express();

	app.use((req, res, next) => {
		const safe = safeJoin(rootPath, req.path);
		if (safe === null) {
			return res.status(404).end();
		}
		req._safePath = safe;
		next();
	});

	app.use(express.static(rootPath, { index: [`index.html`] }));

	app.use((req, res) => {
		res.status(404).end();
	});

	const protocol = useHttps && certs ? `https` : `http`;
	if (useHttps && certs) {
		server = https.createServer({ key: certs.key, cert: certs.cert }, app);
	} else {
		server = http.createServer(app);
	}

	try {
		await new Promise((resolve, reject) => {
			server.listen(port, HOST, () => resolve());
			server.on(`error`, reject);
		});
	} catch {
		// if there was an error, clear the port and server state and try again
		cachedPort = null;
		server = null;
		return startExpose(options);
	}

	// store the successfully bound port for future use
	cachedPort = port;

	state = {
		url: `${protocol}://${HOST}:${port}`,
		port,
		startedAt: Date.now(),
		useHttps: !!useHttps
	};
	return state;
}

function stopExpose() {
	if (server) {
		// forcefully terminate existing browser keep-alive connections (prevents ~15s delay)
		server.closeAllConnections();

		// stop listening for new connections
		server.close();

		server = null;
	}
	state = null;
}

function clearExposePort() {
	cachedPort = null;
}

function getExposeState() {
	return state;
}

module.exports = {
	startExpose,
	stopExpose,
	getExposeState,
	clearExposePort,
	getAvailablePort
};
