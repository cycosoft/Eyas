import { contextBridge, ipcRenderer } from "electron";
import type { ChannelName, DomainUrl, Username, PasswordPlain } from "@registry/primitives.js";
import { injectWithAnonymousScope, extractFunctionBody, reportNetworkStatus, polyfillUploadProgress } from "./test-preload-polyfills.js";
import { setupAutofill, __resetAutofillCache } from "./test-preload-autofill.js";

export { injectWithAnonymousScope, extractFunctionBody, polyfillUploadProgress, setupAutofill, __resetAutofillCache };

// Define the shape of the 'eyas' object exposed to the renderer
type RequestBridge = {
	send: (channel: ChannelName, data?: unknown) => void;
	receive: (channel: ChannelName, func: (...args: unknown[]) => void) => void;
}

declare global {
	// Global augmentation of the Window interface requires the 'interface' keyword to merge with the existing Window definition.
	// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
	interface Window {
		eyas: RequestBridge;
	}
}

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
// via ( https://stackoverflow.com/a/59814127 )
contextBridge.exposeInMainWorld(`eyas`, {
	send: (channel: ChannelName, data?: unknown): void => {
		// test layer is heavily restricted
		const validChannels: ChannelName[] = [
			`network-status`
		];

		if (validChannels.includes(channel)) {
			ipcRenderer.send(channel, data);
		}
	},

	receive: (channel: ChannelName, func: (...args: unknown[]) => void): void => {
		// test layer cannot currently receive any events
		const validChannels: ChannelName[] = [];

		if (validChannels.includes(channel)) {
			// Deliberately strip event as it includes `sender`
			ipcRenderer.on(channel, (_event: unknown, ...args: unknown[]): void => { func(...args); });
		}
	}
});

// before the test document can be loaded, inject polyfills and listeners
process.once(`document-start`, () => {
	const script = document.createElement(`script`);

	script.textContent = `
		/* Hello Eyas user! This code is automatically injected to facilitate certain functionality of the browser. */
		${injectWithAnonymousScope(reportNetworkStatus)}
		${injectWithAnonymousScope(polyfillUploadProgress)}
	`;

	document.documentElement.appendChild(script);
});

// form submit listener setup to capture logins securely in the isolated context
export function setupFormSubmitListener(): void {
	window.addEventListener(`submit`, (event: Event) => {
		const form = event.target as HTMLFormElement;
		if (!form) { return; }

		const passwordInputs = form.querySelectorAll(`input[type="password"]`);
		if (passwordInputs.length === 0) { return; }

		// Locate username field
		let username: Username = ``;
		const textInputs = form.querySelectorAll(`input[type="text"], input[type="email"], input:not([type])`);
		if (textInputs.length > 0) {
			username = (textInputs[0] as HTMLInputElement).value || ``;
		}

		for (const pwdInput of passwordInputs) {
			const passwordPlain: PasswordPlain = (pwdInput as HTMLInputElement).value;
			if (passwordPlain) {
				ipcRenderer.send(`save-login-attempt` as ChannelName, {
					origin: window.location.origin as DomainUrl,
					username,
					passwordPlain
				});
			}
		}
	}, true);
}

// Automatically bind listener on load if window is defined
if (typeof window !== `undefined`) {
	setupFormSubmitListener();
	setupAutofill();
}