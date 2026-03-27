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

window.eyasDemo = {
  getViewportLabel,
  onNetworkChange,
  EYAS_VIEWPORTS
};
