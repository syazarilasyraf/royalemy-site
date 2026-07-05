import express from 'express';
import rateLimit from 'express-rate-limit';
import { statements } from '../db.js';
import { fetchFromCR } from '../services/crApi.js';
import { log } from '../logger.js';
import { validateAdminKey, requirePermission, sanitizeTag, sanitizeHtml } from '../middleware/auth.js';

const router = express.Router();

const VALID_STATUSES = ['pending', 'approved', 'rejected'];

function logAdminAction(req, action, resource, resourceId, details = null) {
  try {
    const ip = req.ip || req.connection.remoteAddress;
    const detailStr = details ? JSON.stringify(details).slice(0, 500) : null;
    statements.insertAdminAction.run(action, resource, String(resourceId), detailStr, ip);
  } catch (e) {
    log('warn', `Failed to log admin action: ${e.message}`);
  }
}

// Rate limit for clan submissions: 3 per hour per IP
const submitLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: {
    error: 'You can only submit 3 clans per hour. Please try again later.',
    retryAfter: 3600
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    log('warn', `Clan submit rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json(options.message);
  }
});

// ==================== ADMIN ROUTES (must be before /:id) ====================

router.get('/admin', validateAdminKey, requirePermission('clans'), (req, res) => {
  try {
    const { search, status } = req.query;
    let clans = statements.getAllClans.all();

    if (status && VALID_STATUSES.includes(status)) {
      clans = clans.filter(c => c.status === status);
    }
    if (search) {
      const q = search.toLowerCase();
      clans = clans.filter(c =>
        (c.name && c.name.toLowerCase().includes(q)) ||
        (c.clan_tag && c.clan_tag.toLowerCase().includes(q)) ||
        (c.leader_name && c.leader_name.toLowerCase().includes(q))
      );
    }

    res.json({ clans });
  } catch (error) {
    log('error', `Admin failed to fetch clans: ${error.message}`);
    res.status(500).json({ error: 'Failed to fetch clans' });
  }
});

// Bulk operations
router.post('/admin/bulk', validateAdminKey, requirePermission('clans'), (req, res) => {
  try {
    const { action, ids } = req.body;
    if (!action || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'action and ids[] are required' });
    }

    const results = [];
    for (const id of ids) {
      try {
        const clan = statements.getClanById.get(id);
        if (!clan) {
          results.push({ id, success: false, error: 'Not found' });
          continue;
        }

        if (action === 'approve') {
          if (clan.status !== 'pending') {
            results.push({ id, success: false, error: 'Not pending' });
            continue;
          }
          statements.updateClanStatus.run('approved', id);
          log('success', `Clan ${id} approved (bulk)`);
          results.push({ id, success: true });
        } else if (action === 'reject') {
          statements.updateClanStatus.run('rejected', id);
          log('success', `Clan ${id} rejected (bulk)`);
          results.push({ id, success: true });
        } else if (action === 'delete') {
          statements.deleteClan.run(id);
          log('success', `Clan ${id} deleted (bulk)`);
          results.push({ id, success: true });
        } else if (action === 'status' && req.body.status) {
          if (!VALID_STATUSES.includes(req.body.status)) {
            results.push({ id, success: false, error: 'Invalid status' });
            continue;
          }
          statements.updateClanStatus.run(req.body.status, id);
          log('success', `Clan ${id} status updated to ${req.body.status} (bulk)`);
          results.push({ id, success: true });
        } else {
          results.push({ id, success: false, error: 'Unknown action' });
        }
      } catch (err) {
        results.push({ id, success: false, error: err.message });
      }
    }

    logAdminAction(req, 'bulk', 'clan', ids.join(','), { action, results });
    res.json({ results });
  } catch (error) {
    log('error', `Bulk clan operation failed: ${error.message}`);
    res.status(500).json({ error: 'Bulk operation failed' });
  }
});

router.post('/admin/:id/approve', validateAdminKey, requirePermission('clans'), (req, res) => {
  try {
    const { id } = req.params;
    const clan = statements.getClanById.get(id);
    if (!clan) {
      return res.status(404).json({ error: 'Clan not found' });
    }
    if (clan.status !== 'pending') {
      return res.status(400).json({ error: 'Clan is not pending' });
    }
    statements.updateClanStatus.run('approved', id);
    log('success', `Clan ${id} approved`);
    logAdminAction(req, 'approve', 'clan', id, { name: clan.name });
    res.json({ message: 'Clan approved', id });
  } catch (error) {
    log('error', `Failed to approve clan: ${error.message}`);
    res.status(500).json({ error: 'Failed to approve clan' });
  }
});

router.post('/admin/:id/reject', validateAdminKey, requirePermission('clans'), (req, res) => {
  try {
    const { id } = req.params;
    const clan = statements.getClanById.get(id);
    if (!clan) {
      return res.status(404).json({ error: 'Clan not found' });
    }
    statements.updateClanStatus.run('rejected', id);
    log('success', `Clan ${id} rejected`);
    logAdminAction(req, 'reject', 'clan', id, { name: clan.name });
    res.json({ message: 'Clan rejected', id });
  } catch (error) {
    log('error', `Failed to reject clan: ${error.message}`);
    res.status(500).json({ error: 'Failed to reject clan' });
  }
});

router.post('/admin/:id/status', validateAdminKey, requirePermission('clans'), (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    const clan = statements.getClanById.get(id);
    if (!clan) {
      return res.status(404).json({ error: 'Clan not found' });
    }
    statements.updateClanStatus.run(status, id);
    log('success', `Clan ${id} status updated to ${status}`);
    logAdminAction(req, 'status', 'clan', id, { name: clan.name, status });
    res.json({ message: `Status updated to ${status}`, id });
  } catch (error) {
    log('error', `Failed to update clan status: ${error.message}`);
    res.status(500).json({ error: 'Failed to update clan status' });
  }
});

router.delete('/admin/:id', validateAdminKey, requirePermission('clans'), (req, res) => {
  try {
    const { id } = req.params;
    const clan = statements.getClanById.get(id);
    if (!clan) {
      return res.status(404).json({ error: 'Clan not found' });
    }
    statements.deleteClan.run(id);
    log('success', `Clan ${id} deleted by admin`);
    logAdminAction(req, 'delete', 'clan', id, { name: clan.name });
    res.json({ message: 'Clan deleted', id });
  } catch (error) {
    log('error', `Failed to delete clan: ${error.message}`);
    res.status(500).json({ error: 'Failed to delete clan' });
  }
});

// ==================== PUBLIC ROUTES ====================

router.get('/', (req, res) => {
  try {
    const clans = statements.getApprovedClans.all();
    res.json({ clans });
  } catch (error) {
    log('error', `Failed to fetch clans: ${error.message}`);
    res.status(500).json({ error: 'Failed to fetch clans' });
  }
});

router.get('/:id', (req, res) => {
  try {
    const clan = statements.getClanById.get(req.params.id);
    if (!clan) {
      return res.status(404).json({ error: 'Clan not found' });
    }
    res.json({ clan });
  } catch (error) {
    log('error', `Failed to fetch clan: ${error.message}`);
    res.status(500).json({ error: 'Failed to fetch clan' });
  }
});

router.post('/', submitLimiter, async (req, res) => {
  try {
    const { clan_tag } = req.body;

    if (!clan_tag) {
      return res.status(400).json({ error: 'Clan tag is required' });
    }

    const cleanTag = sanitizeTag(clan_tag);
    if (!cleanTag || cleanTag.length < 3) {
      return res.status(400).json({ error: 'Invalid clan tag' });
    }

    // Duplicate detection
    const duplicate = statements.checkDuplicateClan.get(cleanTag);
    if (duplicate) {
      return res.status(409).json({ error: 'This clan has already been submitted.' });
    }

    // Fetch clan data from Clash Royale API
    let clanData;
    try {
      clanData = await fetchFromCR(`/clans/%23${cleanTag}`, `community-clan-${cleanTag}`, 60);
    } catch (error) {
      return res.status(400).json({ error: 'Could not find clan with that tag. Please check and try again.' });
    }

    const result = statements.insertClan.run(
      sanitizeHtml(clanData.name) || '',
      cleanTag,
      sanitizeHtml(clanData.description) || '',
      'Unknown',
      '',
      clanData.requiredTrophies || null,
      clanData.members || null,
      '',
      'pending'
    );

    log('success', `Clan submitted: ${clanData.name} (ID: ${result.lastInsertRowid})`);
    res.status(201).json({ id: result.lastInsertRowid, message: 'Clan submitted for review' });
  } catch (error) {
    log('error', `Failed to submit clan: ${error.message}`);
    res.status(500).json({ error: 'Failed to submit clan' });
  }
});

export default router;
