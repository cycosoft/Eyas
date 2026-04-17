import { contextBridge, ipcRenderer } from "electron";

// Define the shape of the 'eyas' object exposed to the renderer
interface RequestBridge {
	send: (channel: string, data?: unknown) => void;
	receive: (channel: string, func: (...args: unknown[]) => void) => void;
}

declare global {
	interface Window {
		eyas?: RequestBridge;
	}
}

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
// via ( https://stackoverflow.com/a/59814127 )
contextBridge.exposeInMainWorld(`eyas`, {
	send: (channel: string, data?: unknown) => {
		// whitelist channels
		const validChannels = [
			`network-status`
		];

		if (validChannels.includes(channel)) {
			ipcRenderer.send(channel, data);
		}
	},

	receive: (channel: string, func: (...args: unknown[]) => void) => {
		const validChannels: string[] = [];

		if (validChannels.includes(channel)) {
			// Deliberately strip event as it includes `sender`
			ipcRenderer.on(channel, (_event, ...args: unknown[]) => { func(...args); });
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

// grab the given function as a string, wrap it in an anonymous function, and return it
export function injectWithAnonymousScope(fn: (...args: unknown[]) => unknown): string {
	// newline required for the function to be properly parsed
	return `(() => {
		${extractFunctionBody(fn)}
	})();`;
}

// Extract the body of the function
export function extractFunctionBody(fn: (...args: unknown[]) => unknown): string {
	// convert the given function to a string
	const content = fn.toString();

	// strip the function definition
	return content
		.toString()
		.substring(
			content.indexOf(`{`) + 1,
			content.lastIndexOf(`}`)
		)
		.trim();
}

// allow network detection status within Eyas
export function reportNetworkStatus(): void {
	window.addEventListener(`online`, () => window.eyas?.send(`network-status`, true));
	window.addEventListener(`offline`, () => window.eyas?.send(`network-status`, false));
}

// polyfill for upload progress within Eyas
export function polyfillUploadProgress(): void {
	const origOpen = XMLHttpRequest.prototype.send;
	const minUploadSpeed = 50 * 1024;
	let uploadSpeed = 150 * 1024; // default to 150KB/s

	// Can be: Document, Blob, ArrayBuffer, Int8Array, DataView, FormData, URLSearchParams, string, object, null.
	XMLHttpRequest.prototype.send = function (this: XMLHttpRequest, data?: Document | XMLHttpRequestBodyInit | null): void {
		// setup
		const intervalTiming = 100;
		let totalUpdates = 0;
		let intervalId: ReturnType<typeof setInterval> | null = null;
		let fileBytes = 1; // default to 1 byte to avoid division by 0

		// track the time this request started
		const requestStart = performance.now();

		if (data instanceof ArrayBuffer || data instanceof DataView || (typeof Int8Array !== `undefined` && data instanceof Int8Array)) {
			fileBytes = data.byteLength;
		} else if (data instanceof Blob) {
			fileBytes = data.size;
		} else if (data instanceof FormData) {
			for (const [, v] of data.entries()) {
				if (v instanceof File) { fileBytes += v.size; }
			}
		} else if (typeof data === `string`) {
			fileBytes = data.length;
		}

		// when the request has finished loading
		this.addEventListener(`loadend`, () => {
			// calculate the actual upload speed
			const timeTaken = performance.now() - requestStart;
			const calculatedSpeed = fileBytes * (1000 / timeTaken);
			uploadSpeed = calculatedSpeed > minUploadSpeed ? calculatedSpeed : uploadSpeed;

			if (intervalId !== null) {
				clearInterval(intervalId);
			}

			// dispatch a final progress event with the total bytes
			emitProgress(fileBytes, fileBytes);
		});

		// the event to dispatch the progress event
		const emitProgress = (loaded: number, total: number): void => {
			this.upload.dispatchEvent(new ProgressEvent(`progress`,
				{ lengthComputable: true, loaded, total }
			));
		};

		// dispatch an initial progress event with 0 loaded bytes
		emitProgress(0, fileBytes);

		const updateProgress = (): void => {
			totalUpdates++;
			const loaded = Math.min(totalUpdates * uploadSpeed * (intervalTiming / 1000), fileBytes);
			emitProgress(loaded, fileBytes);
		};

		// update the new progress event now and then every following interval
		updateProgress();
		intervalId = setInterval(updateProgress, intervalTiming);

		// eslint-disable-next-line prefer-rest-params
		origOpen.apply(this, arguments as unknown as [data?: Document | XMLHttpRequestBodyInit | null | undefined]);
	};
}