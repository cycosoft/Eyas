import { describe, test, expect } from 'vitest';
import { getNoUpdateAvailableDialogOptions } from '../../src/eyas-core/update-dialog.js';

describe(`getNoUpdateAvailableDialogOptions`, () => {
	test(`returns options for Electron dialog.showMessageBox`, () => {
		const options = getNoUpdateAvailableDialogOptions();
		expect(options).toEqual({
			type: `info`,
			buttons: [`OK`],
			title: `Update`,
			message: `No update available.`
		});
	});

	test(`returned options have stable shape for both no-update and error paths`, () => {
		const a = getNoUpdateAvailableDialogOptions();
		const b = getNoUpdateAvailableDialogOptions();
		expect(a).toEqual(b);
		expect(a).not.toBe(b);
	});
});
