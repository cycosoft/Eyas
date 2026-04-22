import type { MessageBoxOptions } from 'electron';

/**
 * Returns options for showing the "No update available" dialog.
 * Used when update check finds no update or when the check fails (e.g. 404).
 * @returns {MessageBoxOptions} Options for Electron dialog.showMessageBox
 */
export function getNoUpdateAvailableDialogOptions(): MessageBoxOptions {
	return {
		type: `info`,
		buttons: [`OK`],
		title: `Update`,
		message: `No update available.`
	};
}
