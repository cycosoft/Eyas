import { ipcRenderer } from "electron";
import type { ShouldShow, IsActive } from "@registry/primitives.js";
import type { DecryptedCredential, CredentialBackup } from "@registry/core.js";
import type { AutofillTheme } from "@registry/settings.js";

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
	if (!input || input.tagName !== `INPUT`) {
		return false;
	}
	if (input.type === `password`) {
		return false;
	}
	const form = input.form;
	if (!form) {
		return false;
	}
	const hasPassword = (form.querySelectorAll(`input[type="password"]`).length) > 0;
	return hasPassword;
}

function previewCredential(input: HTMLInputElement, cred: DecryptedCredential): void {
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
		(passwordInputs[0] as HTMLInputElement).value = cred.passwordPlain;
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
		bg: isDark ? `rgba(30, 30, 30, 0.95)` : `rgba(255, 255, 255, 0.95)`,
		border: isDark ? `1px solid rgba(255, 255, 255, 0.15)` : `1px solid rgba(0, 0, 0, 0.1)`,
		color: isDark ? `#e3e3e3` : `#1c1b1f`,
		shadow: isDark ? `0 4px 20px rgba(0, 0, 0, 0.4)` : `0 4px 20px rgba(0, 0, 0, 0.15)`,
		itemBorder: isDark ? `1px solid rgba(255, 255, 255, 0.08)` : `1px solid rgba(0, 0, 0, 0.05)`,
		itemHoverBg: isDark ? `rgba(255, 255, 255, 0.1)` : `rgba(0, 102, 204, 0.08)`,
		maskColor: isDark ? `#aaa` : `#888`
	};
}

