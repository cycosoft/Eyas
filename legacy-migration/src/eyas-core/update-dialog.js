'use strict';

/**
 * Returns options for showing the "No update available" dialog.
 * Used when update check finds no update or when the check fails (e.g. 404).
 * @returns {object} Options for Electron dialog.showMessageBox
 */
function getNoUpdateAvailableDialogOptions() {
	return {
		type: `info`,
		buttons: [`OK`],
		title: `Update`,
		message: `No update available.`
	};
}

module.exports = { getNoUpdateAvailableDialogOptions };
