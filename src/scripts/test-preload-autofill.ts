import { ipcRenderer } from "electron";
import type { ShouldShow, IsActive, PasswordPlain } from "@registry/primitives.js";
import type { DecryptedCredential, CredentialBackup } from "@registry/core.js";
import type { AutofillTheme } from "@registry/settings.js";
import htmlTemplate from "./templates/autofill-dropdown.html?raw";
import cssStyles from "./templates/autofill-dropdown.css?raw";

let cachedCredentials: DecryptedCredential[] | null = null;
let isFetchingCredentials = false;
let activeDropdown: HTMLDivElement | null = null;
let originalValues: CredentialBackup | null = null;
let activeInput: HTMLInputElement | null = null;

export function __resetAutofillCache(): void {
	cachedCredentials = null;
	isFetchingCredentials = false;
	activeDropdown = null;
	originalValues = null;
	activeInput = null;
}

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
	if (originalValues && activeInput) {
		restoreCredential(activeInput);
	}
	originalValues = null;
	activeInput = null;
}

/**
 * Determines whether the autofill dropdown should be shown for a given input.
 * Returns true only if the input is part of a form that contains at least one password field.
 */
function shouldShowAutofill(input: HTMLInputElement): ShouldShow {
	if (!input || input.tagName !== `INPUT` || input.type === `password` || !input.form) {
		return false;
	}
	return (input.form.querySelectorAll(`input[type="password"]`).length) > 0;
}

function previewCredential(input: HTMLInputElement, cred: DecryptedCredential, dummyPassword?: PasswordPlain): void {
	const form = input.form;
	if (!form) { return; }

	const usernameInputs = form.querySelectorAll(`input[type="text"], input[type="email"], input:not([type])`);
	const passwordInputs = form.querySelectorAll(`input[type="password"]`);
	if (!originalValues) {
		const userVal = usernameInputs.length > 0 ? (usernameInputs[0] as HTMLInputElement).value : ``;
		const passVal = passwordInputs.length > 0 ? (passwordInputs[0] as HTMLInputElement).value : ``;
		originalValues = { username: userVal, password: passVal };
	}
	if (usernameInputs.length > 0) {
		(usernameInputs[0] as HTMLInputElement).value = cred.username;
	}
	if (passwordInputs.length > 0) {
		(passwordInputs[0] as HTMLInputElement).value = dummyPassword || `•••••••`;
	}
}

function restoreCredential(input: HTMLInputElement): void {
	const form = input.form;
	if (!form || !originalValues) { return; }

	const usernameInputs = form.querySelectorAll(`input[type="text"], input[type="email"], input:not([type])`);
	const passwordInputs = form.querySelectorAll(`input[type="password"]`);
	if (usernameInputs.length > 0) {
		(usernameInputs[0] as HTMLInputElement).value = originalValues.username;
	}
	if (passwordInputs.length > 0) {
		(passwordInputs[0] as HTMLInputElement).value = originalValues.password;
	}
	originalValues = null;
}

function getAutofillTheme(isDark: IsActive): AutofillTheme {
	return {
		bg: isDark ? `rgba(30, 30, 30, 0.85)` : `rgba(255, 255, 255, 0.85)`,
		border: isDark ? `1px solid rgba(255, 255, 255, 0.15)` : `1px solid rgba(0, 0, 0, 0.1)`,
		color: isDark ? `#e3e3e3` : `#1c1b1f`,
		shadow: isDark ? `0 4px 20px rgba(0, 0, 0, 0.4)` : `0 4px 20px rgba(0, 0, 0, 0.15)`,
		itemBorder: isDark ? `1px solid rgba(255, 255, 255, 0.08)` : `1px solid rgba(0, 0, 0, 0.05)`,
		itemHoverBg: isDark ? `rgba(255, 255, 255, 0.1)` : `rgba(0, 102, 204, 0.08)`,
		maskColor: isDark ? `#aaa` : `#888`
	};
}

function createDropdownItem(input: HTMLInputElement, cred: DecryptedCredential): HTMLDivElement {
	const item = document.createElement(`div`);
	item.className = `dropdown-item`;
	const dummyPassword = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
	const usernameSpan = document.createElement(`span`);
	usernameSpan.className = `username`;
	usernameSpan.textContent = cred.username;

	const maskSpan = document.createElement(`span`);
	maskSpan.className = `password-mask`;
	maskSpan.textContent = dummyPassword;

	item.appendChild(usernameSpan);
	item.appendChild(maskSpan);

	item.addEventListener(`mouseenter`, () => {
		previewCredential(input, cred, dummyPassword);
	});
	item.addEventListener(`mouseleave`, () => {
		restoreCredential(input);
	});

	item.addEventListener(`mousedown`, e => {
		e.preventDefault();
		originalValues = null;
		fillForm(input, cred);
		removeDropdown();
	});

	return item;
}

function createStyleElement(theme: AutofillTheme): HTMLStyleElement {
	const styleEl = document.createElement(`style`);
	styleEl.textContent = cssStyles
		.replace(`__BG__`, theme.bg)
		.replace(`__BORDER__`, theme.border)
		.replace(`__SHADOW__`, theme.shadow)
		.replace(`__COLOR__`, theme.color)
		.replace(`__ITEM_BORDER__`, theme.itemBorder)
		.replace(`__ITEM_HOVER_BG__`, theme.itemHoverBg)
		.replace(`__MASK_COLOR__`, theme.maskColor);
	return styleEl;
}

