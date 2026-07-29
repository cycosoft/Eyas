declare module '@cypress/unique-selector/lib/index.js' {
	type DomSelector = string;
	type SelectorFilter = (type: string, key: string, value: string) => boolean;
	type UniqueSelectorOptions = {
		filter?: SelectorFilter;
	}
	function getUniqueSelector(element: Element, options?: UniqueSelectorOptions): DomSelector | null;
	export default getUniqueSelector;
}
