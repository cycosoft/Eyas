// imports
const { contextBridge, ipcRenderer } = require(`electron`);

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
// via ( https://stackoverflow.com/a/59814127 )
contextBridge.exposeInMainWorld(`eventBridge`, {
	send: (channel, data) => {
		// whitelist channels
		const validChannels = [
			`network-status`
		];

		if (validChannels.includes(channel)) {
			ipcRenderer.send(channel, data);
		}
	},

	receive: (channel, func) => {
		const validChannels = [];

		if (validChannels.includes(channel)) {
			// Deliberately strip event as it includes `sender`
			ipcRenderer.on(channel, (event, ...args) => func(...args));
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
function injectWithAnonymousScope(fn) {
	// newline required for the function to be properly parsed
	return `(() => {
		${extractFunctionBody(fn)}
	})();`
}

// Extract the body of the function
function extractFunctionBody(fn) {
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
function reportNetworkStatus() {
	window.addEventListener(`online`, () => window.eventBridge?.send(`network-status`, true));
	window.addEventListener(`offline`, () => window.eventBridge?.send(`network-status`, false));
}

// polyfill for upload progress within Eyas
function polyfillUploadProgress() {
	const origOpen = XMLHttpRequest.prototype.send;
	let uploadSpeed = 150 * 1024; // default to 150KB/s

	// Can be: Document, Blob, ArrayBuffer, TypedArray, DataView, FormData, URLSearchParams, string, object, null.
	XMLHttpRequest.prototype.send = function(data) {
		// setup
		const intervalTiming = 100;
		let totalUpdates = 0;
		let intervalId = null;
		let fileBytes = 1; // default to 1 byte to avoid division by 0

		// track the time this request started
		const requestStart = performance.now();

		// log the data type
		console.log({ data });

		// update the fileBytes for ArrayBuffer, TypedArray, DataView
		if (data instanceof ArrayBuffer || data instanceof DataView || data instanceof TypedArray) {
			fileBytes = data.byteLength;
		}

		// update the fileBytes for Blob
		if (data instanceof Blob) {
			fileBytes = data.size;
		}

		// update the fileBytes for FormData
		if (data instanceof FormData) {
			for (let pair of data.entries()) {
				if (pair[1] instanceof File) {
					fileBytes += pair[1].size;
				}
			}
		}

		// update the fileBytes for string
		if (typeof data === `string`) {
			fileBytes = data.length;
		}

		console.log({ fileBytes });


		// when the request has finished loading
		this.addEventListener(`loadend`, function() {
			// calculate the actual upload speed
			const timeTaken = performance.now() - requestStart;
			uploadSpeed = fileBytes * (1000 / timeTaken);
			clearInterval(intervalId);

			// dispatch a final progress event with the total bytes
			this.upload.dispatchEvent(new ProgressEvent(`progress`,
				{ lengthComputable: true, loaded: fileBytes, total: fileBytes }
			));
		});

		// dispatch an initial progress event with 0 loaded bytes
		this.upload.dispatchEvent(new ProgressEvent(`progress`,
			{ lengthComputable: true, loaded: 0, total: fileBytes }
		));

		const updateProgress = () => {
			totalUpdates++;
			let loaded = totalUpdates * uploadSpeed * (intervalTiming / 1000);

			// quality check
			if (loaded > fileBytes) { loaded = fileBytes; }

			// alert the progress event
			this.upload.dispatchEvent(new ProgressEvent(`progress`,
				{ lengthComputable: true, loaded, total: fileBytes }
			));
		};

		// update the new progress event now and then every following interval
		updateProgress();
		intervalId = setInterval(updateProgress, intervalTiming);

		origOpen.apply(this, arguments);
	};
}