/** Context required to handle protocol (deep-link) URLs */
export type DeepLinkContext = {
	getAppWindow: () => unknown;
	setConfigToLoad: (payload: { method: string; path: string }) => void;
	loadConfig: (method: string, path: string) => Promise<unknown>;
	startAFreshTest: () => void | Promise<void>;
	LOAD_TYPES: {
		WEB: string;
		[key: string]: string;
	};
}
