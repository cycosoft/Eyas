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

const parseUrlPath = [
	path.join(__dirname, `..`, `..`, `scripts`, `parse-url.js`),
	path.join(__dirname, `..`, `scripts`, `parse-url.js`)
].find(p => require(`fs`).existsSync(p));

const { parseURL } = require(parseUrlPath);

let server = null;
let state = null;
let cachedPorts = { http: null, https: null };
const HOST = `127.0.0.1`;
const DEFAULT_PORT = 12701;

async function getAvailablePort(urlStr, useHttps) {
	const protoKey = useHttps ? `https` : `http`;
	if (cachedPorts[protoKey]) {
		return cachedPorts[protoKey];
	}

	let targetPort;
	if (urlStr) {
		const parsed = parseURL(urlStr);
		if (parsed) {
			if (parsed.port) {
				targetPort = parseInt(parsed.port, 10);
			} else {
				// Fallback to standard HTTP/HTTPS ports if not specified
				targetPort = useHttps ? 443 : 80;
			}
		}
	}

	let preferredPorts = [DEFAULT_PORT];
	if (targetPort) {
		preferredPorts = [targetPort];
		for (let i = 1; i <= 10; i++) {
			preferredPorts.push(targetPort + i);
		}
		preferredPorts.push(DEFAULT_PORT);
	}

	cachedPorts[protoKey] = await getPort({ port: preferredPorts });
	return cachedPorts[protoKey];
}

async function startExpose(options) {
	const { rootPath, useHttps = false, certs, customDomain } = options;
	if (server) {
		return getExposeState();
	}

	// use cached port for the specified protocol if available, otherwise find a new one
	const port = await getAvailablePort(null, useHttps);
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
		cachedPorts[options.useHttps ? `https` : `http`] = null;
		server = null;
		return startExpose(options);
	}

	// store the successfully bound port for future use
	cachedPorts[options.useHttps ? `https` : `http`] = port;

	state = {
		url: `${protocol}://${HOST}:${port}`,
		port,
		startedAt: Date.now(),
		useHttps: !!useHttps
	};

	if (customDomain) {
		state.customUrl = `${protocol}://${customDomain}:${port}`;
	}

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
	cachedPorts = { http: null, https: null };
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
