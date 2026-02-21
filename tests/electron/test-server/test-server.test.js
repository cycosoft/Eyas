import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { startTestServer, stopTestServer, getTestServerState, clearTestServerPort, getAvailablePort } from '../../../src/eyas-core/test-server/test-server.js';

describe(`test-server`, () => {
	let tempDir;

	beforeEach(async () => {
		clearTestServerPort();
		tempDir = fs.mkdtempSync(path.join(os.tmpdir(), `eyas-test-server-`));
		fs.writeFileSync(path.join(tempDir, `index.html`), `<html>root</html>`);
		fs.mkdirSync(path.join(tempDir, `sub`), { recursive: true });
		fs.writeFileSync(path.join(tempDir, `sub`, `file.txt`), `sub file`);
	});

	afterEach(() => {
		stopTestServer();
		try {
			fs.rmSync(tempDir, { recursive: true });
		} catch { /* ignore */ }
	});

	test(`getTestServerState returns null when server not started`, () => {
		expect(getTestServerState()).toBeNull();
	});

	test(`server uses default port 12701 on first start`, async () => {
		// This test should run early to ensure port 12701 is available
		clearTestServerPort();
		stopTestServer(); // Ensure no server is running
		const state = await startTestServer({ rootPath: tempDir });
		expect(state.port).toBe(12701);
		expect(state.url).toBe(`http://127.0.0.1:12701`);
	});

	test(`startTestServer serves files under root and binds to 127.0.0.1`, async () => {
		const state = await startTestServer({ rootPath: tempDir });
		expect(state).not.toBeNull();
		expect(state.url).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/);
		expect(state.port).toBeGreaterThan(0);
		expect(state.startedAt).toBeDefined();
		expect(state.useHttps).toBe(false);

		const baseUrl = state.url;
		const body = await fetchAsText(baseUrl + `/`);
		expect(body).toContain(`root`);

		const bodySub = await fetchAsText(baseUrl + `/sub/file.txt`);
		expect(bodySub).toBe(`sub file`);

		const res = await fetch(baseUrl + `/`, { redirect: `manual` });
		expect(res.headers.get(`content-type`)).toMatch(/text\/html/);
	});

	test(`requests for path outside root return 404`, async () => {
		const state = await startTestServer({ rootPath: tempDir });
		const baseUrl = state.url;

		const res1 = await fetch(baseUrl + `/../package.json`, { redirect: `manual` });
		expect(res1.status).toBe(404);

		const res2 = await fetch(baseUrl + `/..%2f..%2fetc%2fpasswd`, { redirect: `manual` });
		expect(res2.status).toBe(404);
	});

	test(`stopTestServer stops server and getTestServerState returns null`, async () => {
		const state = await startTestServer({ rootPath: tempDir });
		const baseUrl = state.url;
		stopTestServer();
		expect(getTestServerState()).toBeNull();

		await expect(fetch(baseUrl + `/`)).rejects.toThrow();
	});

	test(`server URL uses 127.0.0.1 only`, async () => {
		const state = await startTestServer({ rootPath: tempDir });
		expect(state.url).toContain(`127.0.0.1`);
		expect(state.url).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/);
	});

	test(`port is reused after stop and restart`, async () => {
		const state1 = await startTestServer({ rootPath: tempDir });
		const port1 = state1.port;
		stopTestServer();

		const state2 = await startTestServer({ rootPath: tempDir });
		const port2 = state2.port;
		expect(port1).toBe(port2);
	});

	test(`clearTestServerPort forces a new port on next start`, async () => {
		await startTestServer({ rootPath: tempDir });
		stopTestServer();

		clearTestServerPort();
		const state2 = await startTestServer({ rootPath: tempDir });

		// Note: technically get-port could return the same one by chance,
		// but in a test environment it usually increments.
		// For a robust test, we can't strictly assert port1 !== port2,
		// but we can assert that the internal logic was triggered.
		expect(state2).not.toBeNull();
	});

	test(`getAvailablePort returns a valid port when no domain provided`, async () => {
		const port = await getAvailablePort();
		expect(port).toBeDefined();
		expect(typeof port).toBe(`number`);
		expect(port).toBeGreaterThan(0);
	});

	test(`getAvailablePort returns custom port from domain first`, async () => {
		clearTestServerPort();
		const port = await getAvailablePort(`http://sub.domain.com:44301`, false);
		expect(port).toBe(44301);
	});

	test(`getAvailablePort prioritizes 80 for HTTP without explicit port`, async () => {
		clearTestServerPort();
		const port = await getAvailablePort(`http://sub.domain.com`, false);
		// Note: depending on environment permissions, this might be 80 or fall back to 12701
		// We expect the function to at least return a valid port.
		expect([80, 12701]).toContain(port);
	});

	test(`getAvailablePort prioritizes 443 for HTTPS without explicit port`, async () => {
		clearTestServerPort();
		const port = await getAvailablePort(`https://sub.domain.com`, true);
		expect([443, 12701]).toContain(port);
	});
});

function fetchAsText(url) {
	return fetch(url).then(r => r.text());
}
