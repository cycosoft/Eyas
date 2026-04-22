import type { ViewportLabel, ViewportWidth, ViewportHeight, IsDefault } from './primitives.js';

/**
 * Represents a viewport configuration for the Eyas Demo site.
 */
export type EyasViewport = {
	label: ViewportLabel;
	width: ViewportWidth;
	height: ViewportHeight;
};

/**
 * Represents the result of a viewport classification.
 */
export type ViewportClassification = {
	label: ViewportLabel;
	default: IsDefault;
};

/**
 * The global 'eyasDemo' object exposed on the window in the demo site.
 */
export type EyasDemo = {
	getViewportLabel: (w?: number) => ViewportClassification;
	EYAS_VIEWPORTS: EyasViewport[];
};
