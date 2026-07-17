declare module '@cypress/unique-selector/lib/index.js' {
	type DomSelector = string;
	function getUniqueSelector(element: Element): DomSelector | null;
	export default getUniqueSelector;
}
