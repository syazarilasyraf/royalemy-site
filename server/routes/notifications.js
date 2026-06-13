import express from 'express';
import rateLimit from 'express-rate-limit';
import { log } from '../logger.js';
import {
  getNotificationsWithReadStatus,
  markNotificationRead,
  markAllNotificationsRead,
  saveGlobalPushSubscription,
  removeGlobalPushSubscription,
  getVapidPublicKey,
  globalPushSubscriptionsEnabled,
  pushConfigured
} from '../services/notifications.js';

const router = express.Router();

// Rate limit for push subscriptions: 10 per hour per IP
const pushSubscribeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: {
    error: 'Too many push subscription requests. Please try again later.',
    retryAfter: 3600
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    log('warn', `Push subscription rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json(options.message);
  }
});

// Public VAPID key
router.get('/vapid-public-key', (req, res) => {
  const publicKey = getVapidPublicKey();
  if (!publicKey) {
    return res.status(503).json({ error: 'Push notifications not configured' });
  }
  res.json({ publicKey });
});

// Site-wide notification feed with read tracking
router.get('/', (req, res) => {
  try {
    const endpoint = req.query.endpoint || '';
    const result = getNotificationsWithReadStatus(endpoint);
    res.set('Cache-Control', 'no-store');
    res.json(result);
  } catch (error) {
    log('error', `Failed to fetch notifications: ${error.message}`);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

router.post('/:notifId/read', (req, res) => {
  try {
    const { notifId } = req.params;
    const { endpoint } = req.body;
    if (!endpoint) {
      return res.status(400).json({ error: 'Endpoint required' });
    }
    markNotificationRead(parseInt(notifId), endpoint);
    res.json({ message: 'Marked as read' });
  } catch (error) {
    log('error', `Failed to mark notification read: ${error.message}`);
    res.status(500).json({ error: 'Failed to mark as read' });
  }
});

router.post('/read-all', (req, res) => {
  try {
    const { endpoint } = req.body;
    if (!endpoint) {
      return res.status(400).json({ error: 'Endpoint required' });
    }
    markAllNotificationsRead(endpoint);
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    log('error', `Failed to mark all read: ${error.message}`);
    res.status(500).json({ error: 'Failed to mark all as read' });
  }
});

// Global (site-wide) push subscription
router.post('/subscribe', pushSubscribeLimiter, (req, res) => {
  if (!globalPushSubscriptionsEnabled) {
    return res.status(503).json({ error: 'Push notifications are temporarily unavailable' });
  }
  try {
    const { endpoint, keys } = req.body;
    if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
      return res.status(400).json({ error: 'Invalid subscription data' });
    }
    saveGlobalPushSubscription({ endpoint, keys });
    log('info', 'New global push subscription');
    res.json({ message: 'Subscribed to site-wide notifications' });
  } catch (error) {
    log('error', `Failed to save global push subscription: ${error.message}`);
    res.status(500).json({ error: 'Failed to subscribe' });
  }
});

router.post('/unsubscribe', (req, res) => {
  if (!globalPushSubscriptionsEnabled) {
    return res.status(503).json({ error: 'Push notifications are temporarily unavailable' });
  }
  try {
    const { endpoint } = req.body;
    if (!endpoint) {
      return res.status(400).json({ error: 'Endpoint required' });
    }
    removeGlobalPushSubscription(endpoint);
    log('info', 'Global push subscription removed');
    res.json({ message: 'Unsubscribed from site-wide notifications' });
  } catch (error) {
    log('error', `Failed to remove global push subscription: ${error.message}`);
    res.status(500).json({ error: 'Failed to unsubscribe' });
  }
});

export default router;
