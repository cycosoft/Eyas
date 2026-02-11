import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { startExpose, stopExpose, getExposeState } from '../../../src/eyas-core/expose/expose-server.js';

describe(`expose-server`, () => {
	let tempDir;

	beforeEach(async () => {
		tempDir = fs.mkdtempSync(path.join(os.tmpdir(), `eyas-expose-`));
		fs.writeFileSync(path.join(tempDir, `index.html`), `<html>root</html>`);
		fs.mkdirSync(path.join(tempDir, `sub`), { recursive: true });
		fs.writeFileSync(path.join(tempDir, `sub`, `file.txt`), `sub file`);
	});

	afterEach(() => {
		stopExpose();
		try {
			fs.rmSync(tempDir, { recursive: true });
		} catch (_) {}
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
});

function fetchAsText(url) {
	return fetch(url).then(r => r.text());
}
