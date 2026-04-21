import { describe, it, expect, vi, type Mock } from 'vitest';
import { registerHttpsProtocolHandler } from '../../src/eyas-core/protocol-handlers.js';
import type { CoreContext } from '../../src/types/eyas-core.js';

vi.mock(`../../src/scripts/parse-url.js`, () => ({
	parseURL: vi.fn(url => {
		try {
			return new URL(url);
		} catch {
			return null;
		}
	})
}));

describe(`protocol-handlers.ts fix verification`, () => {
	it(`should intercept multiple domains from config`, async () => {
		const ctx = {
			$config: {
				domains: [
					{ url: `https://dev.eyas.cycosoft.com` },
					{ url: `https://staging.eyas.cycosoft.com` }
				],
				source: `demo`
			},
			$testDomain: `https://dev.eyas.cycosoft.com`
		} as unknown as CoreContext;

		const ses = {
			protocol: {
				handle: vi.fn()
			},
			fetch: vi.fn()
		} as unknown as Electron.Session;

		registerHttpsProtocolHandler(ctx, ses);

		const handler = (ses.protocol.handle as Mock).mock.calls[0][1];

		// Test dev domain
		await handler({ url: `https://dev.eyas.cycosoft.com/path` });
		expect(ses.fetch).toHaveBeenCalledWith(`eyas://dev.eyas.cycosoft.com/path`, expect.any(Object));

		// Test staging domain (even if NOT active testDomain)
		await handler({ url: `https://staging.eyas.cycosoft.com/other` });
		expect(ses.fetch).toHaveBeenCalledWith(`eyas://staging.eyas.cycosoft.com/other`, expect.any(Object));

		// Test non-managed domain
		await handler({ url: `https://google.com` });
		expect(ses.fetch).toHaveBeenLastCalledWith(expect.objectContaining({ url: `https://google.com` }), expect.any(Object));
	});

	it(`should use updated values from context via getters`, async () => {
		let currentDomain = `https://first.com`;
		const ctx = {
			$config: {
				domains: [{ url: `https://first.com` }, { url: `https://second.com` }],
				source: `demo`
			},
			get $testDomain() { return currentDomain; }
		} as unknown as CoreContext;

		const ses = {
			protocol: {
				handle: vi.fn()
			},
			fetch: vi.fn()
		} as unknown as Electron.Session;

		registerHttpsProtocolHandler(ctx, ses);
		const handler = (ses.protocol.handle as Mock).mock.calls[0][1];

		// Initial check
		await handler({ url: `https://first.com` });
		expect(ses.fetch).toHaveBeenCalledWith(`eyas://first.com`, expect.any(Object));

		// Update domain and check again
		currentDomain = `https://second.com`;
		await handler({ url: `https://second.com` });
		expect(ses.fetch).toHaveBeenCalledWith(`eyas://second.com`, expect.any(Object));
	});
});
