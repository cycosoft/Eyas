import { config } from '@vue/test-utils';
import { createVuetify } from 'vuetify';
import { createPinia } from 'pinia';
import { vi } from 'vitest';

// Configure Vuetify
const vuetify = createVuetify();
config.global.plugins = [vuetify, createPinia()];

// Mock window.eyas IPC bridge
global.window.eyas = {
	send: vi.fn(),
	receive: vi.fn()
};

// Mock window.crypto.randomUUID for ModalWrapper
Object.defineProperty(global.window, 'crypto', {
	value: {
		randomUUID: () => 'test-uuid-' + Math.random().toString(36).substring(7)
	},
	writable: true,
	configurable: true
});

// Mock visualViewport for Vuetify VOverlay
Object.defineProperty(global.window, 'visualViewport', {
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
	observe() {}
	unobserve() {}
	disconnect() {}
};
