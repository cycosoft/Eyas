/**
 * Semantic Type Aliases for Eyas.
 * These provide context and documentation for raw primitives without
 * sacrificing the flexibility of the underlying data type.
 */

// Dimensions
export type ViewportWidth = number;
export type ViewportHeight = number;

// Networking
export type PortNumber = number;
export type DomainUrl = string;

// Application State
export type AppTitle = string;
export type AppVersion = string;
export type IsVisible = boolean;
export type IsEnabled = boolean;

// Timestamps / Durations
export type TimestampMS = number;
export type DurationMS = number;
export type FormattedDuration = string;
export type ValidityDays = number;

// File System
export type FileSystemPath = string;

// Certificates
export type CertKey = string;
export type CertContent = string;

// Locations / Identity
export type OrganizationName = string;
export type CountryCode = string;
export type StateName = string;
export type LocalityName = string;
