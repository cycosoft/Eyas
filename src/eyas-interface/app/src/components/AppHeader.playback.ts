import useRecordingStore from '@/stores/recording.js';
import { state } from './AppHeader.logic.js';
import type { NavItem, NavItemValue } from '@registry/components.js';
import type { IsActive } from '@registry/primitives.js';

/** Nav item values that must be disabled while a recorded test is replaying. */
const PLAYBACK_LOCKED_VALUES = new Set<NavItemValue>([
	`about`, `settings`, `check-updates`, `changelog`, `test-server`, `cache`
]);

/** Whether header controls should be locked because a recorded test is currently replaying. */
export function isPlaybackLocked(): IsActive {
	return useRecordingStore().isPlaying;
}

/**
 * Determines whether a nav item should be disabled, combining its own `actionable` flag with
 * the playback lock (the whole `Links` group locks regardless of its dynamic item values).
 * @param item The navigation item to check.
 */
export function isItemLocked(item: NavItem): IsActive {
	if (item.actionable === false) { return true; }
	if (!isPlaybackLocked()) { return false; }
	return state.activeGroup === `Links` || PLAYBACK_LOCKED_VALUES.has(item.value);
}
