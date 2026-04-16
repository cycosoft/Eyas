import path from 'node:path';
import express from 'express';
import getPortModule from 'get-port';
import http from 'node:http';
import https from 'node:https';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import type {
	TestServerState,
	TestServerOptions,
	CachedPorts,
	TestServer
} from '../../types/test-server.js';

const getPort = typeof getPortModule === `function` ? getPortModule : (getPortModule as unknown as { default: typeof getPortModule }).default;

let safeJoin: ((root: string, subPath: string | null | undefined) => string | null) | null = null;
let parseURL: ((url: string | null | undefined) => URL | string) | null = null;

let server: TestServer | null = null;
let state: TestServerState | null = null;
let cachedPorts: CachedPorts = { http: null, https: null };
const HOST = `127.0.0.1`;
const DEFAULT_PORT = 12701;

async function getAvailablePort(urlStr: string | null, useHttps: boolean): Promise<number> {
	if (!parseURL) {
		const parseUrlPath = [
			path.join(import.meta.dirname, `..`, `..`, `scripts`, `parse-url.js`),
			path.join(import.meta.dirname, `..`, `scripts`, `parse-url.js`),
			path.join(import.meta.dirname, `..`, `..`, `scripts`, `parse-url.ts`),
			path.join(import.meta.dirname, `..`, `scripts`, `parse-url.ts`)
		].find(p => fs.existsSync(p));

		if (parseUrlPath) {
			const mod = await import(pathToFileURL(parseUrlPath).href);
			parseURL = mod.parseURL;
		}
	}

	const protoKey: keyof CachedPorts = useHttps ? `https` : `http`;

	const cached = cachedPorts[protoKey];
	if (cached) {
		return cached;
	}

	let targetPort: number | undefined;
	if (urlStr && parseURL) {
		const parsed = parseURL(urlStr);
		if (parsed instanceof URL) {
			if (parsed.port) {
				targetPort = parseInt(parsed.port, 10);
			} else {
				// Fallback to standard HTTP/HTTPS ports if not specified
				targetPort = useHttps ? 443 : 80;
			}
		}
	}

	let preferredPorts: number[] = [DEFAULT_PORT];
	if (targetPort) {
		preferredPorts = [targetPort];
		for (let i = 1; i <= 10; i++) {
			preferredPorts.push(targetPort + i);
		}
		preferredPorts.push(DEFAULT_PORT);
	}

	const resultPort = await getPort({ port: preferredPorts, host: HOST });

	cachedPorts[protoKey] = resultPort;
	return resultPort;
}


// Extended types for express
interface EyasRequest extends express.Request {
	_safePath?: string;
}

async function startTestServer(options: TestServerOptions): Promise<TestServerState | null> {
	if (!safeJoin) {
		const pathUtilsPath = [
			path.join(import.meta.dirname, `..`, `..`, `scripts`, `path-utils.js`),
			path.join(import.meta.dirname, `..`, `scripts`, `path-utils.js`),
			path.join(import.meta.dirname, `..`, `..`, `scripts`, `path-utils.ts`),
			path.join(import.meta.dirname, `..`, `scripts`, `path-utils.ts`)
		].find(p => fs.existsSync(p));

		if (pathUtilsPath) {
			const mod = await import(pathToFileURL(pathUtilsPath).href);
			safeJoin = mod.safeJoin;
		}
	}

	const { rootPath, useHttps = false, certs, customDomain } = options;
	if (server) {
		return getTestServerState();
	}

	// use cached port for the specified protocol if available, otherwise find a new one
	const port = await getAvailablePort(null, useHttps);
	const app = express();

	app.use((req: EyasRequest, res: express.Response, next: express.NextFunction) => {
		if (safeJoin) {
			const safe = safeJoin(rootPath, req.path);
			if (safe === null) {
				res.status(404).end();
				return;
			}
			req._safePath = safe;
		}
		next();
	});

	app.use(express.static(rootPath, { index: [`index.html`] }));

	// SPA Fallback: send index.html for non-matched routes
	app.get(`*path`, (_req: EyasRequest, res: express.Response) => {
		res.sendFile(path.join(rootPath, `index.html`));
	});

	app.use((_req: EyasRequest, res: express.Response) => {
		res.status(404).end();
	});

	const protocol = useHttps && certs ? `https` : `http`;
	if (useHttps && certs) {
		server = https.createServer({ key: certs.key, cert: certs.cert }, app);
	} else {
		server = http.createServer(app);
	}

	try {
		await new Promise<void>((resolve, reject) => {
			if (server) {
				server.listen(port, HOST, () => resolve());
				server.on(`error`, reject);
			} else {
				reject(new Error(`Server failed to initialize`));
			}
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

async function stopTestServer(): Promise<void> {
	if (server) {
		// forcefully terminate existing browser keep-alive connections (prevents ~15s delay)
		server.closeAllConnections();

		// stop listening for new connections
		await new Promise<void>(resolve => {
			if (server) {
				server.close(() => resolve());
			} else {
				resolve();
			}
		});

		server = null;
	}
	state = null;
}


function clearTestServerPort(): void {
	cachedPorts = { http: null, https: null };
}

function getTestServerState(): TestServerState | null {
	return state;
}

export {
	startTestServer,
	stopTestServer,
	getTestServerState,
	clearTestServerPort,
	getAvailablePort
};
