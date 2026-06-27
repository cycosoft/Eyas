import type { IsVisible, DomainUrl, IsEnabled, MenuLabel, EventType, ViewportWidth, AppTitle, ResponseBody, PortNumber, IsActive, LabelString, AppVersion, Username, ListIndex } from './primitives.js';
import type { CredentialMetadata, EnvironmentChoiceWithTitle } from './core.js';
import type { CredentialPayload } from './ipc.js';

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

export type EyasModalProps = {
	modelValue: IsVisible;
}

export type EyasModalEmits = {
	(e: `update:modelValue`, value: IsVisible): void;
}

export type ModalBackgroundEmits = {
	(e: `after-leave`): void;
}

/**
 * Type helper for the Vue component's ViewModel in tests.
 */


/**
 * Type helper for the WhatsNewModal Vue component's ViewModel in tests.
 */
export type WhatsNewModalVM = {
	isVisible: IsVisible;
	mode: `launch` | `manual`;
	showManual: () => Promise<void>;
	showFromMain: () => Promise<void>;
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
	domains: EnvironmentChoiceWithTitle[];
	visible: IsVisible;
	loadingIndex: ListIndex;
	choose: (domain: EnvironmentChoiceWithTitle, index: ListIndex) => void;
	alwaysChoose: IsVisible;
	projectId: AppTitle | null;
	domainsHash: ResponseBody | null;
	warningVisible: IsVisible;
	pendingDomain: EnvironmentChoiceWithTitle | null;
	pendingIndex: ListIndex;
	onSelectEnvironment: (domain: EnvironmentChoiceWithTitle, index: ListIndex) => void;
	confirmWarning: () => void;
	cancelWarning: () => void;
	getIcon: (domain: EnvironmentChoiceWithTitle) => LabelString;
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
	appAllowBypassUpdates: boolean;
	projectCredentials: CredentialMetadata[];
	deleteConfirmVisible: IsVisible;
	credentialToDelete: CredentialMetadata | null;
	requestDeleteCredential: (origin: DomainUrl, username: Username) => void;
	confirmDelete: () => void;
	cancelDelete: () => void;
	deleteCredential: (origin: DomainUrl, username: Username) => void;
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
 * Type helper for the NoUpdateModal Vue component's ViewModel in tests.
 */
export type NoUpdateModalVM = {
	visible: IsVisible;
	progress: number;
	close: () => void;
	$nextTick: () => Promise<void>;
};

/**
 * Data passed to the VersionMismatchModal via IPC.
 */
export type VersionMismatchData = {
	runnerVersion?: AppVersion;
	testVersion?: AppVersion;
};

export * from './components.header.js';

/**
 * Type helper for the SaveCredentialModal Vue component's ViewModel in tests.
 */
export type SaveCredentialModalVM = {
	visible: IsVisible;
	credential: CredentialPayload | null;
	save: () => void;
	cancel: () => void;
	$nextTick: () => Promise<void>;
};
