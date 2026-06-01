import express from 'express';
import webpush from 'web-push';
import { statements } from '../db.js';

const router = express.Router();

// Configure web-push
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@royalemy.gg';

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
}

function log(level, message, data = null) {
  const timestamp = new Date().toISOString();
  const prefix = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : level === 'success' ? '✅' : '📡';
  if (data) {
    console.log(`${prefix} [${timestamp}] ${message}`, data);
  } else {
    console.log(`${prefix} [${timestamp}] ${message}`);
  }
}

function getAdminKey() {
  return process.env.ROADMAP_ADMIN_KEY;
}

function validateAdminKey(req, res, next) {
  const key = req.query.key;
  const adminKey = getAdminKey();
  if (!adminKey) {
    return res.status(500).json({ error: 'Admin key not configured on server' });
  }
  if (key !== adminKey) {
    log('warn', `Invalid admin key attempt from ${req.ip}`);
    return res.status(403).json({ error: 'Invalid admin key' });
  }
  next();
}

// ==================== PUBLIC ROUTES ====================

// List approved upcoming tournaments
router.get('/', (req, res) => {
  try {
    const tournaments = statements.getApprovedTournaments.all();
    res.json({ tournaments });
  } catch (error) {
    log('error', `Failed to fetch tournaments: ${error.message}`);
    res.status(500).json({ error: 'Failed to fetch tournaments' });
  }
});

// Submit a new tournament
router.post('/', (req, res) => {
  try {
    const {
      name,
      description,
      host_name,
      tournament_tag,
      start_date,
      end_date,
      format,
      max_players,
      prize,
      discord_link,
      contact_info
    } = req.body;

    if (!name || !host_name || !start_date) {
      return res.status(400).json({ error: 'Name, host name, and start date are required' });
    }

    const startDate = new Date(start_date);
    if (isNaN(startDate.getTime())) {
      return res.status(400).json({ error: 'Invalid start date' });
    }

    const result = statements.insertTournament.run(
      name,
      description || '',
      host_name,
      tournament_tag || '',
      start_date,
      end_date || null,
      format || '1v1',
      max_players ? parseInt(max_players) : null,
      prize || '',
      discord_link || '',
      contact_info || '',
      'pending'
    );

    log('success', `Tournament submitted: ${name} (ID: ${result.lastInsertRowid})`);
    res.status(201).json({
      id: result.lastInsertRowid,
      message: 'Tournament submitted for review'
    });
  } catch (error) {
    log('error', `Failed to submit tournament: ${error.message}`);
    res.status(500).json({ error: 'Failed to submit tournament' });
  }
});

// Save push subscription
router.post('/subscribe', (req, res) => {
  try {
    const { endpoint, keys } = req.body;
    if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
      return res.status(400).json({ error: 'Invalid subscription data' });
    }

    statements.insertSubscription.run(endpoint, keys.p256dh, keys.auth);
    log('success', `New push subscription added`);
    res.json({ message: 'Subscribed successfully' });
  } catch (error) {
    log('error', `Failed to save subscription: ${error.message}`);
    res.status(500).json({ error: 'Failed to save subscription' });
  }
});

// Remove push subscription
router.post('/unsubscribe', (req, res) => {
  try {
    const { endpoint } = req.body;
    if (!endpoint) {
      return res.status(400).json({ error: 'Endpoint required' });
    }

    statements.deleteSubscription.run(endpoint);
    log('success', `Push subscription removed`);
    res.json({ message: 'Unsubscribed successfully' });
  } catch (error) {
    log('error', `Failed to remove subscription: ${error.message}`);
    res.status(500).json({ error: 'Failed to remove subscription' });
  }
});

// ==================== ADMIN ROUTES ====================

// List all tournaments (admin)
router.get('/admin', validateAdminKey, (req, res) => {
  try {
    const tournaments = statements.getAllTournaments.all();
    res.json({ tournaments });
  } catch (error) {
    log('error', `Admin failed to fetch tournaments: ${error.message}`);
    res.status(500).json({ error: 'Failed to fetch tournaments' });
  }
});

