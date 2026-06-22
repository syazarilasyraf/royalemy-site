export function registerSW() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('[PWA] Service Worker registered:', registration.scope);

          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (!newWorker) return;

            newWorker.addEventListener('statechange', () => {
              // A new service worker is waiting and the page already has an active controller.
              // This means a new version was downloaded while the user was using the app.
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('[PWA] New version available. Refresh to update.');
                window.__pwaUpdateAvailable = true;
                window.__pwaRegistration = registration;
                window.dispatchEvent(new CustomEvent('pwa-update-available', {
                  detail: { registration }
                }));
              }
            });
          });
        })
        .catch((error) => {
          console.error('[PWA] Service Worker registration failed:', error);
        });
    });
  } else {
    console.log('[PWA] Service Workers not supported');
  }
}
