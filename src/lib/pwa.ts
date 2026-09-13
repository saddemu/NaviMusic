/**
 * Service worker registration.
 *
 * The worker exists to make the app installable and to let it cold-start
 * without the network; it never caches anything belonging to the Navidrome
 * server. See `public/sw.js`.
 */
export function registerServiceWorker(): void {
  if (!('serviceWorker' in navigator)) return;

  if (!import.meta.env.PROD) {
    // A worker left over from a production build on the same origin would
    // serve stale assets over the dev server. Clear them out instead.
    navigator.serviceWorker
      .getRegistrations()
      .then((regs) => regs.forEach((r) => r.unregister()))
      .catch(() => {});
    return;
  }

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((registration) => {
        // A worker that finished installing while an older one is in control
        // is told to take over; without this the update waits for every tab
        // to close, which on a home-screen PWA can be never.
        const promote = () => {
          const waiting = registration.waiting;
          if (waiting) waiting.postMessage('skip-waiting');
        };
        promote();
        registration.addEventListener('updatefound', () => {
          registration.installing?.addEventListener('statechange', promote);
        });
      })
      .catch(() => {});
  });
}
