'use strict';

// imports
import { app } from 'electron';
import _path from 'path';
import fsExtra from 'fs-extra';
import { SETTINGS_DEFAULTS } from '../scripts/constants.js';

const { readJson, outputJson } = fsExtra;

// ─── internal state ────────────────────────────────────────────────────────────

/** In-memory representation of the loaded settings file */
let _data = null;

/** Path to the settings JSON file (overridable for tests) */
let _storagePath = null;

// ─── test-only escape hatch ───────────────────────────────────────────────────

/**
 * Override the storage path — used in tests to redirect I/O to a temp directory.
 * @param {string} p - Absolute path to the settings JSON file
 */
function _setStoragePath(p) {
	_storagePath = p;
	_data = null; // reset in-memory cache so the new path is read on next load()
}

// ─── helpers ──────────────────────────────────────────────────────────────────

/**
 * Deep-get a value from an object by dot-notation key path.
 * Returns `undefined` if any segment is missing.
 */
function _deepGet(obj, keyPath) {
	return keyPath.split(`.`).reduce((acc, k) => acc?.[k], obj);
}

/**
 * Deep-set a value in an object by dot-notation key path.
 * Creates intermediate objects as needed.
 */
function _deepSet(obj, keyPath, value) {
	const keys = keyPath.split(`.`);
	const last = keys.pop();
	const target = keys.reduce((acc, k) => {
		if (acc[k] === undefined || typeof acc[k] !== `object`) { acc[k] = {}; }
		return acc[k];
	}, obj);
	target[last] = value;
}

// ─── public API ───────────────────────────────────────────────────────────────

/**
 * Load settings from disk into memory.
 * Safe to call even if the file does not yet exist.
 */
async function load() {
	if (!_storagePath) {
		_storagePath = _path.join(app.getPath(`userData`), `settings.json`);
	}

	try {
		const raw = await readJson(_storagePath);
		_data = raw || { app: {}, projects: {} };
	} catch {
		// file does not exist yet, or contains invalid JSON — start fresh
		_data = { app: {}, projects: {} };
	}
}

/**
 * Persist the current in-memory settings to disk.
 * Fire-and-forget — callers should not await unless they need to know it finished.
 */
/**
 * Persist the current in-memory settings to disk.
 * Sequentializes saves to prevent concurrent write issues.
 */
let _saveQueue = Promise.resolve();
async function save() {
	_saveQueue = _saveQueue.then(async () => {
		if (!_storagePath) {
			_storagePath = _path.join(app.getPath(`userData`), `settings.json`);
		}

		await outputJson(_storagePath, _data, { spaces: 2 });
	}).catch(err => {
		console.error(`[SETTINGS-SERVICE] save failed:`, err);
	});

	return _saveQueue;
}


/**
 * Get a setting value using the cascade: project → app → SETTINGS_DEFAULTS.
 * @param {string} keyPath  - Dot-notation path (e.g. 'env.alwaysChoose')
 * @param {string} [projectId] - If provided, project-level value is checked first
 * @returns {*} Resolved value
 */
function get(keyPath, projectId) {

	// 1. project level
	if (projectId) {
		const projectVal = _deepGet(_data?.projects?.[projectId], keyPath);
		if (projectVal !== undefined) { return projectVal; }
	}

	// 2. app level
	const appVal = _deepGet(_data?.app, keyPath);
	if (appVal !== undefined) { return appVal; }

	// 3. Eyas defaults
	return _deepGet(SETTINGS_DEFAULTS, keyPath);
}

/**
 * Set a setting value in memory (does NOT auto-save to disk).
 * Call save() after set() to persist.
 * @param {string} keyPath   - Dot-notation path (e.g. 'env.alwaysChoose')
 * @param {*}      value     - Value to store
 * @param {string} [projectId] - If provided, stored under the project bucket
 */
function set(keyPath, value, projectId) {
	if (!_data) { _data = { app: {}, projects: {} }; }

	if (projectId) {
		if (!_data.projects[projectId]) { _data.projects[projectId] = {}; }
		_deepSet(_data.projects[projectId], keyPath, value);
	} else {
		_deepSet(_data.app, keyPath, value);
	}
}

/**
 * Return the settings object for a specific project.
 * Returns an empty object (not defaults) when the project has no stored settings.
 * @param {string} projectId
 * @returns {object}
 */
function getProjectSettings(projectId) {
	return _data?.projects?.[projectId] || {};
}

/**
 * Return the app-level settings object.
 * @returns {object}
 */
function getAppSettings() {
	return _data?.app || {};
}

// ─── exports ──────────────────────────────────────────────────────────────────

export {
	load,
	save,
	get,
	set,
	getProjectSettings,
	getAppSettings,
	_setStoragePath
};

export default {
	load,
	save,
	get,
	set,
	getProjectSettings,
	getAppSettings,
	_setStoragePath
};
