/**
 * Utility to create Branded (Nominal) types.
 * Prevents logic crossovers (e.g., assigning a 'Height' to a 'Width').
 */
export type Brand<K, T> = K & { readonly __brand: T };
