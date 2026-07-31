import type { CoreContext } from '@registry/eyas-core.js';

/** Keeps popups spawned from the Eyas UI shell's own title in sync with the app title. */
export function registerAppShellPopupTitleSync(ctx: CoreContext, appWindowWebContents: Electron.WebContents): void {
	appWindowWebContents.on(`did-create-window`, win => {
		win.on(`page-title-updated`, (evt, title) => {
			if (win.isDestroyed()) { return; }
			evt.preventDefault();
			win.setTitle(ctx.getAppTitle(title));
		});

		win.webContents.on(`did-finish-load`, () => {
			if (win.isDestroyed() || win.webContents.isDestroyed()) { return; }
			win.setTitle(ctx.getAppTitle(win.webContents.getTitle()));
		});
	});
}
