/**
 * Semantic Type Aliases for Eyas.
 * These provide context and documentation for raw primitives without
 * sacrificing the flexibility of the underlying data type.
 */

// Timestamps / Durations
export type TimestampMS = number;
export type DurationMS = number;
export type FormattedDuration = string;
export type Timestamp = number;
export type DurationHours = number;
export type DurationString = string;

// Boolean Statuses
export type IsActive = boolean;
export type IsVisible = boolean;
export type IsPending = boolean;
export type IsEnabled = boolean;
export type IsDefault = boolean;
export type IsWindows = boolean;

// Events / Progress
export type ProgressBytes = number;
export type MPEventName = string;
export type EventType = string;
export type IsComputable = boolean;
export type Count = number;
export type TimerId = ReturnType<typeof setTimeout>;
export type MetadataKey = string;

// UI / Labels
export type MenuLabel = string;
export type AppTitle = string;
export type ProjectId = string;
export type SettingKey = string;
export type AppName = string;
export type AppVersion = string;
export type ByteCount = number;
export type UpdateStatus = string;
export type ModalMode = string;
export type ModalId = string;
export type ThemeSource = string;
export type MenuAccelerator = string;
export type LabelString = string;
export type TimeString = string;
export type IconName = string;
export type StepId = string;
export type VariableValue = string;
export type VariableType = string;
export type FieldName = string;

// File System
export type FileSystemPath = string;
export type FilePath = FileSystemPath;
export type SourcePath = string;

// Networking
export type PortNumber = number;
export type PortString = string;
export type DomainUrl = string;
export type ResponseBody = string;
export type ChannelName = string;
export type CommandLine = string;
export type CommandLineArgs = string[];

// UI Measurements
export type ViewportWidth = number;
export type ViewportHeight = number;
export type ViewportLabel = string;

// Identity / Identification
export type HashString = string;
export type TestId = string;

// Certificates
export type CertKey = string;
export type CertContent = string;
export type ValidityDays = number;

// Locations
export type OrganizationName = string;
export type CountryCode = string;
export type StateName = string;
export type LocalityName = string;

// Deep Linking / Loading
export type EyasProtocolUrl = string;
export type LoadMethod = string;

// CLI / System

export type ListIndex = number;
export type RetryCount = number;
export type SettingValue = unknown;
export type SettingsMap = Record<string, SettingValue>;

// UI / Theme
export type SystemTheme = string;

// Environments
export type EnvironmentKey = string;
