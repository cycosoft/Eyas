import type { ColorHex } from '@registry/primitives.js';

export type RecordingCardStatus = `recording` | `playing` | `passed` | `failed` | `neutral`;

export function cardIconFor(status: RecordingCardStatus): `mdi-chart-bar` | `mdi-circle` | `mdi-alert-circle-outline` | `mdi-play-circle-outline` {
	if (status === `playing`) { return `mdi-chart-bar`; }
	if (status === `recording`) { return `mdi-circle`; }
	if (status === `failed`) { return `mdi-alert-circle-outline`; }
	return `mdi-play-circle-outline`;
}

export function accentColorFor(status: RecordingCardStatus): ColorHex {
	if (status === `passed`) { return `#43a047`; }
	if (status === `failed` || status === `recording`) { return `#e53935`; }
	if (status === `playing`) { return `rgb(var(--v-theme-primary))`; }
	return `#9e9e9e`;
}

export function statusLabelFor(status: RecordingCardStatus): `PLAYING` | `RECORDING` | `FAILED` | `PASSED` | `` {
	if (status === `playing`) { return `PLAYING`; }
	if (status === `recording`) { return `RECORDING`; }
	if (status === `failed`) { return `FAILED`; }
	if (status === `passed`) { return `PASSED`; }
	return ``;
}
