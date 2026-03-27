/**
 * Eyas Demo Site — Shared Utilities
 */

/* ── Viewport ─────────────────────────────────────────────────────────────── */
const EYAS_VIEWPORTS = [
  { label: 'Mobile',  width: 360,  height: 640  },
  { label: 'Tablet',  width: 768,  height: 1024 },
  { label: 'Desktop', width: 1366, height: 768  }
];

/**
 * Returns a human-readable label for the current viewport width.
 * @param {number} [w] - width to classify (defaults to window.innerWidth)
 * @returns {{ label: string, default: boolean }}
 */
function getViewportLabel(w = window.innerWidth) {
  if (w <= 480) return { label: 'Mobile', default: true };
  if (w <= 900) return { label: 'Tablet', default: true };
  return { label: 'Desktop', default: true };
}

/* ── Network status ──────────────────────────────────────────────────────── */

/**
 * Registers network online/offline listeners and calls back on each change.
 * Also calls back immediately with the current state.
 * @param {(online: boolean) => void} callback
 * @returns {() => void} cleanup function
 */
function onNetworkChange(callback) {
  const onOnline  = () => callback(true);
  const onOffline = () => callback(false);
  window.addEventListener('online',  onOnline);
  window.addEventListener('offline', onOffline);
  // report initial state
  callback(navigator.onLine);
  return () => {
    window.removeEventListener('online',  onOnline);
    window.removeEventListener('offline', onOffline);
  };
}

/* ── Navigation ──────────────────────────────────────────────────────────── */

/** Mark the nav link that matches the current page as active. */
function markActiveNavLink() {
  const path = window.location.pathname.replace(/\/$/, '') || '/';
  document.querySelectorAll('.nav-links a').forEach(link => {
    const href = link.getAttribute('href').replace(/\/$/, '') || '/';
    if (href === path) link.classList.add('active');
  });
}

/* ── Eyas logo SVG snippet (inline, ~1kb) ───────────────────────────────── */
const EYAS_LOGO_SVG = `<svg width="36" height="36" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><linearGradient id="el1" x1="0" y1="0" x2="1" y2="0" gradientTransform="matrix(483,676,-720,514,577,77)" gradientUnits="userSpaceOnUse"><stop stop-color="#9d0620"/><stop offset="1" stop-color="#ffc610" stop-opacity="0"/></linearGradient><linearGradient id="el2" x1="0" y1="0" x2="1" y2="0" gradientTransform="matrix(761,1065,-792,565,83,-2)" gradientUnits="userSpaceOnUse"><stop stop-color="#f90023"/><stop offset="1" stop-color="#ffc610"/></linearGradient></defs><path fill="#d05454" fill-rule="evenodd" d="m982 512c0 252-185 471-469 471-284 0-406-244-367-433 37-176 171-240 171-240-20 5-59-33-59-33 97 28 215 0 295 17 80 17 87 76 87 76 173 24 152 149 152 149-335-130-347 296-125 290 221-7 248-239 248-298 0-58-43-404-406-404-362 0-405 381-405 421 0 11 0 20 0 28 1 22-1 44-3 66-7 65 2 111 10 135 1 3-4 5-5 2-22-34-65-122-65-275 0-204 205-444 471-444 265 0 469 219 469 471zm-437-104c12 8 28 4 35-8l17-30c2-4-1-9-6-9h-104c-3 0-5 4-2 6z"/><path fill="#58a1d6" d="m982 512c0-252-204-471-469-471-266 0-471 240-471 444 0 153 43 240 65 275 2 3 6 1 5-2-7-24-17-70-10-135 2-22 4-44 3-66 0-8 0-17 0-28 0-40 43-421 405-421 363 0 406 346 406 404 0 34-9 124-58 196l32 92c60-81 93-181 93-288z"/><path fill="#58a1d6" d="m889 800-32-92c-37 54-96 99-191 101-221 6-209-419 126-290 0 0-284-133-398 94-115 227 118 370 118 370 164 0 295-73 377-183z"/><path fill="url(#el1)" d="m889 800-32-92c-37 54-96 99-191 101-221 6-209-419 126-290 0 0-284-133-398 94-115 227 118 370 118 370 164 0 295-73 377-183z"/><path fill="url(#el2)" d="m310 311-11-4c4 2 7 3 11 4z"/></svg>`;

/* ── Init on DOM ready ───────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  markActiveNavLink();

  // Inject logo SVG into any [data-eyas-logo] slots
  document.querySelectorAll('[data-eyas-logo]').forEach(el => {
    el.innerHTML = EYAS_LOGO_SVG;
  });
});

/* ── Exports (for use as plain <script> in HTML) ─────────────────────────── */
window.eyasDemo = { getViewportLabel, onNetworkChange, EYAS_VIEWPORTS, EYAS_LOGO_SVG };
