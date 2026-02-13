'use strict';

const path = require(`path`);
const express = require(`express`);
const getPortModule = require(`get-port`);
const getPort = typeof getPortModule === `function` ? getPortModule : getPortModule.default;
const http = require(`http`);
const https = require(`https`);

let server = null;
let state = null;
const HOST = `127.0.0.1`;

function safePath(rootPath, requestPath) {
	const normalized = path.normalize(path.join(`.`, requestPath)).replace(/^(\.\.(\/|\\))+/, ``);
	const resolved = path.resolve(rootPath, normalized);
	const rootResolved = path.resolve(rootPath);
	return resolved.startsWith(rootResolved) ? resolved : null;
}

async function startExpose(options) {
	const { rootPath, useHttps = false, certs } = options;
	if (server) {
		return getExposeState();
	}

	const port = await getPort();
	const app = express();

	app.use((req, res, next) => {
		const safe = safePath(rootPath, req.path);
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

	await new Promise((resolve, reject) => {
		server.listen(port, HOST, () => resolve());
		server.on(`error`, reject);
	});

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

function getExposeState() {
	return state;
}

module.exports = {
	startExpose,
	stopExpose,
	getExposeState
};
