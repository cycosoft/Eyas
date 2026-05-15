import { describe, test, expect, vi, beforeEach } from 'vitest';
import type { BrowserWindow } from 'electron';
import type { ValidatedConfig } from '@registry/config.js';
import type { CoreContext } from '@registry/eyas-core.js';
import { Menu } from 'electron';
import { menuService } from '@core/menu.service.js';

import type { IsActive } from '@registry/primitives.js';

// Mock electron
vi.mock(`electron`, () => ({
	app: {
		quit: vi.fn()
	},
	Menu: {
		setApplicationMenu: vi.fn(),
		buildFromTemplate: vi.fn()
	},
	shell: {
		openPath: vi.fn()
	},
	clipboard: {
		writeText: vi.fn()
	}
}));

// Mock external scripts
vi.mock(`../../src/scripts/variable-utils.js`, () => ({
	isVariableLinkValid: vi.fn(url => url.includes(`{myvar}`))
}));

vi.mock(`../../src/scripts/parse-url.js`, () => ({
	parseURL: vi.fn(url => {
		if (url.startsWith(`http`)) return new URL(url);
		return null;
	})
}));

const mockPlatform = {
	isMac: false
};
vi.mock(`../../src/scripts/platform-utils.js`, () => ({
	get isMac(): IsActive { return mockPlatform.isMac; }
}));

describe(`MenuService Helpers`, () => {
	beforeEach((): void => {
		vi.clearAllMocks();
		mockPlatform.isMac = false;
	});

	describe(`getSerializableLinks`, () => {
		const config = {
			links: [
				{ label: `Google`, url: `https://google.com`, external: true },
				{ label: `Local`, url: `http://local.test`, external: false },
				{ label: `Variable`, url: `https://example.com/{myvar}`, external: false },
				{ label: `Host Variable`, url: `https://{myvar}example.com`, external: false },
				{ label: `Invalid`, url: `bad-url`, external: false }
			]
		} as unknown as ValidatedConfig;

		test(`should return empty array if no config`, () => {
			expect(menuService.getSerializableLinks(null)).toEqual([]);
		});

		test(`should return NavItem array with correct titles`, () => {
			const items = menuService.getSerializableLinks(config);
			expect(items).toHaveLength(5);
			expect(items[0].title).toBe(`🌐 Google`);
			expect(items[1].title).toBe(`Local`);
			expect(items[2].title).toBe(`Variable`);
			expect(items[3].title).toBe(`Host Variable`);
			expect(items[4].title).toBe(`Invalid (invalid entry: "bad-url")`);
		});

		test(`should encode url and external state in value`, () => {
			const items = menuService.getSerializableLinks(config);
			expect(items[0].value).toBe(`launch-link:{"url":"https://google.com/","openInBrowser":true}`);
			expect(items[1].value).toBe(`launch-link:{"url":"http://local.test/","openInBrowser":false}`);
		});

		test(`should identify variable links`, () => {
			const items = menuService.getSerializableLinks(config);
			expect(items[2].value).toBe(`launch-link-var:https://example.com/{myvar}`);
			expect(items[3].value).toBe(`launch-link-var:https://{myvar}example.com`);
		});

		test(`should disable invalid links`, () => {
			const items = menuService.getSerializableLinks(config);
			expect(items[4].actionable).toBe(false);
		});
	});

	describe(`refresh`, () => {
		const mockWindow = {
			isDestroyed: vi.fn().mockReturnValue(false)
		} as unknown as BrowserWindow;

		const mockCtx = {
			$appWindow: mockWindow
		} as unknown as CoreContext;

		test(`refresh should call Menu.setApplicationMenu with null on non-macOS`, async () => {
			mockPlatform.isMac = false;
			await menuService.refresh(mockCtx);

			expect(Menu.setApplicationMenu).toHaveBeenCalledWith(null);
		});

		test(`refresh should set custom menu on macOS`, async () => {
			mockPlatform.isMac = true;
			await menuService.refresh(mockCtx);

			const template = vi.mocked(Menu.buildFromTemplate).mock.calls[0][0];
			expect(template.length).toBe(2); // App menu and Edit menu

			// Verify App menu has Exit but NOT About
			const appMenu = template[0].submenu;
			expect(appMenu).toContainEqual(expect.objectContaining({ label: `Exit`, role: `quit` }));
			expect(appMenu).not.toContainEqual(expect.objectContaining({ role: `about` }));

			// Verify Edit menu exists for shortcuts
			expect(template[1].label).toBe(`Edit`);
			expect(template[1].submenu).toContainEqual(expect.objectContaining({ role: `copy` }));
			expect(template[1].submenu).toContainEqual(expect.objectContaining({ role: `paste` }));

			expect(Menu.setApplicationMenu).toHaveBeenCalled();
		});
	});
});
