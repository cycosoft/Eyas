import type { LabelString, TimerId, Count, ChannelName, IsActive } from "@registry/primitives.js";

// grab the given function as a string, wrap it in an anonymous function, and return it
export function injectWithAnonymousScope(fn: (...args: unknown[]) => unknown): LabelString {
	// newline required for the function to be properly parsed
	return `(() => {
		${extractFunctionBody(fn)}
	})();`;
}

// Extract the body of the function
export function extractFunctionBody(fn: (...args: unknown[]) => unknown): LabelString {
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
	window.addEventListener(`online`, () => window.eyas?.send(`network-status` as ChannelName, true as IsActive));
	window.addEventListener(`offline`, () => window.eyas?.send(`network-status` as ChannelName, false as IsActive));
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
		let intervalId: TimerId | null = null;
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
		const emitProgress = (loaded: Count, total: Count): void => {
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
