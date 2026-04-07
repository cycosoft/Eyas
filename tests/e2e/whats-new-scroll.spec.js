const { test, expect } = require(`@playwright/test`);
const { launchEyas, exitEyas, getUiView, clickSubMenuItem, getMenuStructure } = require(`./eyas-utils`);

test(`WhatsNew modal should be scrollable`, async () => {
	const electronApp = await launchEyas();
	const uiPage = await getUiView(electronApp);

	try {
		// Find the app menu (first item usually contains "What's New")
		const menuStructure = await getMenuStructure(electronApp);
		const appMenu = menuStructure.find(m => m.submenu && m.submenu.some(si => si.label.includes(`What's New`)));

		if (!appMenu) {
			throw new Error(`Could not find "What's New" in the application menu.`);
		}

		// Click "What's New"
		await clickSubMenuItem(electronApp, appMenu.label, `What's New`);

		// Wait for the modal to appear
		const modalContent = uiPage.locator(`[data-qa="whats-new-modal"]`);
		await expect(modalContent).toBeVisible({ timeout: 10000 });

		// Give it a moment to expand/render
		await new Promise(resolve => setTimeout(resolve, 1000));

		// Find the scrollable container (v-card-text)
		// I added .overflow-y-auto to it in the previous step
		const scrollArea = uiPage.locator(`.v-card-text.overflow-y-auto`);
		await expect(scrollArea).toBeVisible();

		// Check scroll properties
		const scrollInfo = await scrollArea.evaluate(el => {
			return {
				scrollHeight: el.scrollHeight,
				clientHeight: el.clientHeight,
				offsetHeight: el.offsetHeight,
				overflowY: window.getComputedStyle(el).overflowY,
				display: window.getComputedStyle(el).display,
				height: window.getComputedStyle(el).height,
				parentHeight: window.getComputedStyle(el.parentElement).height,
				grandParentHeight: window.getComputedStyle(el.parentElement.parentElement).height
			};
		});


		// If it's not scrolling, scrollHeight will be <= clientHeight
		// We expect it to be scrollable because the changelog is quite long
		expect(scrollInfo.scrollHeight).toBeGreaterThan(scrollInfo.clientHeight);
	} finally {
		await exitEyas(electronApp);
	}
});
