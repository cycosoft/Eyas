import { describe, it, expect } from 'vitest';
import { formatBytes } from '@/utils/format.utils.js';

describe(`format.utils`, () => {
	describe(`formatBytes`, () => {
		it(`should return '0 Bytes' for 0`, () => {
			expect(formatBytes(0)).toBe(`0 Bytes`);
		});

		it(`should format bytes correctly`, () => {
			expect(formatBytes(512)).toBe(`512 Bytes`);
		});

		it(`should format KB correctly`, () => {
			expect(formatBytes(1024)).toBe(`1.00 KB`);
			expect(formatBytes(2048)).toBe(`2.00 KB`);
		});

		it(`should format MB correctly`, () => {
			expect(formatBytes(1048576)).toBe(`1.00 MB`);
			expect(formatBytes(1572864)).toBe(`1.50 MB`);
		});

		it(`should format GB correctly`, () => {
			expect(formatBytes(1073741824)).toBe(`1.00 GB`);
		});

		it(`should respect the decimals parameter`, () => {
			expect(formatBytes(1572864, 0)).toBe(`2 MB`);
			expect(formatBytes(1572864, 1)).toBe(`1.5 MB`);
			expect(formatBytes(1572864, 3)).toBe(`1.500 MB`);
		});

		it(`should handle negative numbers as 0 Bytes or handle them gracefully`, () => {
			expect(formatBytes(-1024)).toBe(`0 Bytes`);
		});
	});
});
