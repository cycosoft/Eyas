import { computed } from 'vue';
import type { ChannelName, BrowserAction, IsActive, DomainUrl } from '@registry/primitives.js';
import { state, displayUrlInfo } from './AppHeader.logic.js';

/**
 * Checks if a browser control should be disabled based on the current stack state.
 * @param action The browser action to check.
 * @param canGoBack Whether the back stack is non-empty.
 * @param canGoForward Whether the forward stack is non-empty.
 * @returns True if the control should be disabled.
 */
export function isControlDisabled(action: BrowserAction, canGoBack: IsActive, canGoForward: IsActive): IsActive {
	if (action === `back`) { return !canGoBack; }
	if (action === `forward`) { return !canGoForward; }
	return false;
}

export const goBack = (): void => window.eyas?.send(`browser-back` as ChannelName);
export const goForward = (): void => window.eyas?.send(`browser-forward` as ChannelName);
export const reload = (): void => window.eyas?.send(`browser-reload` as ChannelName);
export const goHome = (): void => window.eyas?.send(`browser-home` as ChannelName);

/** Handles a click event on a browser control button. */
export function handleBrowserControlClick(action: BrowserAction): void {
	const actions: Record<BrowserAction, () => void> = { back: goBack, forward: goForward, reload, home: goHome };
	actions[action]?.();
}

/**
 * Computes whether the user is actively viewing test content vs an external website.
 */
export const isViewingTestContent = computed(() => {
	if (displayUrlInfo.value.isFallback) {
		return true;
	}
	if (!state.currentEnvironment) {
		return true;
	}

	try {
		// Helper to safely extract hostname from a url/domain string
		const getHost = (str: DomainUrl): DomainUrl => {
			const hasProtocol = str.startsWith(`http://`) || str.startsWith(`https://`) || str.startsWith(`eyas://`);
			const urlObj = new URL(hasProtocol ? str : `https://${str}`);
			return urlObj.hostname as DomainUrl;
		};

		const currentHost = getHost(state.currentUrl as DomainUrl);
		const envHost = getHost(state.currentEnvironment);

		return currentHost === envHost;
	} catch {
		return true;
	}
});

