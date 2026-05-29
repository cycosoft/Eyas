import { contextBridge, ipcRenderer } from "electron";
import type { ChannelName, DomainUrl, Username, PasswordPlain } from "@registry/primitives.js";
import type { DecryptedCredential } from "@registry/core.js";
import { injectWithAnonymousScope, extractFunctionBody, reportNetworkStatus, polyfillUploadProgress } from "./test-preload-polyfills.js";

export { injectWithAnonymousScope, extractFunctionBody, polyfillUploadProgress };

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

let cachedCredentials: DecryptedCredential[] | null = null;
let isFetchingCredentials = false;
let activeDropdown: HTMLDivElement | null = null;

async function getOriginCredentials(): Promise<DecryptedCredential[]> {
	if (cachedCredentials) { return cachedCredentials; }
	if (isFetchingCredentials) { return []; }

	isFetchingCredentials = true;
	try {
		const res = await ipcRenderer.invoke(`get-credentials`, { origin: window.location.origin });
		const list = res || [];
		cachedCredentials = list;
		return list;
	} catch (err) {
		console.error(`Failed to fetch credentials via IPC:`, err);
		return [];
	} finally {
		isFetchingCredentials = false;
	}
}

function fillForm(input: HTMLInputElement, cred: DecryptedCredential): void {
	const form = input.form;
	if (!form) { return; }

	const usernameInputs = form.querySelectorAll(`input[type="text"], input[type="email"], input:not([type])`);
	const passwordInputs = form.querySelectorAll(`input[type="password"]`);

	if (usernameInputs.length > 0) {
		const userInp = usernameInputs[0] as HTMLInputElement;
		userInp.value = cred.username;
		userInp.dispatchEvent(new Event(`input`, { bubbles: true }));
		userInp.dispatchEvent(new Event(`change`, { bubbles: true }));
	}
	if (passwordInputs.length > 0) {
		const passInp = passwordInputs[0] as HTMLInputElement;
		passInp.value = cred.passwordPlain;
		passInp.dispatchEvent(new Event(`input`, { bubbles: true }));
		passInp.dispatchEvent(new Event(`change`, { bubbles: true }));
	}
}

function removeDropdown(): void {
	if (activeDropdown) {
		activeDropdown.remove();
		activeDropdown = null;
	}
}

/**
 * Determines whether the autofill dropdown should be shown for a given input.
 * Returns true only if the input is part of a form that contains at least one password field.
 */
function shouldShowAutofill(input: HTMLInputElement): boolean {
    if (!input || input.tagName !== `INPUT`) {
        return false;
    }
    const form = input.form;
    if (!form) {
        return false;
    }
    const hasPassword = (form.querySelectorAll(`input[type="password"]`).length) > 0;
    return hasPassword;
}

function showAutocompleteDropdown(input: HTMLInputElement, credentialsList: DecryptedCredential[]): void {
	removeDropdown();

	const dropdown = document.createElement(`div`);
	dropdown.id = `eyas-autofill-dropdown`;
	dropdown.setAttribute(`style`, `
		position: absolute;
		background: rgba(255, 255, 255, 0.95);
		backdrop-filter: blur(10px);
		border: 1px solid rgba(0, 0, 0, 0.1);
		border-radius: 8px;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
		z-index: 2147483647;
		font-family: 'Inter', 'Segoe UI', sans-serif;
		font-size: 14px;
		width: ${input.offsetWidth}px;
		max-height: 200px;
		overflow-y: auto;
		color: #1c1b1f;
	`);

	credentialsList.forEach(cred => {
		const item = document.createElement(`div`);
		item.textContent = cred.username;
		item.setAttribute(`style`, `
			padding: 10px 14px;
			cursor: pointer;
			border-bottom: 1px solid rgba(0, 0, 0, 0.05);
			transition: background 0.15s ease;
		`);

		item.addEventListener(`mouseenter`, () => {
			item.style.backgroundColor = `rgba(0, 102, 204, 0.08)`;
		});
		item.addEventListener(`mouseleave`, () => {
			item.style.backgroundColor = `transparent`;
		});

		item.addEventListener(`mousedown`, e => {
			e.preventDefault();
			fillForm(input, cred);
			removeDropdown();
		});

		dropdown.appendChild(item);
	});

	const rect = input.getBoundingClientRect();
	dropdown.style.top = `${rect.bottom + window.scrollY}px`;
	dropdown.style.left = `${rect.left + window.scrollX}px`;

	document.body.appendChild(dropdown);
	activeDropdown = dropdown;


}

export function setupAutofill(): void {
	if (typeof document === `undefined`) { return; }

	document.addEventListener(`focusin`, async (event: Event) => {
        const input = event.target as HTMLInputElement;
        if (!shouldShowAutofill(input)) { return; }

        const type = input.type ? input.type.toLowerCase() : `text`;
        if (type !== `text` && type !== `email` && type !== `password`) { return; }

        const creds = await getOriginCredentials();
        if (!creds || creds.length === 0) { return; }

        if (creds.length >= 1) {
            showAutocompleteDropdown(input, creds);
        }
	}, true);

	document.addEventListener(`click`, async (e: Event) => {
        // If a dropdown is open and the click is outside of it (and not the focused element), close it.
        if (activeDropdown && typeof (activeDropdown as any).contains === 'function' && !activeDropdown.contains(e.target as Node) && e.target !== document.activeElement) {
            removeDropdown();
            return;
        }

        const input = e.target as HTMLInputElement;
        if (!shouldShowAutofill(input)) { return; }

        const type = input.type ? input.type.toLowerCase() : `text`;
        if (type !== `text` && type !== `email` && type !== `password`) { return; }

        // If dropdown already exists, remove it to refresh.
        if (activeDropdown) { removeDropdown(); }

        const creds = await getOriginCredentials();
        if (!creds || creds.length === 0) { return; }

        if (creds.length >= 1) {
            showAutocompleteDropdown(input, creds);
        }
    }, true);

	window.addEventListener(`scroll`, removeDropdown, true);
	window.addEventListener(`resize`, removeDropdown, true);
}