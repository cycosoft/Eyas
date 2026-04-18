/**
 * Semantic Type Aliases for Eyas.
 * These provide context and documentation for raw primitives without
 * sacrificing the flexibility of the underlying data type.
 */

// Timestamps / Durations
export type TimestampMS = number;
export type DurationMS = number;
export type FormattedDuration = string;

// Boolean Statuses
export type IsFeatureEnabled = boolean;
export type IsActive = boolean;
export type Success = boolean;
export type IsVisible = boolean;
export type IsPending = boolean;
export type IsEnabled = boolean;
export type IsDev = boolean;
export type IsDefault = boolean;
export type UseHttps = boolean;
export type ValidityDays = number;

// Events / Progress
export type ProgressBytes = number;
export type MPEventName = string;
export type EventType = string;
export type IsComputable = boolean;

// UI / Labels
export type MenuLabel = string;
export type AppTitle = string;
export type ProjectId = string;
export type SettingKey = string;
export type AppName = string;
export type AppVersion = string;
export type FormattedCacheSize = string;
export type ByteCount = number;
export type UpdateStatus = string;
export type ModalMode = string;
export type HashString = string;
export type ThemeSource = string;

// File System
export type FileSystemPath = string;
export type FilePath = FileSystemPath;
export type FileContent = string;

// Networking
export type PortNumber = number;
export type DomainUrl = string;
export type ResponseBody = string;
export type ChannelName = string;
export type CommandLine = string;

// UI Measurements
export type ViewportWidth = number;
export type ViewportHeight = number;
export type ViewportLabel = string;

// Certificates
export type CertKey = string;
export type CertContent = string;

// Locations / Identity
export type OrganizationName = string;
export type CountryCode = string;
export type StateName = string;
export type LocalityName = string;
