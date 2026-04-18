/**
 * Meta-type for wrapping ESM modules with a default export.
 * Used to avoid anonymous object structures in casting syntax.
 */
export type ModuleWithDefault<T> = {
	default: T;
}
