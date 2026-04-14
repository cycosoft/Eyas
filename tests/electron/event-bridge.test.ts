import { describe, test, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const bridgeSrc = fs.readFileSync(
	path.join(import.meta.dirname, `../../src/scripts/event-bridge.js`),
	`utf8`
);

// Extract the send and receive whitelists from the source by parsing their array literals
function extractWhitelist(src, label) {
	// Find the array after "const validChannels" within the context of the send or receive block
	// We search for each occurrence sequentially
	const matches = [...src.matchAll(/const validChannels\s*=\s*\[([^\]]+)\]/g)];
	const idx = label === `send` ? 0 : 1;
	if (!matches[idx]) return [];
	const arrayContent = matches[idx][1];
	return [...arrayContent.matchAll(/`([^`]+)`/g)].map(m => m[1]);
}

const sendChannels = extractWhitelist(bridgeSrc, `send`);
const receiveChannels = extractWhitelist(bridgeSrc, `receive`);

describe(`event-bridge channel whitelists`, () => {
	describe(`send channels`, () => {
		const required = [
			`app-exit`,
			`hide-ui`,
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
			expect(sendChannels).toContain(channel);
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
			`settings-loaded`
		];

		test.each(required)(`includes channel: %s`, channel => {
			expect(receiveChannels).toContain(channel);
		});
	});
});
