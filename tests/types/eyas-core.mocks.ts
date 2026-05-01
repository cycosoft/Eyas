import type { Rectangle, ViewportSize } from '@registry/core.js';
import type { DomainUrl, ChannelName } from '@registry/primitives.js';

/** Mock of ContentView for testing */
type CoreMockContentView = {
	addChildView: (view: unknown) => void;
};

/**
 * Mock of a WebContentsView for testing.
 */
export type CoreMockLayer = {
	getBounds: () => Rectangle;
	setBackgroundColor: (color: string) => void;
	setBounds: (bounds: Rectangle) => void;
	webContents: CoreMockWebContents;
};

/** Mock of Session for testing */
type CoreMockSession = {
	webRequest: CoreMockWebRequest;
};

/** Mock of a WebContentsView used as the test content layer */
export type CoreMockTestLayer = {
	setBounds: (bounds: Rectangle) => void;
	webContents: CoreMockTestLayerWebContents;
};

/** Mock of session for test layer */
type CoreMockTestLayerSession = {
	getCacheSize: () => Promise<number>;
};

/** Mock of WebContents for the test layer (broader API surface) */
type CoreMockTestLayerWebContents = {
	getURL: () => string;
	getTitle: () => string;
	goBack: () => void;
	goForward: () => void;
	loadURL: (url: DomainUrl) => void;
	on: (event: string, cb: (...args: unknown[]) => void) => void;
	reloadIgnoringCache: () => void;
	session: CoreMockTestLayerSession;
	toggleDevTools: () => void;
};

/** Mock of WebContents for testing (used by $eyasLayer) */
type CoreMockWebContents = {
	focus: () => void;
	isFocused: () => boolean;
	loadURL: (url: DomainUrl) => void;
	on: (event: string, cb: (...args: unknown[]) => void) => void;
	send: (channel: ChannelName, ...args: unknown[]) => void;
};

/** Mock of WebRequest for testing */
type CoreMockWebRequest = {
	onBeforeRequest: (...args: unknown[]) => void;
};

/**
 * Mock of a BrowserWindow for testing.
 */
export type CoreMockWindow = {
	contentView: CoreMockContentView;
	getContentSize: () => ViewportSize;
	on: (event: string, cb: (...args: unknown[]) => void) => void;
	webContents: CoreMockWindowWebContents;
};

/** Mock of BrowserWindow WebContents for testing */
type CoreMockWindowWebContents = {
	on: (event: string, cb: (...args: unknown[]) => void) => void;
	session: CoreMockSession;
};
