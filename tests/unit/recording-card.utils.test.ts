import { describe, test, expect } from 'vitest';
import { cardIconFor, accentColorFor, actionIconFor, statusLabelFor } from '@/utils/recording-card.utils.js';

describe(`recording card presentation for a "stopped" run`, () => {
	test(`cardIconFor returns an icon distinct from both "neutral" (never run) and "failed"`, () => {
		expect(cardIconFor(`stopped`)).not.toBe(cardIconFor(`neutral`));
		expect(cardIconFor(`stopped`)).not.toBe(cardIconFor(`failed`));
	});

	test(`accentColorFor returns a grey distinct from "passed" and "failed", matching the neutral (never-run) family since the icon and label carry the distinction`, () => {
		expect(accentColorFor(`stopped`)).not.toBe(accentColorFor(`passed`));
		expect(accentColorFor(`stopped`)).not.toBe(accentColorFor(`failed`));
		expect(accentColorFor(`stopped`)).toMatch(/^#[0-9a-f]{6}$/);
	});

	test(`actionIconFor returns mdi-play, same as any other non-active row`, () => {
		expect(actionIconFor(`stopped`)).toBe(`mdi-play`);
	});

	test(`statusLabelFor returns a label distinct from PASSED, FAILED, and the empty never-run label`, () => {
		const label = statusLabelFor(`stopped`);
		expect(label).not.toBe(`PASSED`);
		expect(label).not.toBe(`FAILED`);
		expect(label).not.toBe(``);
	});
});
