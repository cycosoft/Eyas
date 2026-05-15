import { test, expect } from '@playwright/test';
import { launchEyas, exitEyas, getUiView, openChangelogModal, ensureEnvironmentSelected } from './eyas-utils.mjs';

test(`WhatsNew modal should be scrollable`, async () => {
	const electronApp = await launchEyas();
	const uiPage = await getUiView(electronApp);

	try {
		// Ensure environment is selected (clears initial modal)
		await ensureEnvironmentSelected(uiPage);

		// Open the Changelog modal via the UI
		await openChangelogModal(uiPage);

		// Wait for the modal to appear
		const modalContent = uiPage.locator(`[data-qa="whats-new-modal"]`);
		await expect(modalContent).toBeVisible({ timeout: 10000 });

		// Verify title is "Changelog"
		const title = modalContent.locator(`.v-card-title`);
		await expect(title).toHaveText(/Changelog/i);

		// Give it a moment to expand/render
		await new Promise(resolve => setTimeout(resolve, 1000));

		// Find the scrollable container (v-card-text)
		const scrollArea = modalContent.locator(`.v-card-text`);
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
