import { browser, expect } from '@wdio/globals';

describe(`Electron Container Functionality`, () => {
	it(`should close when clicking the window x button`, async () => {
		// simulate clicking the window x button
		// await browser.closeWindow();

		// close dialog should exist
		// await expect($(`[data-qa="environment-modal"]`)).toExist();
	});
});

