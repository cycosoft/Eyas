import { vi, describe, test, expect } from 'vitest';

vi.mock(`node:http`, () => ({
	default: {
		createServer: vi.fn(() => ({ instanceOf: `http.Server` }))
	}
}));

vi.mock(`node:https`, () => ({
	default: {
		createServer: vi.fn(() => ({ instanceOf: `https.Server` }))
	}
}));

import http from 'node:http';
import https from 'node:https';
import express from 'express';
import { createExpressApp, createServerInstance } from '../../../src/eyas-core/test-server/test-server.js';

describe(`test-server helpers`, () => {
	test(`createExpressApp returns an express app`, () => {
		const app = createExpressApp(`/some/path`);
		expect(app).toBeDefined();
		expect(typeof app).toBe(`function`); // express app is a function
	});

	test(`createServerInstance returns http server when https is not requested`, () => {
		const app = express();
		const server = createServerInstance(app, { rootPath: `/some/path`, useHttps: false });
		expect(server).toMatchObject({ instanceOf: `http.Server` });
		expect(http.createServer).toHaveBeenCalled();
	});

	test(`createServerInstance returns https server when https and certs are provided`, () => {
		const app = express();
		const certs = { key: `fake-key`, cert: `fake-cert` };
		const server = createServerInstance(app, { rootPath: `/some/path`, useHttps: true, certs });
		expect(server).toMatchObject({ instanceOf: `https.Server` });
		expect(https.createServer).toHaveBeenCalledWith({ key: certs.key, cert: certs.cert }, app);
	});

	test(`createServerInstance returns http server when https is requested but no certs are provided`, () => {
		const app = express();
		const server = createServerInstance(app, { rootPath: `/some/path`, useHttps: true });
		expect(server).toMatchObject({ instanceOf: `http.Server` });
	});
});
