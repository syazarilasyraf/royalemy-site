import webpush from 'web-push';
import { statements, pushSubscriptionsEnabled, globalPushSubscriptionsEnabled } from '../db.js';
import { log } from '../logger.js';

const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@royalemy.gg';

let pushConfigured = false;
if (vapidPublicKey && vapidPrivateKey) {
  try {
    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
    pushConfigured = true;
  } catch (e) {
    log('warn', `Failed to configure push notifications: ${e.message}`);
  }
}

const DEFAULT_ICON = '/royalemy.png';

/**
 * Create a site-wide notification.
 * @param {Object} opts
 * @param {string} opts.scope - 'tournament' | 'clan' | 'deck' | 'roadmap' | 'global'
 * @param {string} opts.type - notification type/key
 * @param {string} opts.message - body text
 * @param {string} [opts.title] - optional title
 * @param {string} [opts.link] - optional relative link
 * @param {number} [opts.tournamentId]
 * @param {number} [opts.resourceId]
 * @returns {number|null} inserted row id or null
 */
export function createNotification({ scope, type, message, title, link, tournamentId, resourceId }) {
  try {
    const result = statements.insertNotification.run(
      scope || 'global',
      type,
      title || null,
      message,
      tournamentId || null,
      resourceId || null,
      link || null
    );
    return result.lastInsertRowid;
  } catch (e) {
    log('warn', `Failed to create notification: ${e.message}`);
    return null;
  }
}

/**
 * Backwards-compatible wrapper for tournament-only notifications.
 */
export function createTournamentNotification(tournamentId, type, message) {
  return createNotification({
    scope: 'tournament',
    type,
    message,
    tournamentId
  });
}

function buildPayload({ title, body, icon, link, tag, scope = 'global' }) {
  return JSON.stringify({
    title,
    body,
    icon: icon || DEFAULT_ICON,
    tag,
    url: link || '/',
    scope
  });
}

async function sendToSubscriptions(subscriptions, payload, label) {
  if (!subscriptions || subscriptions.length === 0) return { sent: 0, failed: 0 };

  const results = await Promise.allSettled(
    subscriptions.map((sub) =>
      webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth }
        },
        payload
      )
    )
  );

  let sent = 0;
  let failed = 0;
  for (let i = 0; i < results.length; i++) {
    if (results[i].status === 'fulfilled') {
      sent++;
    } else {
      failed++;
      const err = results[i].reason;
      if (err && (err.statusCode === 410 || err.statusCode === 404)) {
        try {
          if (label === 'tournament') {
            statements.deletePushSubscription.run(subscriptions[i].tournament_id, subscriptions[i].endpoint);
          } else {
            statements.deleteGlobalPushSubscription.run(subscriptions[i].endpoint);
          }
        } catch (delErr) {
          log('warn', `Failed to delete expired push subscription: ${delErr.message}`);
        }
      }
    }
  }
  return { sent, failed };
}

/**
 * Send push notifications for a tournament update.
 * Sends to tournament-specific subscribers AND global subscribers (deduped).
 */
export async function sendPushNotifications(tournamentId, title, body, icon = DEFAULT_ICON) {
  if (!pushConfigured || (!pushSubscriptionsEnabled && !globalPushSubscriptionsEnabled)) return { sent: 0, failed: 0 };

  try {
    const tournamentSubs = pushSubscriptionsEnabled
      ? statements.getPushSubscriptionsByTournament.all(tournamentId)
      : [];
    const globalSubs = globalPushSubscriptionsEnabled
      ? statements.getGlobalPushSubscriptions.all()
      : [];

    const endpointSet = new Set();
    const dedupedTournamentSubs = [];
    for (const sub of tournamentSubs) {
      if (!endpointSet.has(sub.endpoint)) {
        endpointSet.add(sub.endpoint);
        dedupedTournamentSubs.push(sub);
      }
    }
    const dedupedGlobalSubs = [];
    for (const sub of globalSubs) {
      if (!endpointSet.has(sub.endpoint)) {
        endpointSet.add(sub.endpoint);
        dedupedGlobalSubs.push(sub);
      }
    }

    const link = `/tournaments?tournament=${tournamentId}`;
    const tag = `tournament-${tournamentId}`;
    const payload = buildPayload({ title, body, icon, link, tag, scope: 'tournament' });

    const tResult = await sendToSubscriptions(dedupedTournamentSubs, payload, 'tournament');
    const gResult = await sendToSubscriptions(dedupedGlobalSubs, payload, 'global');

    const totalSent = tResult.sent + gResult.sent;
    const totalFailed = tResult.failed + gResult.failed;
    log('info', `Push notifications for tournament ${tournamentId}: ${totalSent} sent, ${totalFailed} failed`);
    return { sent: totalSent, failed: totalFailed };
  } catch (e) {
    log('warn', `Failed to send push notifications: ${e.message}`);
    return { sent: 0, failed: 0 };
  }
}

