import { test, expect } from '@playwright/test';
import {
	launchEyas,
	exitEyas,
	getUiView,
	getTestView,
	ensureEnvironmentSelected,
	emitIpcMessage
} from './eyas-utils.mjs';

// Reproduces a reported bug: the detail view's step timeline (and the panel generally) never
// actually scrolled internally in real Chromium, even though jsdom-based unit tests couldn't
// catch it — jsdom doesn't implement layout, so it can't see that Vuetify's <v-timeline-item>
// renders with `display: contents` (no box), or that the panel card was sized with `height: auto`
// instead of filling its fixed-height container, both of which defeat scrollIntoView/overflow.
test.describe(`Recording panel detail view — real scroll`, () => {
	let electronApp;

	test.beforeEach(async () => {
		electronApp = await launchEyas();
	});

	test.afterEach(async () => {
		await exitEyas(electronApp);
	});

	test(`detail view's step timeline is a real overflow container once it has enough steps`, async () => {
		test.setTimeout(30000);
		const uiPage = await getUiView(electronApp);
		await ensureEnvironmentSelected(uiPage);

		const homePage = await getTestView(electronApp, /eyas\.cycosoft\.com\/?$/);
		await homePage.locator(`.nav-links a`, { hasText: `Recording` }).click();

		const testPage = await getTestView(electronApp, /demo\/recording/);
		expect(testPage).toBeTruthy();

		// enough clicks to force real overflow in the 380px-wide panel
		for (let i = 0; i < 20; i++) {
			await testPage.locator(`[data-testid="top-click"]`).click();
		}
		await testPage.waitForTimeout(2500);
		await uiPage.locator(`[data-qa="btn-recording-stop"]`).click();

		await uiPage.locator(`[data-qa="btn-recording-panel-toggle"]`).click();
		await uiPage.locator(`[data-qa="recording-panel-list"] li`).first().click();
		await expect(uiPage.locator(`[data-qa="recording-detail-steps"]`)).toBeVisible();

		const scrollArea = uiPage.locator(`.eyas-modal__body`);
		const scrollInfo = await scrollArea.evaluate(el => ({
			scrollHeight: el.scrollHeight,
			clientHeight: el.clientHeight,
			overflowY: window.getComputedStyle(el).overflowY
		}));

		expect(scrollInfo.scrollHeight).toBeGreaterThan(scrollInfo.clientHeight);
	});

	test(`follows the active step during playback, moving the panel's scroll position`, async () => {
		test.setTimeout(30000);
		const uiPage = await getUiView(electronApp);
		await ensureEnvironmentSelected(uiPage);

		const homePage = await getTestView(electronApp, /eyas\.cycosoft\.com\/?$/);
		await homePage.locator(`.nav-links a`, { hasText: `Recording` }).click();

		const testPage = await getTestView(electronApp, /demo\/recording/);
		expect(testPage).toBeTruthy();

		for (let i = 0; i < 20; i++) {
			await testPage.locator(`[data-testid="top-click"]`).click();
		}
		await testPage.waitForTimeout(2500);
		await uiPage.locator(`[data-qa="btn-recording-stop"]`).click();
		await expect(uiPage.locator(`[data-qa="btn-recording-replay"]`)).toBeVisible();

		// natural pacing gives the panel time to open and this test time to observe mid-run scroll
		// movement, rather than a default (no-delay) replay finishing before any of that happens
		await emitIpcMessage(electronApp, `save-setting`, { key: `recording.replaySpeed`, value: `natural`, projectId: null });

		// start playback from the header first, then open the panel to watch — the panel's scrim
		// stays up while idle (by design, see EyasModal.test.ts) and only drops once playback is
		// active, so the header's Replay button isn't reachable while the panel is already open
		await uiPage.locator(`[data-qa="btn-recording-replay"]`).click();

		// opening onto an already-running playback drills straight into that session's detail view
		// (see recording.ts's togglePanel), so there's no browser-list row to click through here
		await uiPage.locator(`[data-qa="btn-recording-panel-toggle"]`).click();
		await expect(uiPage.locator(`[data-qa="recording-detail-steps"]`)).toBeVisible();

		const scrollArea = uiPage.locator(`.eyas-modal__body`);
		const scrollTopBefore = await scrollArea.evaluate(el => el.scrollTop);

		// the active step should pull the panel's scroll position along as playback advances —
		// poll rather than a single read, since which step is "active" moves fast at default speed
		await expect.poll(async () => scrollArea.evaluate(el => el.scrollTop), { timeout: 15000 }).toBeGreaterThan(scrollTopBefore);
	});

	test(`header controls stay clickable behind the background logo overlay once a panel is open during playback`, async () => {
		test.setTimeout(30000);
		const uiPage = await getUiView(electronApp);
		await ensureEnvironmentSelected(uiPage);

		const homePage = await getTestView(electronApp, /eyas\.cycosoft\.com\/?$/);
		await homePage.locator(`.nav-links a`, { hasText: `Recording` }).click();

		const testPage = await getTestView(electronApp, /demo\/recording/);
		expect(testPage).toBeTruthy();

		for (let i = 0; i < 20; i++) {
			await testPage.locator(`[data-testid="top-click"]`).click();
		}
		await testPage.waitForTimeout(2500);
		await uiPage.locator(`[data-qa="btn-recording-stop"]`).click();
		await expect(uiPage.locator(`[data-qa="btn-recording-replay"]`)).toBeVisible();

		await emitIpcMessage(electronApp, `save-setting`, { key: `recording.replaySpeed`, value: `natural`, projectId: null });
		await uiPage.locator(`[data-qa="btn-recording-replay"]`).click();

		// the panel's own scrim is suppressed during playback, but the separate full-screen
		// background-logo overlay (ModalBackground.vue) used to have no pointer-events guard on its
		// empty area, silently eating clicks on header controls sitting beneath it, like this one.
		// Opening onto an already-running playback drills straight into that session's detail view
		// (see recording.ts's togglePanel), so there's no browser list here to assert on.
		await uiPage.locator(`[data-qa="btn-recording-panel-toggle"]`).click();
		await expect(uiPage.locator(`[data-qa="recording-detail-steps"]`)).toBeVisible();

		await uiPage.locator(`[data-qa="btn-recording-playback-stop"]`).click({ timeout: 5000 });
		await expect(uiPage.locator(`[data-qa="btn-recording-playback-stop"]`)).not.toBeVisible();
	});
});
