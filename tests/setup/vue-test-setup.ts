import type { App } from 'vue';
import { config } from '@vue/test-utils';
import { createVuetify } from 'vuetify';
import { createPinia } from 'pinia';
import { vi } from 'vitest';

// Configure Vuetify
const vuetifyPlugin = {
	install(app: App): void {
		app.use(createVuetify());
	}
};

// Configure Pinia
const piniaPlugin = {
	install(app: App): void {
		app.use(createPinia());
	}
};

config.global.plugins = [vuetifyPlugin, piniaPlugin];

// Suppress JSDOM CSS parsing errors for Vuetify's modern CSS
const originalConsoleError = console.error;
console.error = (...args: unknown[]): void => {
	if (typeof args[0] === `string` && args[0].includes(`Could not parse CSS stylesheet`)) {
		return; // Ignore JSDOM CSS parsing errors
	}
	originalConsoleError(...args);
};

// Mock window.eyas IPC bridge
global.window.eyas = {
	send: vi.fn(),
	receive: vi.fn()
};

// Mock window.crypto.randomUUID for ModalWrapper
Object.defineProperty(global.window, `crypto`, {
	value: {
		randomUUID: () => `test-uuid-` + Math.random().toString(36).substring(7)
	},
	writable: true,
	configurable: true
});

// Mock visualViewport for Vuetify VOverlay
Object.defineProperty(global.window, `visualViewport`, {
	value: {
		width: 1024,
		height: 768,
		offsetLeft: 0,
		offsetTop: 0,
		pageLeft: 0,
		pageTop: 0,
		scale: 1,
		addEventListener: vi.fn(),
		removeEventListener: vi.fn()
	},
	writable: true,
	configurable: true
});

// Mock ResizeObserver for Vuetify components
global.ResizeObserver = class ResizeObserver {
	observe(): void {}
	unobserve(): void {}
	disconnect(): void {}
};