/**
 * Send push notifications to all global subscribers.
 */
export async function sendGlobalPushNotifications(title, body, icon = DEFAULT_ICON, link = '/') {
  if (!pushConfigured || !globalPushSubscriptionsEnabled) return { sent: 0, failed: 0 };

  try {
    const subs = statements.getGlobalPushSubscriptions.all();
    const payload = buildPayload({ title, body, icon, link, tag: 'royalemy-global', scope: 'global' });
    const result = await sendToSubscriptions(subs, payload, 'global');
    log('info', `Global push notifications: ${result.sent} sent, ${result.failed} failed`);
    return result;
  } catch (e) {
    log('warn', `Failed to send global push notifications: ${e.message}`);
    return { sent: 0, failed: 0 };
  }
}

/**
 * Fetch recent notifications enriched with read status for a given endpoint.
 */
export function getNotificationsWithReadStatus(endpoint, limit = 30) {
  if (!statements.getRecentNotifications) return { notifications: [], unreadCount: 0 };

  const notifications = statements.getRecentNotifications.all();
  let unreadCount = 0;
  if (endpoint && statements.getUnreadNotificationCount) {
    unreadCount = statements.getUnreadNotificationCount.get(endpoint).count;
  }

  const enriched = notifications.map(n => ({
    id: n.id,
    scope: n.scope,
    type: n.type,
    title: n.title,
    message: n.message,
    link: n.link,
    tournament_id: n.tournament_id,
    tournament_name: n.tournament_name,
    resource_id: n.resource_id,
    created_at: n.created_at,
    is_read: endpoint ? false : undefined
  }));

  if (endpoint && statements.getNotificationReadsByEndpoint) {
    const readRows = statements.getNotificationReadsByEndpoint.all(endpoint);
    const readSet = new Set(readRows.map(r => r.notification_id));
    enriched.forEach(n => { n.is_read = readSet.has(n.id); });
  }

  return { notifications: enriched, unreadCount };
}

export function markNotificationRead(notificationId, endpoint) {
  if (!statements.markNotificationRead) return false;
  try {
    statements.markNotificationRead.run(parseInt(notificationId), endpoint);
    return true;
  } catch (e) {
    log('warn', `Failed to mark notification read: ${e.message}`);
    return false;
  }
}

export function markAllNotificationsRead(endpoint) {
  if (!statements.markAllNotificationsRead) return false;
  try {
    statements.markAllNotificationsRead.run(endpoint);
    return true;
  } catch (e) {
    log('warn', `Failed to mark all notifications read: ${e.message}`);
    return false;
  }
}

export function saveGlobalPushSubscription({ endpoint, keys }) {
  if (!globalPushSubscriptionsEnabled || !statements.insertGlobalPushSubscription) return false;
  try {
    statements.insertGlobalPushSubscription.run(endpoint, keys.p256dh, keys.auth);
    return true;
  } catch (e) {
    log('warn', `Failed to save global push subscription: ${e.message}`);
    return false;
  }
}

export function removeGlobalPushSubscription(endpoint) {
  if (!globalPushSubscriptionsEnabled || !statements.deleteGlobalPushSubscription) return false;
  try {
    statements.deleteGlobalPushSubscription.run(endpoint);
    return true;
  } catch (e) {
    log('warn', `Failed to remove global push subscription: ${e.message}`);
    return false;
  }
}

export function getVapidPublicKey() {
  return vapidPublicKey || null;
}

export { pushConfigured, pushSubscriptionsEnabled, globalPushSubscriptionsEnabled };