function createDropdownItem(input: HTMLInputElement, cred: DecryptedCredential, theme: AutofillTheme): HTMLDivElement {
	const item = document.createElement(`div`);
	item.setAttribute(`style`, `
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 10px 14px;
		cursor: pointer;
		border-bottom: ${theme.itemBorder};
		transition: background 0.15s ease;
	`);
	const masked = `•••••••`;
	item.innerHTML = `<span class="username">${cred.username}</span><span class="password-mask" style="color:${theme.maskColor};">${masked}</span>`;

	item.addEventListener(`mouseenter`, () => {
		item.style.backgroundColor = theme.itemHoverBg;
		previewCredential(input, cred);
	});
	item.addEventListener(`mouseleave`, () => {
		item.style.backgroundColor = `transparent`;
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

function showAutocompleteDropdown(input: HTMLInputElement, credentialsList: DecryptedCredential[], isDark: IsActive = false): void {
	removeDropdown();
	activeInput = input;

	const theme = getAutofillTheme(isDark);
	const dropdown = document.createElement(`div`);
	dropdown.id = `eyas-autofill-dropdown`;
	dropdown.setAttribute(`style`, `position:absolute;background:${theme.bg};backdrop-filter:blur(10px);border:${theme.border};border-radius:8px;box-shadow:${theme.shadow};z-index:2147483647;font-family:'Inter','Segoe UI',sans-serif;font-size:14px;width:${input.offsetWidth}px;color:${theme.color};overflow:hidden;`);

	const listContainer = document.createElement(`div`);
	listContainer.setAttribute(`style`, `max-height:200px;overflow-y:auto;`);

	credentialsList.forEach(cred => {
		listContainer.appendChild(createDropdownItem(input, cred, theme));
	});
	dropdown.appendChild(listContainer);

	const logo = document.createElement(`div`);
	logo.innerHTML = `<svg version="1.2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="16" height="16"><defs><linearGradient id="P" gradientUnits="userSpaceOnUse"/><linearGradient id="g1" x2="1" href="#P" gradientTransform="matrix(483.532,676.944,-720.097,514.355,577.489,77.339)"><stop stop-color="#9d0620" stop-opacity="1"/><stop offset="1" stop-color="#ffc610" stop-opacity="0"/></linearGradient><linearGradient id="g2" x2="1" href="#P" gradientTransform="matrix(761.045,1065.462,-792.317,565.941,83.687,-2.811)"><stop stop-color="#f90023"/><stop offset="1" stop-color="#ffc610"/></linearGradient></defs><style>tspan{white-space:pre}.a{fill:#d05454}.b{fill:#58a1d6}.c{fill:url(#g1)}.d{fill:url(#g2)}</style><path fill-rule="evenodd" class="a" d="m982 512.3c0 252.4-185.4 471.3-469.2 471.3-283.8 0-406.3-244.7-366.8-433.6 36.8-175.6 171.4-239.4 171.4-239.4-20.5 4.6-58.8-33.3-58.8-33.3 97 27.7 214.9 0 294.6 17.3 79.8 17.3 86.7 76.3 86.7 76.3 173.3 24.2 152.5 149 152.5 149-334.6-129.6-346.5 296.3-125.4 289.9 221.2-6.4 248.4-238.8 248.4-297.5 0-58.7-43.2-404.5-405.8-404.5-362.6 0-405.1 381.4-405.1 421.5 0 10.5 0.1 19.7 0.3 27.6 0.5 22.2-0.7 44.3-3.1 66.4-7 65.3 2.4 110.8 9.8 134.6 0.9 3-3.2 4.8-4.8 2.2-21.6-34.3-64.7-121.7-64.7-274.7 0-204.1 205.1-444.4 470.8-444.4 265.6 0 469.2 218.9 469.2 471.3zm-437.2-103.9c11.7 8 27.7 4.2 34.5-8.2l16.7-30.4c2.2-4.1-0.8-9.2-5.5-9.2h-104.2c-3.3 0-4.6 4.2-1.9 6.1z"/><path class="b" d="m982 512.3c0-252.4-203.6-471.3-469.2-471.3-265.7 0-470.8 240.3-470.8 444.4 0 153 43.1 240.4 64.7 274.7 1.6 2.6 5.7 0.8 4.8-2.2-7.4-23.8-16.8-69.3-9.8-134.6 2.4-22.1 3.6-44.2 3.1-66.4-0.2-7.9-0.3-17.1-0.3-27.6 0-40.1 42.5-421.5 405.1-421.5 362.6 0 405.8 345.8 405.8 404.5 0 33.5-8.9 123.7-57.8 196.1l31.7 91.7c59.6-80.7 92.7-181.2 92.7-287.8z"/><path class="b" d="m889.3 800.1l-31.7-91.7c-36.7 54.3-95.8 98.6-190.6 101.4-221.1 6.4-209.2-419.5 125.4-289.9 0 0-283.1-133.3-397.9 93.7-114.8 227 118.3 370 118.3 370 164 0 295-73.2 376.5-183.5z"/><path class="c" d="m889.3 800.1l-31.7-91.7c-36.7 54.3-95.8 98.6-190.6 101.4-221.1 6.4-209.2-419.5 125.4-289.9 0 0-283.1-133.3-397.9 93.7-114.8 227 118.3 370 118.3 370 164 0 295-73.2 376.5-183.5z"/><path class="d" d="m309.8 310.6q-5.6-1.6-10.5-3.4c3.6 1.6 7.2 2.8 10.5 3.4z"/></svg>`;
	logo.setAttribute(`style`, `position:absolute;bottom:4px;right:4px;width:16px;height:16px;opacity:0.4;pointer-events:none;display:flex;align-items:center;justify-content:center;`);
	dropdown.appendChild(logo);

	const rect = input.getBoundingClientRect();
	dropdown.style.top = `${rect.bottom + window.scrollY}px`;
	dropdown.style.left = `${rect.left + window.scrollX}px`;
	document.body.appendChild(dropdown);
	activeDropdown = dropdown;
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

export function setupAutofill(): void {
	if (typeof document === `undefined`) { return; }

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
		if (activeDropdown && !activeDropdown.contains(e.target as Node) && e.target !== document.activeElement) {
			removeDropdown();
			return;
		}

		const input = e.target as HTMLInputElement;
		if (activeDropdown) { removeDropdown(); }
		await handleAutofillTrigger(input);
	}, true);

	window.addEventListener(`scroll`, removeDropdown, true);
	window.addEventListener(`resize`, removeDropdown, true);
}
