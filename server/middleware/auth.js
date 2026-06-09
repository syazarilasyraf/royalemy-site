import { log } from '../logger.js';

export function getAdminKey() {
  return process.env.ROADMAP_ADMIN_KEY;
}

export function validateAdminKey(req, res, next) {
  const key = req.headers['x-admin-key'] || req.query.key;
  const adminKey = getAdminKey();
  if (!adminKey) {
    return res.status(500).json({ error: 'Admin key not configured on server' });
  }
  if (key !== adminKey) {
    log('warn', `Invalid admin key attempt on ${req.path} from ${req.ip}`, { requestId: req.id });
    return res.status(403).json({ error: 'Invalid admin key' });
  }
  next();
}

export function sanitizeTag(tag) {
  if (!tag) return '';
  return tag.replace('#', '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
}

export function sanitizeHtml(input) {
  if (!input || typeof input !== 'string') return input;
  return input.replace(/<[^>]*>/g, '').trim();
}
