import { describe, test, expect } from 'vitest';
import { VALID_SEND_CHANNELS, VALID_RECEIVE_CHANNELS } from '@registry/ipc.js';

describe(`event-bridge channel whitelists`, () => {
	describe(`send channels`, () => {
		const required = [
			`app-exit`,
			`hide-ui`,
			`show-ui`,
			`environment-selected`,
			`launch-link`,
			`network-status`,
			`test-server-setup-continue`,
			`test-server-setup-step`,
			`test-server-resume-confirm`,
			`test-server-stop`,
			`test-server-open-browser`,
			`test-server-extend`,
			`save-setting`,
			`get-settings`
		];

		test.each(required)(`includes channel: %s`, channel => {
			expect(VALID_SEND_CHANNELS).toContain(channel);
		});
	});

	describe(`receive channels`, () => {
		const required = [
			`modal-exit-visible`,
			`show-environment-modal`,
			`show-variables-modal`,
			`show-version-mismatch-modal`,
			`show-test-server-setup-modal`,
			`show-test-server-resume-modal`,
			`show-test-server-active-modal`,
			`close-modals`,
			`show-settings-modal`,
			`setting-saved`,
			`settings-loaded`,
			`ui-shown`
		];

		test.each(required)(`includes channel: %s`, channel => {
			expect(VALID_RECEIVE_CHANNELS).toContain(channel);
		});
	});
});
