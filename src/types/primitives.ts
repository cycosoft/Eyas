/**
 * Semantic Type Aliases for Eyas.
 * These provide context and documentation for raw primitives without 
 * sacrificing the flexibility of the underlying data type.
 */

// Timestamps / Durations
export type TimestampMS = number;
export type DurationMS = number;
export type FormattedDuration = string;
export type ValidityDays = number;

// Events / Progress
export type ProgressBytes = number;
export type EventType = string;
export type IsComputable = boolean;

// UI / Labels
export type MenuLabel = string;
export type AppTitle = string;
export type AppName = string;
export type AppVersion = string;
export type FormattedCacheSize = string;
export type UpdateStatus = string;
export type ModalMode = string;

// Flags
export type IsVisible = boolean;
export type IsEnabled = boolean;
export type IsDev = boolean;
export type IsActive = boolean;
export type IsDefault = boolean;
export type UseHttps = boolean;

// File System
export type FileSystemPath = string;
export type FileContent = string;

// Networking
export type PortNumber = number;
export type DomainUrl = string;
export type ResponseBody = string;
export type ChannelName = string;
export type CommandLine = string;

// Certificates
export type CertKey = string;
export type CertContent = string;

// Locations / Identity
export type OrganizationName = string;
export type CountryCode = string;
export type StateName = string;
export type LocalityName = string;
