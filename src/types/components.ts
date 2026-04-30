import type { ModalMode, IsVisible, DomainUrl, IsEnabled, MenuLabel, EventType, ViewportWidth, AppTitle, ResponseBody, PortNumber, Count, IsActive, LabelString, AppVersion } from './primitives.js';

type ModalType = `modal` | `dialog`;

export type ModalBackgroundProps = {
	modelValue: IsVisible;
	contentVisible: IsVisible;
}

export type ModalWrapperProps = {
	modelValue: IsVisible;
	type?: ModalType;
	minWidth?: ViewportWidth | LabelString;
}

export type ModalWrapperEmits = {
	(e: `update:modelValue`, value: IsVisible): void;
}

export type ModalBackgroundEmits = {
	(e: `after-leave`): void;
}

/**
 * Type helper for the Vue component's ViewModel in tests.
 */
export type ComponentVM = {
	isVisible: IsVisible;
	mode: ModalMode;
	showManual: () => Promise<void>;
	close: () => Promise<void>;
	$nextTick: () => Promise<void>;
};

/**
 * Meta information for a variable in a URL.
 */
export type VariableItem = {
	type: EventType;
	field?: MenuLabel;
	options?: unknown[];
};

/**
 * Type helper for the VariablesModal Vue component's ViewModel in tests.
 */
export type VariablesModalVM = {
	link: DomainUrl;
	visible: IsVisible;
	parsedLink: DomainUrl;
	linkIsValid: IsEnabled;
	form: unknown[];
	variables: VariableItem[];
	getFieldLabel: (prefix: MenuLabel, field?: MenuLabel) => MenuLabel;
	$nextTick: () => Promise<void>;
};

/**
 * Type helper for the EnvironmentModal Vue component's ViewModel in tests.
 */
export type EnvironmentModalVM = {
	domains: unknown[];
	visible: IsVisible;
	choose: (domain: unknown, index: Count) => void;
	alwaysChoose: IsVisible;
	projectId: AppTitle;
	domainsHash: ResponseBody;
	onAlwaysChooseChange: (value: IsActive) => void;
	$nextTick: () => Promise<void>;
	$options: ComponentOptions;
};

type ComponentBaseOptions = {
	mounted?: Array<() => void>;
}

type ComponentOptions = ComponentBaseOptions & Record<LabelString, unknown>;

/**
 * Type helper for the ModalWrapper Vue component's ViewModel in tests.
 */
export type ModalWrapperVM = {
	pinDialogWidth: () => void;
	hideUi: () => void;
	dialogWidth: ViewportWidth | string;
	calculatedMinWidth: ViewportWidth | string;
	$nextTick: () => Promise<void>;
};

/**
 * Type helper for the SettingsModal Vue component's ViewModel in tests.
 */
export type SettingsModalVM = {
	visible: IsVisible;
	toastVisible: IsVisible;
	projectId: AppTitle;
	activeTab: MenuLabel;
	projectAlwaysChoose: IsVisible;
	appAlwaysChoose: IsVisible;
	saveProjectSetting: (key: MenuLabel, value: unknown) => void;
	saveAppSetting: (key: MenuLabel, value: unknown) => void;
	$nextTick: () => Promise<void>;
};

/**
 * Type helper for the TestServerActiveModal Vue component's ViewModel in tests.
 */
export type TestServerActiveModalVM = {
	visible: IsVisible;
	domain: DomainUrl;
	isExpired: IsVisible;
	displayUrl: DomainUrl;
	extensionLabel: MenuLabel;
	copyIcon: MenuLabel;
	openInBrowser: () => void;
	stopServer: () => void;
	copyDomain: () => void;
};

/**
 * Type helper for the TestServerSetupModal Vue component's ViewModel in tests.
 */
export type TestServerSetupModalVM = {
	visible: IsVisible;
	steps: unknown[];
	hostsLine: MenuLabel;
	portHttp: PortNumber;
	portHttps: PortNumber;
	port: PortNumber;
	autoOpenBrowser: IsVisible;
	useCustomDomain: IsVisible;
	useHttps: IsVisible;
	isWindows: IsVisible;
	displayDomain: DomainUrl;
	internalUseCustomDomain: IsVisible;
	internalUseHttps: IsVisible;
	displayPort: MenuLabel;
	continueStart: () => void;
	cancel: () => void;
	copyIcon: MenuLabel;
	$nextTick: () => Promise<void>;
};

/**
 * Type helper for the VersionMismatchModal Vue component's ViewModel in tests.
 */
export type VersionMismatchModalVM = {
	visible: IsVisible;
	runnerVersion: AppVersion | null;
	testVersion: AppVersion | null;
	checkForUpdate: () => void;
	$nextTick: () => Promise<void>;
};

/**
 * Data passed to the VersionMismatchModal via IPC.
 */
export type VersionMismatchData = {
	runnerVersion?: AppVersion;
	testVersion?: AppVersion;
};

/** A single item in a navigation group's submenu */
export type NavItem = {
	title: LabelString;
	value: LabelString;
	icon?: string;
	color?: string;
	shortcut?: string;
};

/** A top-level navigation group with a dropdown submenu */
export type NavGroup = {
	name: LabelString;
	logo?: string;
	shortcut?: string;
	submenu: NavItem[];
};

/** Event payload for navigation group activation */
export type NavActivateEvent = {
	currentTarget: Element;
};

/**
 * Type helper for the AppHeader Vue component's ViewModel in tests.
 */
export type AppHeaderVM = {
	menu: boolean;
	menuItems: NavItem[];
	activator: Element | undefined;
	groups: NavGroup[];
	activate: (event: NavActivateEvent, group: NavGroup) => void;
	onMouseEnter: (event: NavActivateEvent, group: NavGroup) => void;
	onItemClick: (item: NavItem) => void;
	$nextTick: () => Promise<void>;
};
