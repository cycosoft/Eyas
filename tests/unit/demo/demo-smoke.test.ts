import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, join, relative } from 'node:path';
import { JSDOM } from 'jsdom';
import type { FilePath, LabelString } from '@registry/primitives.js';

/**
 * Smoke tests for the Eyas Demo site.
 * These tests verify that all HTML pages are well-formed, contain the required components,
 * and successfully load the essential assets.
 *
 * Note: These tests run in a JSDOM environment but utilize Node.js FS APIs
 * to scan the local demo directory.
 */

const DEMO_ROOT = resolve(process.cwd(), `demo`) as FilePath;

/**
 * Recursively find all HTML files in a directory.
 */
function getHtmlFiles(dir: FilePath, fileList: FilePath[] = []): FilePath[] {
	const files = readdirSync(dir);
	for (const file of files) {
		const name = join(dir, file) as FilePath;
		if (statSync(name).isDirectory()) {
			getHtmlFiles(name, fileList);
		} else if (file.endsWith(`.html`)) {
			fileList.push(name);
		}
	}
	return fileList;
}

const htmlFiles = getHtmlFiles(DEMO_ROOT);

describe(`Demo Site Smoke Tests`, () => {
	it.each(htmlFiles)(`should have required components and assets: %s`, (filePath: FilePath) => {
		const relativePath = relative(DEMO_ROOT, filePath) as FilePath;
		const html = readFileSync(filePath, `utf-8`) as LabelString;
		const dom = new JSDOM(html);
		const { document } = dom.window;

		// 1. Basic Structure
		expect(document.title, `Missing <title> in ${relativePath}`).toBeTruthy();
		expect(document.body, `Missing <body> in ${relativePath}`).toBeDefined();

		// 2. Component Inclusion
		const nav = document.querySelector(`eyas-nav`);
		const footer = document.querySelector(`eyas-footer`);
		expect(nav, `Missing <eyas-nav> in ${relativePath}`).not.toBeNull();
		expect(footer, `Missing <eyas-footer> in ${relativePath}`).not.toBeNull();

		// 3. Asset Loading
		const scripts = Array.from(document.querySelectorAll(`script`));
		const scriptSrcs = scripts.map((s: HTMLScriptElement) => s.getAttribute(`src`)).filter(Boolean) as LabelString[];

		const hasComponents = scriptSrcs.some(src => src.endsWith(`components.js`));
		const hasDemo = scriptSrcs.some(src => src.endsWith(`demo.js`));

		expect(hasComponents, `Missing components.js in ${relativePath}`).toBe(true);
		expect(hasDemo, `Missing demo.js in ${relativePath}`).toBe(true);

		// 4. Internal Link Resolution
		const links = Array.from(document.querySelectorAll(`a`));
		links.forEach((link: HTMLAnchorElement) => {
			const href = link.getAttribute(`href`) as LabelString | null;

			// Only check relative internal links
			if (href && !href.startsWith(`http`) && !href.startsWith(`#`) && !href.startsWith(`mailto`)) {

				// Skip explicit "bad routes" used for SPA fallback demonstration
				if (href === `/BAD_ROUTE`) { return; }

				let linkPath: FilePath;
				if (href.startsWith(`/`)) {
					// Root-relative link (relative to DEMO_ROOT)
					linkPath = resolve(DEMO_ROOT, href.substring(1).split(`?`)[0].split(`#`)[0]) as FilePath;
				} else {
					// Path-relative link
					linkPath = resolve(join(filePath, `..`), href.split(`?`)[0].split(`#`)[0]) as FilePath;
				}

				try {
					const stats = statSync(linkPath);
					if (stats.isDirectory()) {
						// Directory must contain an index.html
						expect(statSync(join(linkPath, `index.html`) as FilePath).isFile()).toBe(true);
					} else {
						expect(stats.isFile()).toBe(true);
					}
				} catch (cause) {
					throw new Error(`Broken internal link in ${relativePath}: "${href}" (Resolved to: ${linkPath})`, { cause });
				}
			}
		});
	});

	it(`should have functional viewport elements on the viewport page`, () => {
		const viewportPage = join(DEMO_ROOT, `demo/viewport/index.html`) as FilePath;
		const html = readFileSync(viewportPage, `utf-8`) as LabelString;
		const dom = new JSDOM(html);
		const { document } = dom.window;

		expect(document.getElementById(`viewport-readout`)).not.toBeNull();
		expect(document.getElementById(`viewport-category`)).not.toBeNull();
		expect(document.getElementById(`viewport-state`)).not.toBeNull();
	});
});
