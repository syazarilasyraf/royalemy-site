import express from 'express';
import { statements, db } from '../db.js';
import { log } from '../logger.js';
import { validateAdminKey, requirePermission, sanitizeHtml } from '../middleware/auth.js';
import {
  createNotification,
  sendGlobalPushNotifications,
  sendPushNotifications
} from '../services/notifications.js';

const router = express.Router();

const VALID_SCOPES = ['tournament', 'clan', 'deck', 'roadmap', 'global'];

function logAdminAction(req, action, resource, resourceId, details = null) {
  try {
    const ip = req.ip || req.connection.remoteAddress;
    const detailStr = details ? JSON.stringify(details).slice(0, 500) : null;
    statements.insertAdminAction.run(action, resource, String(resourceId), detailStr, ip);
  } catch (e) {
    log('warn', `Failed to log admin action: ${e.message}`);
  }
}

router.get('/', validateAdminKey, requirePermission('notifications'), (req, res) => {
  try {
    const { scope, search, limit = '50', offset = '0' } = req.query;
    const lim = Math.min(parseInt(limit, 10) || 50, 200);
    const off = Math.max(parseInt(offset, 10) || 0, 0);

    let notifications;
    let total;
    if (scope && VALID_SCOPES.includes(scope)) {
      notifications = db.prepare(
        `SELECT * FROM notifications WHERE scope = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`
      ).all(scope, lim, off);
      total = db.prepare('SELECT COUNT(*) as count FROM notifications WHERE scope = ?').get(scope);
    } else if (search) {
      const like = `%${search}%`;
      notifications = db.prepare(
        `SELECT * FROM notifications WHERE message LIKE ? OR title LIKE ? OR type LIKE ? ORDER BY created_at DESC LIMIT ? OFFSET ?`
      ).all(like, like, like, lim, off);
      total = db.prepare(
        `SELECT COUNT(*) as count FROM notifications WHERE message LIKE ? OR title LIKE ? OR type LIKE ?`
      ).get(like, like, like);
    } else {
      notifications = statements.getAllNotifications.all(lim, off);
      total = statements.countNotifications.get();
    }

    res.json({ notifications: notifications || [], total: total?.count || 0, limit: lim, offset: off });
  } catch (error) {
    log('error', `Admin: Failed to fetch notifications: ${error.message}`);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

router.post('/', validateAdminKey, requirePermission('notifications'), async (req, res) => {
  try {
    const {
      scope = 'global',
      type = 'announcement',
      title,
      message,
      link,
      tournament_id,
      resource_id,
      send_push = true
    } = req.body;

    if (!VALID_SCOPES.includes(scope)) {
      return res.status(400).json({ error: `Invalid scope. Must be one of: ${VALID_SCOPES.join(', ')}` });
    }
    if (!message || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const cleanMessage = sanitizeHtml(message.trim());
    const cleanTitle = title ? sanitizeHtml(title.trim()) : null;
    const cleanLink = link ? link.trim() : null;

    // Validate tournament_id if scope is tournament
    if (scope === 'tournament' && tournament_id) {
      const tournament = statements.getTournamentById.get(tournament_id);
      if (!tournament) {
        return res.status(404).json({ error: 'Tournament not found' });
      }
    }

    const notifId = createNotification({
      scope,
      type,
      title: cleanTitle,
      message: cleanMessage,
      link: cleanLink,
      tournamentId: tournament_id ? parseInt(tournament_id) : null,
      resourceId: resource_id ? parseInt(resource_id) : null
    });

    if (!notifId) {
      return res.status(500).json({ error: 'Failed to create notification' });
    }

    // Send push if requested
    let pushResult = { sent: 0, failed: 0 };
    if (send_push) {
      const pushTitle = cleanTitle || 'RoyaleMY Update';
      if (scope === 'tournament' && tournament_id) {
        pushResult = await sendPushNotifications(
          parseInt(tournament_id),
          pushTitle,
          cleanMessage,
          '/royalemy.png'
        );
      } else {
        pushResult = await sendGlobalPushNotifications(
          pushTitle,
          cleanMessage,
          '/royalemy.png',
          cleanLink || '/'
        );
      }
    }

    log('success', `Admin created ${scope} notification ${notifId}`);
    logAdminAction(req, 'create', 'notification', notifId, { scope, type, title: cleanTitle, send_push });
    res.status(201).json({ id: notifId, message: 'Notification created', push: pushResult });
  } catch (error) {
    log('error', `Admin: Failed to create notification: ${error.message}`);
    res.status(500).json({ error: 'Failed to create notification' });
  }
});

router.delete('/:id', validateAdminKey, requirePermission('notifications'), (req, res) => {
  try {
    const { id } = req.params;
    const notification = statements.getNotificationById.get(id);
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    statements.deleteNotification.run(id);
    log('success', `Admin deleted notification ${id}`);
    logAdminAction(req, 'delete', 'notification', id, { scope: notification.scope, type: notification.type });
    res.json({ message: 'Notification deleted', id });
  } catch (error) {
    log('error', `Admin: Failed to delete notification: ${error.message}`);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

router.post('/:id/send-push', validateAdminKey, requirePermission('notifications'), async (req, res) => {
  try {
    const { id } = req.params;
    const notification = statements.getNotificationById.get(id);
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    const title = notification.title || 'RoyaleMY Update';
    let pushResult = { sent: 0, failed: 0 };
    if (notification.scope === 'tournament' && notification.tournament_id) {
      pushResult = await sendPushNotifications(
        notification.tournament_id,
        title,
        notification.message,
        '/royalemy.png'
      );
    } else {
      pushResult = await sendGlobalPushNotifications(
        title,
        notification.message,
        '/royalemy.png',
        notification.link || '/'
      );
    }

    log('success', `Admin resent push for notification ${id}`);
    logAdminAction(req, 'send_push', 'notification', id, { scope: notification.scope, sent: pushResult.sent, failed: pushResult.failed });
    res.json({ message: 'Push sent', push: pushResult });
  } catch (error) {
    log('error', `Admin: Failed to send push: ${error.message}`);
    res.status(500).json({ error: 'Failed to send push' });
  }
});

export default router;
