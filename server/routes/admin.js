import express from 'express';
import { db, statements } from '../db.js';
import { log, getServerStartTime } from '../logger.js';
import { validateAdminKey } from '../middleware/auth.js';

const router = express.Router();

function logAdminAction(req, action, resource, resourceId, details = null) {
  try {
    const ip = req.ip || req.connection.remoteAddress;
    const detailStr = details ? JSON.stringify(details).slice(0, 500) : null;
    statements.insertAdminAction.run(action, resource, String(resourceId), detailStr, ip);
  } catch (e) {
    log('warn', `Failed to log admin action: ${e.message}`);
  }
}

// ==================== DASHBOARD ====================

router.get('/dashboard', validateAdminKey, (req, res) => {
  try {
    const pendingTournaments = db.prepare(`SELECT COUNT(*) as count FROM community_tournaments WHERE status = 'pending'`).get();
    const pendingClans = db.prepare(`SELECT COUNT(*) as count FROM community_clans WHERE status = 'pending'`).get();
    const pendingDecks = db.prepare(`SELECT COUNT(*) as count FROM community_decks WHERE status = 'pending'`).get();
    const pendingStatePlayers = db.prepare(`SELECT COUNT(*) as count FROM state_players WHERE status = 'pending'`).get();
    const pendingFeatures = db.prepare(`SELECT COUNT(*) as count FROM features WHERE status = 'pending'`).get();

    const totalTournaments = db.prepare(`SELECT COUNT(*) as count FROM community_tournaments`).get();
    const totalClans = db.prepare(`SELECT COUNT(*) as count FROM community_clans`).get();
    const totalDecks = db.prepare(`SELECT COUNT(*) as count FROM community_decks`).get();
    const totalStatePlayers = db.prepare(`SELECT COUNT(*) as count FROM state_players`).get();
    const totalFeatures = db.prepare(`SELECT COUNT(*) as count FROM features`).get();

    res.json({
      pending: {
        tournaments: pendingTournaments?.count || 0,
        clans: pendingClans?.count || 0,
        decks: pendingDecks?.count || 0,
        statePlayers: pendingStatePlayers?.count || 0,
        features: pendingFeatures?.count || 0
      },
      total: {
        tournaments: totalTournaments?.count || 0,
        clans: totalClans?.count || 0,
        decks: totalDecks?.count || 0,
        statePlayers: totalStatePlayers?.count || 0,
        features: totalFeatures?.count || 0
      }
    });
  } catch (error) {
    log('error', `Admin: Failed to fetch dashboard stats: ${error.message}`);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

// ==================== LOGS ====================

router.get('/logs', validateAdminKey, (req, res) => {
  try {
    const { level, search, limit = '100', offset = '0' } = req.query;
    const lim = Math.min(parseInt(limit, 10) || 100, 1000);
    const off = Math.max(parseInt(offset, 10) || 0, 0);

    let logs;
    let total;

    if (level && search) {
      const like = `%${search}%`;
      logs = statements.searchLogsByLevel.all(level, like, lim, off);
      total = db.prepare(`SELECT COUNT(*) as count FROM logs WHERE level = ? AND message LIKE ?`).get(level, like);
    } else if (level) {
      logs = statements.getLogsByLevel.all(level, lim, off);
      total = db.prepare(`SELECT COUNT(*) as count FROM logs WHERE level = ?`).get(level);
    } else if (search) {
      const like = `%${search}%`;
      logs = statements.searchLogs.all(like, lim, off);
      total = db.prepare(`SELECT COUNT(*) as count FROM logs WHERE message LIKE ?`).get(like);
    } else {
      logs = statements.getLogs.all(lim, off);
      total = statements.getLogCount.get();
    }

    res.json({
      logs: logs || [],
      total: total?.count || 0,
      limit: lim,
      offset: off
    });
  } catch (error) {
    log('error', `Admin: Failed to fetch logs: ${error.message}`);
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

// ==================== SERVER INFO ====================

// ==================== AUDIT TRAIL ====================

router.get('/audit-trail', validateAdminKey, (req, res) => {
  try {
    const { resource, limit = '100', offset = '0' } = req.query;
    const lim = Math.min(parseInt(limit, 10) || 100, 1000);
    const off = Math.max(parseInt(offset, 10) || 0, 0);

    let actions;
    let total;

    if (resource) {
      actions = statements.getAdminActionsByResource.all(resource, lim, off);
      total = db.prepare(`SELECT COUNT(*) as count FROM admin_actions WHERE resource = ?`).get(resource);
    } else {
      actions = statements.getAdminActions.all(lim, off);
      total = db.prepare(`SELECT COUNT(*) as count FROM admin_actions`).get();
    }

    res.json({
      actions: actions || [],
      total: total?.count || 0,
      limit: lim,
      offset: off
    });
  } catch (error) {
    log('error', `Admin: Failed to fetch audit trail: ${error.message}`);
    res.status(500).json({ error: 'Failed to fetch audit trail' });
  }
});

// ==================== RATE LIMIT MONITORING ====================

router.get('/rate-limits', validateAdminKey, (req, res) => {
  try {
    // Check recent 429s from logs
    const recent429s = db.prepare(`
      SELECT message, timestamp FROM logs
      WHERE level = 'warn' AND message LIKE '%Rate limit exceeded%'
      ORDER BY id DESC LIMIT 100
    `).all();

    // Count per IP (extracted from message)
    const ipCounts = {};
    for (const row of recent429s) {
      const match = row.message.match(/IP:\s*([\d.]+)/);
      if (match) {
        const ip = match[1];
        ipCounts[ip] = (ipCounts[ip] || 0) + 1;
      }
    }

    const topOffenders = Object.entries(ipCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([ip, count]) => ({ ip, count }));

    res.json({
      recent429Count: recent429s.length,
      topOffenders,
      recentHits: recent429s.slice(0, 20)
    });
  } catch (error) {
    log('error', `Admin: Failed to fetch rate limit stats: ${error.message}`);
    res.status(500).json({ error: 'Failed to fetch rate limit stats' });
  }
});

router.get('/server-info', validateAdminKey, (req, res) => {
  try {
    const mem = process.memoryUsage();
    const uptime = process.uptime();
    const startTime = getServerStartTime();

    res.json({
      uptime: uptime,
      uptimeFormatted: formatUptime(uptime),
      memory: {
        rss: mem.rss,
        heapTotal: mem.heapTotal,
        heapUsed: mem.heapUsed,
        external: mem.external,
        rssMB: Math.round(mem.rss / 1024 / 1024 * 100) / 100,
        heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024 * 100) / 100,
      },
      nodeVersion: process.version,
      platform: process.platform,
      lastRestart: new Date(startTime).toISOString(),
      environment: process.env.NODE_ENV || 'development',
      pid: process.pid
    });
  } catch (error) {
    log('error', `Admin: Failed to fetch server info: ${error.message}`);
    res.status(500).json({ error: 'Failed to fetch server info' });
  }
});

function formatUptime(seconds) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const parts = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(' ');
}

export default router;
