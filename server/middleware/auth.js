import crypto from 'crypto';
import { log } from '../logger.js';
import { db, statements } from '../db.js';
import { isAllowed } from '../services/rateLimiter.js';

export const ALL_PERMISSIONS = {
  dashboard: true,
  tournaments: true,
  clans: true,
  decks: true,
  roadmap: true,
  notifications: true,
  logs: true,
  audit: true,
  statePlayers: true,
  accessControl: true,
};

export function getAdminKey() {
  return process.env.ROADMAP_ADMIN_KEY;
}

export function hashAdminKey(key) {
  return crypto.createHash('sha256').update(key).digest('hex');
}

export function generateAdminKey() {
  return crypto.randomBytes(32).toString('hex');
}

function constantTimeCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = crypto.createHash('sha256').update(a).digest();
  const bufB = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(bufA, bufB);
}

const ADMIN_AUTH_FAIL_MAX = 10;
const ADMIN_AUTH_FAIL_WINDOW_MINUTES = 10;

function recordFailedAdminAuth(ip) {
  return isAllowed(`admin-auth-fail:${ip}`, ADMIN_AUTH_FAIL_MAX, ADMIN_AUTH_FAIL_WINDOW_MINUTES);
}

export function validateAdminKey(req, res, next) {
  const key = req.headers['x-admin-key'] || req.query.key;
  const adminKey = getAdminKey();

  if (!adminKey) {
    return res.status(500).json({ error: 'Admin key not configured on server' });
  }

  // Super admin always has full permissions
  if (constantTimeCompare(key, adminKey)) {
    req.admin = { isSuper: true, permissions: { ...ALL_PERMISSIONS } };
    return next();
  }

  // Check limited admin keys
  if (key) {
    try {
      const keyHash = hashAdminKey(key);
      const adminKeyRecord = statements.getAdminKeyByHash.get(keyHash);
      if (adminKeyRecord && adminKeyRecord.is_active) {
        let permissions = {};
        try {
          permissions = JSON.parse(adminKeyRecord.permissions || '{}');
        } catch (e) {
          permissions = {};
        }
        req.admin = { isSuper: false, permissions };
        return next();
      }
    } catch (e) {
      log('error', `Admin key lookup failed: ${e.message}`);
    }
  }

  const ip = req.ip || req.connection.remoteAddress;
  if (!recordFailedAdminAuth(ip)) {
    log('warn', `Admin auth failure rate limit exceeded for IP: ${ip}`, { requestId: req.id });
    return res.status(429).json({
      error: 'Too many failed admin key attempts. Please try again later.',
      retryAfter: ADMIN_AUTH_FAIL_WINDOW_MINUTES * 60,
    });
  }

  log('warn', `Invalid admin key attempt on ${req.path} from ${ip}`, { requestId: req.id });
  return res.status(403).json({ error: 'Invalid admin key' });
}

export function requirePermission(permission) {
  return function (req, res, next) {
    if (!req.admin) {
      return res.status(403).json({ error: 'Admin authentication required' });
    }
    if (req.admin.isSuper || req.admin.permissions[permission] === true) {
      return next();
    }
    log('warn', `Permission denied for ${permission} on ${req.path} from ${req.ip}`, { requestId: req.id });
    return res.status(403).json({ error: 'Permission denied' });
  };
}

export function requireSuperAdmin(req, res, next) {
  if (!req.admin) {
    return res.status(403).json({ error: 'Admin authentication required' });
  }
  if (req.admin.isSuper) {
    return next();
  }
  log('warn', `Super admin required on ${req.path} from ${req.ip}`, { requestId: req.id });
  return res.status(403).json({ error: 'Super admin access required' });
}

export function sanitizeTag(tag) {
  if (!tag) return '';
  return tag.replace('#', '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
}

export function sanitizeHtml(input) {
  if (!input || typeof input !== 'string') return input;
  return input.replace(/<[^>]*>/g, '').trim();
}
