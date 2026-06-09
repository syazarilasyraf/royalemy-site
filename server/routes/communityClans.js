import express from 'express';
import rateLimit from 'express-rate-limit';
import { statements } from '../db.js';
import { fetchFromCR } from '../index.js';
import { log } from '../logger.js';

const router = express.Router();

const VALID_STATUSES = ['pending', 'approved', 'rejected'];

function sanitizeTag(tag) {
  if (!tag) return '';
  return tag.replace('#', '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
}

function sanitizeHtml(input) {
  if (!input || typeof input !== 'string') return input;
  return input.replace(/<[^>]*>/g, '').trim();
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

router.get('/admin', validateAdminKey, (req, res) => {
  try {
    const clans = statements.getAllClans.all();
    res.json({ clans });
  } catch (error) {
    log('error', `Admin failed to fetch clans: ${error.message}`);
    res.status(500).json({ error: 'Failed to fetch clans' });
  }
});

router.post('/admin/:id/approve', validateAdminKey, (req, res) => {
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
    res.json({ message: 'Clan approved', id });
  } catch (error) {
    log('error', `Failed to approve clan: ${error.message}`);
    res.status(500).json({ error: 'Failed to approve clan' });
  }
});

router.post('/admin/:id/reject', validateAdminKey, (req, res) => {
  try {
    const { id } = req.params;
    const clan = statements.getClanById.get(id);
    if (!clan) {
      return res.status(404).json({ error: 'Clan not found' });
    }
    statements.updateClanStatus.run('rejected', id);
    log('success', `Clan ${id} rejected`);
    res.json({ message: 'Clan rejected', id });
  } catch (error) {
    log('error', `Failed to reject clan: ${error.message}`);
    res.status(500).json({ error: 'Failed to reject clan' });
  }
});

router.post('/admin/:id/status', validateAdminKey, (req, res) => {
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
    res.json({ message: `Status updated to ${status}`, id });
  } catch (error) {
    log('error', `Failed to update clan status: ${error.message}`);
    res.status(500).json({ error: 'Failed to update clan status' });
  }
});

router.delete('/admin/:id', validateAdminKey, (req, res) => {
  try {
    const { id } = req.params;
    const clan = statements.getClanById.get(id);
    if (!clan) {
      return res.status(404).json({ error: 'Clan not found' });
    }
    statements.deleteClan.run(id);
    log('success', `Clan ${id} deleted by admin`);
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
