import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { analyticsService } from '../../src/eyas-core/analytics.service.js';
import Mixpanel from 'mixpanel';
import type { ValidatedConfig } from '../../src/types/config.js';

vi.mock(`mixpanel`, () => ({
	default: {
		init: vi.fn(() => ({
			track: vi.fn(),
			people: {
				set: vi.fn()
			}
		}))
	}
}));

vi.mock(`node-machine-id`, () => ({
	default: {
		machineId: vi.fn(() => Promise.resolve(`test-machine-id`))
	}
}));

describe(`Analytics Service`, () => {
	beforeEach(() => {
		vi.clearAllMocks();
		analyticsService.reset();
	});

	it(`should initialize with the correct key`, async () => {
		await analyticsService.init(true);
		expect(Mixpanel.init).toHaveBeenCalledWith(expect.stringContaining(`02b67bb`)); // Dev key
	});

	it(`should track events with correct metadata`, async () => {
		const mockConfig = {
			meta: {
				companyId: `test-company`,
				projectId: `test-project`,
				testId: `test-id`
			}
		} as unknown as ValidatedConfig;

		await analyticsService.init(false);
		await analyticsService.trackEvent(`test-event`, mockConfig, `1.2.3`, { extra: `data` });

		const mp = (Mixpanel.init as unknown as Mock).mock.results[0].value;
		expect(mp.track).toHaveBeenCalledWith(`test-event`, expect.objectContaining({
			distinct_id: `test-machine-id`,
			companyId: `test-company`,
			extra: `data`
		}));
	});
});