// Approve tournament
router.post('/:id/approve', validateAdminKey, (req, res) => {
  try {
    const { id } = req.params;
    const tournament = statements.getTournamentById.get(id);
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    statements.updateTournamentStatus.run('approved', id);
    log('success', `Tournament ${id} approved`);
    res.json({ message: 'Tournament approved', id });
  } catch (error) {
    log('error', `Failed to approve tournament: ${error.message}`);
    res.status(500).json({ error: 'Failed to approve tournament' });
  }
});

// Reject tournament
router.post('/:id/reject', validateAdminKey, (req, res) => {
  try {
    const { id } = req.params;
    const tournament = statements.getTournamentById.get(id);
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    statements.updateTournamentStatus.run('rejected', id);
    log('success', `Tournament ${id} rejected`);
    res.json({ message: 'Tournament rejected', id });
  } catch (error) {
    log('error', `Failed to reject tournament: ${error.message}`);
    res.status(500).json({ error: 'Failed to reject tournament' });
  }
});

// ==================== PUSH NOTIFICATIONS ====================

async function sendPushNotification(subscription, payload) {
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    return true;
  } catch (error) {
    if (error.statusCode === 410 || error.statusCode === 404) {
      // Subscription expired or invalid
      statements.deleteSubscriptionByEndpoint.run(subscription.endpoint);
      log('warn', `Removed expired subscription: ${subscription.endpoint.slice(0, 50)}...`);
    } else {
      log('error', `Push send failed: ${error.message}`);
    }
    return false;
  }
}

async function checkAndSendNotifications() {
  if (!vapidPublicKey || !vapidPrivateKey) {
    return;
  }

  try {
    // 24-hour notifications
    const tournaments24h = statements.getUpcomingTournamentsForNotify.all();
    if (tournaments24h.length > 0) {
      const subscriptions = statements.getAllSubscriptions.all();
      if (subscriptions.length > 0) {
        for (const tournament of tournaments24h) {
          const payload = {
            title: '⏰ Tournament Starting Soon!',
            body: `${tournament.name} starts in less than 24 hours!`,
          };

          let sent = 0;
          for (const sub of subscriptions) {
            const success = await sendPushNotification({
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth }
            }, payload);
            if (success) sent++;
          }

          statements.updateTournamentNotified.run(1, tournament.notified_1h, tournament.id);
          log('success', `Sent 24h notification for "${tournament.name}" to ${sent}/${subscriptions.length} subscribers`);
        }
      }
    }

    // 1-hour notifications
    const tournaments1h = statements.getSoonTournamentsForNotify.all();
    if (tournaments1h.length > 0) {
      const subscriptions = statements.getAllSubscriptions.all();
      if (subscriptions.length > 0) {
        for (const tournament of tournaments1h) {
          const payload = {
            title: '🏆 Tournament Starting Soon!',
            body: `${tournament.name} starts in less than 1 hour! Get ready!`,
          };

          let sent = 0;
          for (const sub of subscriptions) {
            const success = await sendPushNotification({
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth }
            }, payload);
            if (success) sent++;
          }

          statements.updateTournamentNotified.run(tournament.notified_24h, 1, tournament.id);
          log('success', `Sent 1h notification for "${tournament.name}" to ${sent}/${subscriptions.length} subscribers`);
        }
      }
    }
  } catch (error) {
    log('error', `Notification check failed: ${error.message}`);
  }
}

// Start the notification scheduler
export function startNotificationScheduler() {
  if (!vapidPublicKey || !vapidPrivateKey) {
    log('warn', 'VAPID keys not configured. Push notifications disabled.');
    return;
  }

  log('success', 'Push notification scheduler started (checks every 15 minutes)');
  checkAndSendNotifications(); // Check immediately on start

  setInterval(() => {
    checkAndSendNotifications();
  }, 15 * 60 * 1000); // 15 minutes
}

export default router;
