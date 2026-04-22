import { describe, it, expect, beforeAll } from 'vitest';

describe(`Demo Site Components`, () => {
	beforeAll(async () => {
		// Import the components script to register custom elements
		// Using dynamic import since it's a JS file in the demo directory
		await import(`../../../demo/assets/components.js`);
	});

	it(`should register eyas-nav component`, () => {
		const nav = document.createElement(`eyas-nav`);
		document.body.appendChild(nav);
		
		expect(nav.innerHTML).toContain(`site-nav`);
		expect(nav.querySelector(`.nav-logo`)).not.toBeNull();
		expect(nav.querySelector(`.nav-logo`)?.textContent).toContain(`Eyas`);
	});

	it(`should register eyas-footer component`, () => {
		const footer = document.createElement(`eyas-footer`);
		document.body.appendChild(footer);
		
		expect(footer.innerHTML).toContain(`site-footer`);
		expect(footer.textContent).toContain(`Cycosoft, LLC`);
	});

	it(`should handle the root attribute in eyas-nav`, () => {
		const nav = document.createElement(`eyas-nav`);
		nav.setAttribute(`root`, ``);
		document.body.appendChild(nav);
		
		const links = nav.querySelectorAll(`a`);
		// Check that links don't have ../../ prefix
		links.forEach(link => {
			const href = link.getAttribute(`href`);
			if (href && !href.startsWith(`http`)) {
				expect(href).not.toContain(`../../`);
			}
		});
	});
});

describe(`Demo Site Utilities`, () => {
	beforeAll(async () => {
		await import(`../../../demo/assets/demo.js`);
	});

	it(`should define window.eyasDemo`, () => {
		expect(window.eyasDemo).toBeDefined();
		expect(window.eyasDemo.EYAS_VIEWPORTS).toBeDefined();
	});

	it(`should correctly classify viewports`, () => {
		const { getViewportLabel } = window.eyasDemo;
		
		expect(getViewportLabel(400).label).toBe(`Mobile`);
		expect(getViewportLabel(800).label).toBe(`Tablet`);
		expect(getViewportLabel(1200).label).toBe(`Desktop`);
	});
});
