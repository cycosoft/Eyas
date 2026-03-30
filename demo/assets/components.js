/**
 * Eyas Demo Site — Native Web Components
 * Zero-dependency, reusable layout elements
 */

const EYAS_LOGO_SVG = `<svg width="28" height="28" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><linearGradient id="nav-g1" x1="0" y1="0" x2="1" y2="0" gradientTransform="matrix(483,676,-720,514,577,77)" gradientUnits="userSpaceOnUse"><stop stop-color="#9d0620"/><stop offset="1" stop-color="#ffc610" stop-opacity="0"/></linearGradient><linearGradient id="nav-g2" x1="0" y1="0" x2="1" y2="0" gradientTransform="matrix(761,1065,-792,565,83,-2)" gradientUnits="userSpaceOnUse"><stop stop-color="#f90023"/><stop offset="1" stop-color="#ffc610"/></linearGradient></defs><path fill="#d05454" fill-rule="evenodd" d="m982 512c0 252-185 471-469 471-284 0-406-244-367-433 37-176 171-240 171-240-20 5-59-33-59-33 97 28 215 0 295 17 80 17 87 76 87 76 173 24 152 149 152 149-335-130-347 296-125 290 221-7 248-239 248-298 0-58-43-404-406-404-362 0-405 381-405 421 0 11 0 20 0 28 1 22-1 44-3 66-7 65 2 111 10 135 1 3-4 5-5 2-22-34-65-122-65-275 0-204 205-444 471-444 265 0 469 219 469 471zm-437-104c12 8 28 4 35-8l17-30c2-4-1-9-6-9h-104c-3 0-5 4-2 6z"/><path fill="#58a1d6" d="m982 512c0-252-204-471-469-471-266 0-471 240-471 444 0 153 43 240 65 275 2 3 6 1 5-2-7-24-17-70-10-135 2-22 4-44 3-66 0-8 0-17 0-28 0-40 43-421 405-421 363 0 406 346 406 404 0 34-9 124-58 196l32 92c60-81 93-181 93-288z"/><path fill="#58a1d6" d="m889 800-32-92c-37 54-96 99-191 101-221 6-209-419 126-290 0 0-284-133-398 94-115 227 118 370 118 370 164 0 295-73 377-183z"/><path fill="url(#nav-g1)" d="m889 800-32-92c-37 54-96 99-191 101-221 6-209-419 126-290 0 0-284-133-398 94-115 227 118 370 118 370 164 0 295-73 377-183z"/><path fill="url(#nav-g2)" d="m310 311-11-4c4 2 7 3 11 4z"/></svg>`;

/**
 * <eyas-nav> component
 */
class EyasNav extends HTMLElement {
	connectedCallback() {
		const isRoot = this.hasAttribute(`root`);
		const prefix = isRoot ? `./` : `../../`;
		const home = isRoot ? `./index.html` : `../../index.html`;

		this.innerHTML = `
			<nav class="site-nav" role="navigation" aria-label="Site navigation">
				<div class="container nav-inner">
					<a href="${home}" class="nav-logo" aria-label="Eyas home">
						<span>${EYAS_LOGO_SVG}</span>
						<span>Eyas</span>
					</a>
					<ul class="nav-links" role="list">
						<li><a href="${prefix}demo/environments/index.html">Environments</a></li>
						<li><a href="${prefix}demo/viewport/index.html">Viewport</a></li>
						<li><a href="${prefix}demo/routing/index.html">Routing</a></li>
						<li><a href="${prefix}demo/links/index.html">Links</a></li>
						<li><a href="${prefix}demo/network/index.html">Security</a></li>
						<li><a href="${prefix}demo/external/index.html">External</a></li>
						<li><a href="${prefix}demo/window/index.html">Window</a></li>
					</ul>
					${!isRoot ? `<a href="${home}" class="nav-home-btn">← Home</a>` : ``}
				</div>
			</nav>
		`;

		// Highlighting active link
		const currentPath = window.location.pathname;
		this.querySelectorAll(`.nav-links a`).forEach(link => {
			const href = link.getAttribute(`href`);
			// Simple match for demo purposes
			if (currentPath.includes(href.replace(`../../`, ``).replace(`./`, ``))) {
				link.classList.add(`active`);
			}
		});
	}
}

/**
 * <eyas-footer> component
 */
class EyasFooter extends HTMLElement {
	connectedCallback() {
		const isRoot = this.hasAttribute(`root`);
		const alt = isRoot ? `./demo/alt/index.html` : `../../demo/alt/index.html`;
		const path = isRoot ? `./demo/path/index.html` : `../../demo/path/index.html`;

		this.innerHTML = `
			<footer class="site-footer" role="contentinfo">
				<div class="container">
					<p>
						<a href="https://github.com/cycosoft/Eyas" target="_blank" rel="noopener">GitHub</a>
						&nbsp;·&nbsp;
						<a href="https://www.npmjs.com/package/@cycosoft/eyas" target="_blank" rel="noopener">npm</a>
						&nbsp;·&nbsp;
						<a href="https://cycosoft.com/eyas/terms" target="_blank" rel="noopener">Terms</a>
						&nbsp;·&nbsp;
						<a href="https://cycosoft.com/eyas/privacy" target="_blank" rel="noopener">Privacy</a>
						&nbsp;·&nbsp;
						MIT Licensed
					</p>
					<p style="margin-top:var(--space-2);">
						<!-- These links kept for E2E routing compat -->
						<a href="${alt}" id="link-alt" style="font-size:0.75rem;color:var(--text-muted);">Alt page</a>
						&nbsp;·&nbsp;
						<a href="${path}" id="link-path" style="font-size:0.75rem;color:var(--text-muted);">Path page</a>
						&nbsp;·&nbsp;
						<a href="/BAD_ROUTE" id="link-bad-route" style="font-size:0.75rem;color:var(--text-muted);">404 test</a>
					</p>
					<p style="margin-top:var(--space-4); font-size: 0.75rem; color: var(--text-muted);">
						&copy; 2026 Cycosoft, LLC. All rights reserved.
					</p>
				</div>
			</footer>
		`;
	}
}

// Register components
customElements.define(`eyas-nav`, EyasNav);
customElements.define(`eyas-footer`, EyasFooter);
