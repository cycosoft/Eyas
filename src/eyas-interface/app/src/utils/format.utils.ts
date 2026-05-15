import type { ByteCount, DecimalCount, FormattedByteString } from '@registry/primitives.js';

/**
 * Formats a number of bytes into a human-readable string.
 * @param bytes The number of bytes to format.
 * @param decimals The number of decimal places to include (default: 2).
 * @returns A formatted string (e.g., "1.24 KB").
 */
export function formatBytes(bytes: ByteCount, decimals: DecimalCount = 2): FormattedByteString {
	if (bytes <= 0) { return `0 Bytes`; }

	const k = 1024;
	const dm = decimals < 0 ? 0 : decimals;
	const sizes = [`Bytes`, `KB`, `MB`, `GB`, `TB`, `PB`, `EB`, `ZB`, `YB`];

	const i = Math.floor(Math.log(bytes) / Math.log(k));
	const value = bytes / Math.pow(k, i);

	if (i === 0) {
		return `${bytes} ${sizes[i]}`;
	}

	return `${value.toFixed(dm)} ${sizes[i]}`;
}
