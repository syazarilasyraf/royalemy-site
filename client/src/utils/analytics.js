const UMAMI_SCRIPT_URL = 'https://cloud.umami.is/script.js';
const UMAMI_WEBSITE_ID = '088844d8-4101-4c4f-8b66-26ec698b83e9';

/**
 * Inject the Umami analytics script in production only.
 *
 * Conditions:
 * - Must be a production build (import.meta.env.PROD).
 * - Must be served from the canonical production domain (royalemy.com).
 *   Deploy previews and local dev are excluded by the hostname check.
 *
 * Umami automatically tracks SPA route changes via the History API, so no
 * manual router integration or pageview calls are needed here. Adding them
 * would double-count page views.
 */
export function initAnalytics() {
  if (!import.meta.env.PROD) return;
  if (typeof window === 'undefined') return;
  if (window.location.hostname !== 'royalemy.com') return;
  if (document.querySelector(`script[data-website-id="${UMAMI_WEBSITE_ID}"]`)) return;

  const script = document.createElement('script');
  script.defer = true;
  script.src = UMAMI_SCRIPT_URL;
  script.setAttribute('data-website-id', UMAMI_WEBSITE_ID);
  document.head.appendChild(script);
}

/**
 * Track a custom Umami event.
 *
 * @param {string} name - Event name.
 * @param {object} [data] - Optional event data payload.
 *
 * Silently no-ops when:
 * - The user is on an admin or live route.
 * - Umami is blocked by an ad blocker or has not loaded.
 */
export function trackEvent(name, data) {
  if (typeof window === 'undefined') return;

  const pathname = window.location.pathname;
  if (pathname.startsWith('/admin') || pathname.startsWith('/live')) return;

  if (typeof window.umami?.track === 'function') {
    try {
      window.umami.track(name, data);
    } catch {
      // Ignore if Umami is unavailable or blocked.
    }
  }
}
