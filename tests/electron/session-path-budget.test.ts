import { describe, test, expect } from 'vitest';
import { shortScopeId, getTestPartition, SCOPE_ID_LENGTH } from '@scripts/constants.js';
import type { TestId, ScopeId, FilePath } from '@registry/primitives.js';

// Windows refuses most paths over 260 characters, and Chromium nests deeply beneath
// the profile root. EYAS-334 put a 64-character projectId and a 36-character testId
// into `sessionData`, which pushed IndexedDB's `MANIFEST-000001` past the cap for any
// host longer than 7 characters — leveldb created its LOCK/LOG then died on the
// MANIFEST write, surfacing to apps under test as an opaque `UnknownError`.
//
// These tests fix a budget for everything Eyas contributes to that path so it cannot
// silently regrow. They are the guard the original change lacked.

const WINDOWS_MAX_PATH = 260;

/** Deepest layout Chromium creates under a partition, measured from the profile root. */
const CHROMIUM_SUFFIX = `\\Partitions\\${getTestPartition(`some-test-id` as TestId).replace(`persist:`, ``)}\\IndexedDB\\https__0.indexeddb.leveldb\\MANIFEST-000001`;

/** A realistic worst case: a deep install root plus the two hashed scope segments. */
const APP_ROOT = `C:\\Users\\some-longer-username\\AppData\\Roaming\\@cycosoft\\eyas`;

function sessionDataDir(projectId: ScopeId, testId: ScopeId): FilePath {
	return `${APP_ROOT}\\${shortScopeId(projectId)}\\${shortScopeId(testId)}`;
}

describe(`Session path budget`, () => {
	test(`the scope segments Eyas adds cost a fixed 17 characters regardless of id length`, () => {
		const short = sessionDataDir(`a`, `b`);
		const long = sessionDataDir(`a`.repeat(500), `b`.repeat(500));

		expect(short.length - APP_ROOT.length).toBe(SCOPE_ID_LENGTH * 2 + 2);
		expect(long.length).toBe(short.length);
	});

	test(`a realistic host still fits under MAX_PATH once Chromium nests beneath the profile`, () => {
		const host = `local-client-viewer.dev.hawksoft.app`; // 36 chars — the reported failure
		const full = `${sessionDataDir(`p`.repeat(64), `11111111-2222-3333-4444-555555555555`)}${CHROMIUM_SUFFIX.replace(`https__0`, `https_${host}_0`)}`;

		expect(full.length).toBeLessThan(WINDOWS_MAX_PATH);
	});

	test(`leaves at least 80 characters of headroom for the host under test`, () => {
		const base = `${sessionDataDir(`p`.repeat(64), `t`.repeat(36))}${CHROMIUM_SUFFIX}`;

		expect(WINDOWS_MAX_PATH - base.length).toBeGreaterThanOrEqual(80);
	});
});

describe(`shortScopeId`, () => {
	test(`is deterministic, so relaunching the same build reuses its profile`, () => {
		expect(shortScopeId(`build-a`)).toBe(shortScopeId(`build-a`));
	});

	test(`always produces a fixed-length lowercase hex segment`, () => {
		for (const value of [``, `a`, `default`, `x`.repeat(1000), `../escape`, `naïve id`]) {
			expect(shortScopeId(value)).toMatch(new RegExp(`^[0-9a-f]{${SCOPE_ID_LENGTH}}$`));
		}
	});

	test(`separates ids that share a long prefix — the reason this hashes rather than truncates`, () => {
		expect(shortScopeId(`session-test-a`)).not.toBe(shortScopeId(`session-test-b`));
	});

	test(`never emits path separators or traversal sequences`, () => {
		expect(shortScopeId(`../../etc/passwd`)).not.toMatch(/[\\/.]/);
	});
});

describe(`getTestPartition`, () => {
	test(`isolates distinct test ids`, () => {
		expect(getTestPartition(`a` as TestId)).not.toBe(getTestPartition(`b` as TestId));
	});

	test(`falls back to a stable partition when no test id is supplied`, () => {
		expect(getTestPartition()).toBe(getTestPartition(undefined));
		expect(getTestPartition()).toBe(`persist:${shortScopeId(`default`)}-test`);
	});

	test(`stays persistent so storage survives a relaunch`, () => {
		expect(getTestPartition(`a` as TestId)).toMatch(/^persist:/);
	});
});
