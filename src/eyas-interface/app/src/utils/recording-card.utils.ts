import type { ColorHex } from '@registry/primitives.js';

export type RecordingCardStatus = `recording` | `playing` | `passed` | `failed` | `stopped` | `neutral`;

export function cardIconFor(status: RecordingCardStatus): `mdi-chart-bar` | `mdi-circle` | `mdi-alert-circle-outline` | `mdi-check-circle-outline` | `mdi-stop-circle-outline` | `mdi-clock-outline` {
	if (status === `playing`) { return `mdi-chart-bar`; }
	if (status === `recording`) { return `mdi-circle`; }
	if (status === `failed`) { return `mdi-alert-circle-outline`; }
	if (status === `passed`) { return `mdi-check-circle-outline`; }
	if (status === `stopped`) { return `mdi-stop-circle-outline`; }
	return `mdi-clock-outline`;
}

export function accentColorFor(status: RecordingCardStatus): ColorHex {
	if (status === `passed`) { return `#43a047`; }
	if (status === `failed` || status === `recording`) { return `#e53935`; }
	if (status === `playing`) { return `rgb(var(--v-theme-primary))`; }
	// grey like `neutral` (never run) — a stopped run is neither a pass nor a fail, and the distinct
	// icon/label already tell it apart from "never run" without needing its own hue
	if (status === `stopped`) { return `#757575`; }
	return `#9e9e9e`;
}

export function actionIconFor(status: RecordingCardStatus): `mdi-stop` | `mdi-play` {
	if (status === `recording` || status === `playing`) { return `mdi-stop`; }
	return `mdi-play`;
}

export function statusLabelFor(status: RecordingCardStatus): `PLAYING` | `RECORDING` | `FAILED` | `PASSED` | `INTERRUPTED` | `` {
	if (status === `playing`) { return `PLAYING`; }
	if (status === `recording`) { return `RECORDING`; }
	if (status === `failed`) { return `FAILED`; }
	if (status === `passed`) { return `PASSED`; }
	if (status === `stopped`) { return `INTERRUPTED`; }
	return ``;
}
