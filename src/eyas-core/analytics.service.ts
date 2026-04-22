import Mixpanel from 'mixpanel';
import nodeMachineId from 'node-machine-id';
const { machineId } = nodeMachineId;
import _os from 'node:os';
import { MP_EVENTS } from './metrics-events.js';
import type { ValidatedConfig } from '@registry/config.js';
import type { MPEventName, AppVersion, IsActive, DeviceId, MetadataRecord } from '@registry/primitives.js';

const MP_KEY_PROD = `07f0475cb429f7de5ebf79a1c418dc5c`;
const MP_KEY_DEV = `02b67bb94dd797e9a2cbb31d021c3cef`;

let mpInstance: Mixpanel.Mixpanel | null = null;
let deviceId: DeviceId | null = null;
const operatingSystem = _os.platform();

/**
 * Initializes the analytics service.
 * @param isDev Whether the app is running in development mode.
 */
async function init(isDev: IsActive): Promise<void> {
	if (mpInstance) { return; }

	mpInstance = Mixpanel.init(isDev ? MP_KEY_DEV : MP_KEY_PROD);
	deviceId = await machineId();
	mpInstance.people.set(deviceId, {});
}

/**
 * Tracks an event in Mixpanel.
 * @param event The name of the event to track.
 * @param config The current validated configuration.
 * @param appVersion The current version of the application.
 * @param extraData Additional data to send with the event.
 */
async function trackEvent(
	event: MPEventName,
	config: ValidatedConfig | null,
	appVersion: AppVersion,
	extraData?: MetadataRecord
): Promise<void> {
	if (!mpInstance || !deviceId) { return; }

	mpInstance.track(event, {
		distinct_id: deviceId,
		$os: operatingSystem,
		$app_version_string: appVersion,
		companyId: config?.meta.companyId,
		projectId: config?.meta.projectId,
		testId: config?.meta.testId,
		...extraData
	});
}

/**
 * Resets the service state. Used for testing.
 */
function reset(): void {
	mpInstance = null;
	deviceId = null;
}

export const analyticsService = {
	init,
	trackEvent,
	reset,
	MP_EVENTS
};
