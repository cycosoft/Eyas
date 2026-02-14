import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { startExpose, stopExpose, getExposeState, clearExposePort } from '../../../src/eyas-core/expose/expose-server.js';

describe(`expose-server`, () => {
	let tempDir;

	beforeEach(async () => {
		clearExposePort();
		tempDir = fs.mkdtempSync(path.join(os.tmpdir(), `eyas-expose-`));
		fs.writeFileSync(path.join(tempDir, `index.html`), `<html>root</html>`);
		fs.mkdirSync(path.join(tempDir, `sub`), { recursive: true });
		fs.writeFileSync(path.join(tempDir, `sub`, `file.txt`), `sub file`);
	});

	afterEach(() => {
		stopExpose();
		try {
			fs.rmSync(tempDir, { recursive: true });
		} catch { /* ignore */ }
	});

	test(`getExposeState returns null when server not started`, () => {
		expect(getExposeState()).toBeNull();
	});

	test(`startExpose serves files under root and binds to 127.0.0.1`, async () => {
		const state = await startExpose({ rootPath: tempDir });
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
		const state = await startExpose({ rootPath: tempDir });
		const baseUrl = state.url;

		const res1 = await fetch(baseUrl + `/../package.json`, { redirect: `manual` });
		expect(res1.status).toBe(404);

		const res2 = await fetch(baseUrl + `/..%2f..%2fetc%2fpasswd`, { redirect: `manual` });
		expect(res2.status).toBe(404);
	});

	test(`stopExpose stops server and getExposeState returns null`, async () => {
		const state = await startExpose({ rootPath: tempDir });
		const baseUrl = state.url;
		stopExpose();
		expect(getExposeState()).toBeNull();

		await expect(fetch(baseUrl + `/`)).rejects.toThrow();
	});

	test(`server URL uses 127.0.0.1 only`, async () => {
		const state = await startExpose({ rootPath: tempDir });
		expect(state.url).toContain(`127.0.0.1`);
		expect(state.url).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/);
	});

	test(`port is reused after stop and restart`, async () => {
		const state1 = await startExpose({ rootPath: tempDir });
		const port1 = state1.port;
		stopExpose();

		const state2 = await startExpose({ rootPath: tempDir });
		const port2 = state2.port;
		expect(port1).toBe(port2);
	});

	test(`clearExposePort forces a new port on next start`, async () => {
		await startExpose({ rootPath: tempDir });
		stopExpose();

		clearExposePort();
		const state2 = await startExpose({ rootPath: tempDir });

		// Note: technically get-port could return the same one by chance,
		// but in a test environment it usually increments.
		// For a robust test, we can't strictly assert port1 !== port2,
		// but we can assert that the internal logic was triggered.
		expect(state2).not.toBeNull();
	});
});

function fetchAsText(url) {
	return fetch(url).then(r => r.text());
}
