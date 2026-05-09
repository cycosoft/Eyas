import { Menu } from 'electron';
import { isVariableLinkValid } from '@scripts/variable-utils.js';
import { parseURL } from '@scripts/parse-url.js';

// Types
import type { MenuService, CoreContext } from '@registry/eyas-core.js';
import type { ValidatedConfig } from '@registry/config.js';
import type { IsActive, LabelString } from '@registry/primitives.js';
import type { NavItem } from '@registry/components.js';

/** Service for managing the application menu */
export const menuService: MenuService = {
	/**
	 * Refreshes the application menu with the current state.
	 * @param ctx The core context of the application.
	 */
	refresh: async (ctx: CoreContext): Promise<void> => {
		const { $appWindow } = ctx;
		if (!$appWindow || $appWindow.isDestroyed()) { return; }

		Menu.setApplicationMenu(null);
	},

	/**
	 * Returns a list of serializable link items for the renderer
	 * @param config The validated configuration
	 * @returns The list of serializable link items
	 */
	getSerializableLinks: (config: ValidatedConfig | null): NavItem[] => {
		if (!config?.links) { return []; }

		return config.links.map((link, index) => {
			const isExternal = !!link.external;
			const label = isExternal ? `🌐 ${link.label}` : link.label;
			const isVariable = link.url.includes(`{`);

			let isValid: IsActive;
			let value: LabelString;

			if (isVariable) {
				isValid = isVariableLinkValid(link.url);
				value = `launch-link-var:${link.url}`;
			} else {
				const parsed = parseURL(link.url);
				isValid = !!parsed;
				value = `launch-link:${JSON.stringify({ url: parsed?.toString() || link.url, openInBrowser: isExternal })}`;
			}

			return {
				title: isValid ? label : `${label} (invalid entry: "${link.url}")`,
				value: isValid ? value : `invalid-link-${index}`,
				actionable: isValid
			};
		});
	}
};
