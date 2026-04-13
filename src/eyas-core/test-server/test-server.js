import path from 'node:path';
import express from 'express';
import getPortModule from 'get-port';
import http from 'node:http';
import https from 'node:https';
import fs from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const getPort = typeof getPortModule === `function` ? getPortModule : getPortModule.default;

let safeJoin = null;
let parseURL = null;

let server = null;
let state = null;
let cachedPorts = { http: null, https: null };
const HOST = `127.0.0.1`;
const DEFAULT_PORT = 12701;

async function getAvailablePort(urlStr, useHttps) {
	if (!parseURL) {
		const parseUrlPath = [
			path.join(__dirname, `..`, `..`, `scripts`, `parse-url.js`),
			path.join(__dirname, `..`, `scripts`, `parse-url.js`)
		].find(p => fs.existsSync(p));

		({ parseURL } = await import(pathToFileURL(parseUrlPath)));
	}

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

	const resultPort = await getPort({ port: preferredPorts, host: HOST });

	cachedPorts[protoKey] = resultPort;
	return cachedPorts[protoKey];
}


async function startTestServer(options) {
	if (!safeJoin) {
		const pathUtilsPath = [
			path.join(__dirname, `..`, `..`, `scripts`, `path-utils.js`),
			path.join(__dirname, `..`, `scripts`, `path-utils.js`)
		].find(p => fs.existsSync(p));

		({ safeJoin } = await import(pathToFileURL(pathUtilsPath)));
	}

	const { rootPath, useHttps = false, certs, customDomain } = options;
	if (server) {
		return getTestServerState();
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

	// SPA Fallback: send index.html for non-matched routes
	app.get(`*path`, (req, res) => {
		res.sendFile(path.join(rootPath, `index.html`));
	});

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
		return startTestServer(options);
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

async function stopTestServer() {
	if (server) {
		// forcefully terminate existing browser keep-alive connections (prevents ~15s delay)
		server.closeAllConnections();

		// stop listening for new connections
		await new Promise(resolve => server.close(resolve));

		server = null;
	}
	state = null;
}


function clearTestServerPort() {
	cachedPorts = { http: null, https: null };
}

function getTestServerState() {
	return state;
}

export {
	startTestServer,
	stopTestServer,
	getTestServerState,
	clearTestServerPort,
	getAvailablePort
};