function showAutocompleteDropdown(input: HTMLInputElement, credentialsList: DecryptedCredential[], isDark: IsActive = false): void {
	removeDropdown();
	activeInput = input;

	const theme = getAutofillTheme(isDark);
	const dropdown = document.createElement(`div`);
	dropdown.id = `eyas-autofill-dropdown`;

	const controlContainer = input.closest ? input.closest(`.q-field, .q-field__control, .form-group, .input-group, .mat-form-field, .v-input, .v-field`) : null;
	const targetElement = controlContainer || input;
	const rect = targetElement.getBoundingClientRect();
	dropdown.setAttribute(`style`, `position:absolute !important;z-index:2147483647 !important;width:${rect.width}px !important;min-width:${rect.width}px !important;max-width:${rect.width}px !important;box-sizing:border-box !important;`);

	let container: ShadowRoot | HTMLDivElement = dropdown;
	if (dropdown.attachShadow) {
		container = dropdown.attachShadow({ mode: `open` }) as unknown as ShadowRoot;
	}

	container.appendChild(createStyleElement(theme));

	const tempDiv = document.createElement(`div`);
	tempDiv.innerHTML = htmlTemplate;
	const wrapper = (tempDiv.querySelector ? tempDiv.querySelector(`.eyas-autofill-wrapper`) : tempDiv) as HTMLDivElement;
	if (!wrapper) {
		throw new Error(`Failed to parse autofill dropdown HTML template`);
	}
	container.appendChild(wrapper);

	const listContainer = (wrapper.querySelector ? wrapper.querySelector(`.list-container`) : wrapper) as HTMLDivElement;
	if (!listContainer) {
		throw new Error(`Failed to find list-container in autofill HTML template`);
	}

	credentialsList.forEach(cred => {
		listContainer.appendChild(createDropdownItem(input, cred));
	});

	const logo = (wrapper.querySelector ? wrapper.querySelector(`.logo`) : null) as HTMLDivElement | null;

	dropdown.style.top = `${rect.bottom + window.scrollY}px`;
	dropdown.style.left = `${rect.left + window.scrollX}px`;
	document.body.appendChild(dropdown);
	activeDropdown = dropdown;

	const isOverflowed = listContainer.scrollHeight > listContainer.clientHeight;
	if (isOverflowed && logo) {
		const items = listContainer.querySelectorAll(`.dropdown-item`);
		items.forEach(item => {
			(item as HTMLDivElement).style.paddingRight = `40px`;
		});
		logo.style.right = `20px`;
	}
}

async function handleAutofillTrigger(input: HTMLInputElement): Promise<void> {
	if (!shouldShowAutofill(input)) { return; }

	const type = input.type ? input.type.toLowerCase() : `text`;
	if (type !== `text` && type !== `email` && type !== `password`) { return; }

	const creds = await getOriginCredentials();
	if (!creds || creds.length === 0) { return; }

	let isDark = false;
	try {
		isDark = await ipcRenderer.invoke(`is-dark-theme`);
	} catch (err) {
		console.error(`Failed to fetch theme via IPC:`, err);
	}

	showAutocompleteDropdown(input, creds, isDark);
}

function repositionDropdown(): void {
	if (!activeDropdown || !activeInput) { return; }
	const controlContainer = activeInput.closest ? activeInput.closest(`.q-field, .q-field__control, .form-group, .input-group, .mat-form-field, .v-input, .v-field`) : null;
	const targetElement = controlContainer || activeInput;
	const rect = targetElement.getBoundingClientRect();
	activeDropdown.style.top = `${rect.bottom + window.scrollY}px`;
	activeDropdown.style.left = `${rect.left + window.scrollX}px`;
	activeDropdown.style.width = `${rect.width}px`;
}

export function setupAutofill(): void {
	if (typeof document === `undefined`) { return; }

	ipcRenderer.on(`credentials-updated`, () => {
		cachedCredentials = null;
	});

	document.addEventListener(`focusin`, async (event: Event) => {
		const input = event.target as HTMLInputElement;
		await handleAutofillTrigger(input);
	}, true);

	document.addEventListener(`focusout`, (event: Event) => {
		if (event.target === activeInput) {
			removeDropdown();
		}
	}, true);

	document.addEventListener(`click`, async (e: Event) => {
		// If a dropdown is open and the click is outside of it (and not the focused element), close it.
		const path = e.composedPath ? e.composedPath() : [];
		const clickedInside = activeDropdown && (activeDropdown.contains(e.target as Node) || path.includes(activeDropdown));
		if (activeDropdown && !clickedInside && e.target !== document.activeElement) {
			removeDropdown();
			return;
		}

		const input = e.target as HTMLInputElement;
		if (activeDropdown) { removeDropdown(); }
		await handleAutofillTrigger(input);
	}, true);

	window.addEventListener(`scroll`, (event: Event) => {
		if (activeDropdown && activeDropdown.contains(event.target as Node)) {
			return;
		}
		repositionDropdown();
	}, true);
	window.addEventListener(`resize`, removeDropdown, true);
}
