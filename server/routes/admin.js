import express from 'express';
import { db, statements } from '../db.js';
import { log, getServerStartTime } from '../logger.js';

const router = express.Router();

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
    log('warn', `Invalid admin key attempt on ${req.path} from ${req.ip}`);
    return res.status(403).json({ error: 'Invalid admin key' });
  }
  next();
}

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
