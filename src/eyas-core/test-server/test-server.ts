import path from 'node:path';
import express from 'express';
import getPortModule from 'get-port';
import http from 'node:http';
import https from 'node:https';
import type {
	TestServerState,
	TestServerOptions,
	CachedPorts,
	TestServer,
	EyasRequest
} from '../../types/test-server.js';
import type { DomainUrl, PortNumber, FileSystemPath, IsActive } from '../../types/primitives.js';

import { parseURL } from '../../scripts/parse-url.js';
import { safeJoin } from '../../scripts/path-utils.js';

import type { ModuleWithDefault } from '../../types/meta.js';

const getPort = typeof getPortModule === `function` ? getPortModule : (getPortModule as unknown as ModuleWithDefault<typeof getPortModule>).default;

let server: TestServer | null = null;
let state: TestServerState | null = null;
let cachedPorts: CachedPorts = { http: null, https: null };
const HOST = `127.0.0.1`;
const DEFAULT_PORT = 12701;

async function getAvailablePort(urlStr: DomainUrl | null, useHttps: IsActive): Promise<PortNumber> {
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


// Extended types for express moved to registry

/**
 * Initializes the path-utils module by loading the safeJoin function.
 */
async function initPathUtils(): Promise<void> {
	// No longer needed, using static imports
}

/**
 * Creates and configures an Express application for the test server.
 * @param rootPath The root directory to serve files from.
 * @returns The configured Express application.
 */
function createExpressApp(rootPath: FileSystemPath): express.Express {
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

	return app;
}

/**
 * Creates an HTTP or HTTPS server instance based on the provided options.
 * @param app The Express application to use.
 * @param options The server options.
 * @returns The created server instance.
 */
function createServerInstance(app: express.Express, options: TestServerOptions): http.Server | https.Server {
	const { useHttps, certs } = options;
	if (useHttps && certs) {
		return https.createServer({ key: certs.key, cert: certs.cert }, app);
	}
	return http.createServer(app);
}

/**
 * Starts the server and listens on the specified port.
 * @param serverInstance The server instance to start.
 * @param port The port to listen on.
 * @returns A promise that resolves when the server is listening.
 */
async function listenOnPort(serverInstance: http.Server | https.Server, port: PortNumber): Promise<void> {
	await new Promise<void>((resolve, reject) => {
		serverInstance.listen(port, HOST, () => {
			resolve();
		});
		serverInstance.on(`error`, err => {
			reject(err);
		});
	});
}

async function startTestServer(options: TestServerOptions): Promise<TestServerState | null> {
	await initPathUtils();

	const { rootPath, useHttps = false, certs, customDomain } = options;
	if (server) {
		return getTestServerState();
	}

	// use cached port for the specified protocol if available, otherwise find a new one
	const port = await getAvailablePort(null, useHttps);
	const app = createExpressApp(rootPath);

	const protocol = useHttps && certs ? `https` : `http`;
	server = createServerInstance(app, options);

	try {
		await listenOnPort(server, port);
	} catch {
		// if there was an error, clear the port and server state and try again
		cachedPorts[useHttps ? `https` : `http`] = null;
		server = null;
		return startTestServer(options);
	}

	// store the successfully bound port for future use
	cachedPorts[useHttps ? `https` : `http`] = port;

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
	getAvailablePort,
	initPathUtils,
	createExpressApp,
	createServerInstance,
	listenOnPort
};
