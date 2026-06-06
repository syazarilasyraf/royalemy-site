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

// Rate limit for submissions: 5 per hour per IP
const submitLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: {
    error: 'You can only submit 5 state entries per hour. Please try again later.',
    retryAfter: 3600
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    log('warn', `State player submit rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json(options.message);
  }
});

// ==================== ADMIN ROUTES ====================

router.get('/admin', validateAdminKey, (req, res) => {
  try {
    const players = statements.getAllStatePlayers.all();
    res.json({ players });
  } catch (error) {
    log('error', `Admin failed to fetch state players: ${error.message}`);
    res.status(500).json({ error: 'Failed to fetch state players' });
  }
});

router.post('/admin/:id/approve', validateAdminKey, (req, res) => {
  try {
    const { id } = req.params;
    const player = statements.getStatePlayerById.get(id);
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }
    if (player.status !== 'pending') {
      return res.status(400).json({ error: 'Player is not pending' });
    }
    statements.updateStatePlayerStatus.run('approved', id);
    log('success', `State player ${id} approved`);
    res.json({ message: 'Player approved', id });
  } catch (error) {
    log('error', `Failed to approve state player: ${error.message}`);
    res.status(500).json({ error: 'Failed to approve player' });
  }
});

router.post('/admin/:id/reject', validateAdminKey, (req, res) => {
  try {
    const { id } = req.params;
    const player = statements.getStatePlayerById.get(id);
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }
    statements.updateStatePlayerStatus.run('rejected', id);
    log('success', `State player ${id} rejected`);
    res.json({ message: 'Player rejected', id });
  } catch (error) {
    log('error', `Failed to reject state player: ${error.message}`);
    res.status(500).json({ error: 'Failed to reject player' });
  }
});

router.post('/admin/:id/status', validateAdminKey, (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    const player = statements.getStatePlayerById.get(id);
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }
    statements.updateStatePlayerStatus.run(status, id);
    log('success', `State player ${id} status updated to ${status}`);
    res.json({ message: `Status updated to ${status}`, id });
  } catch (error) {
    log('error', `Failed to update state player status: ${error.message}`);
    res.status(500).json({ error: 'Failed to update player status' });
  }
});

router.delete('/admin/:id', validateAdminKey, (req, res) => {
  try {
    const { id } = req.params;
    const player = statements.getStatePlayerById.get(id);
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }
    statements.deleteStatePlayer.run(id);
    log('success', `State player ${id} deleted by admin`);
    res.json({ message: 'Player deleted', id });
  } catch (error) {
    log('error', `Failed to delete state player: ${error.message}`);
    res.status(500).json({ error: 'Failed to delete player' });
  }
});

// ==================== PUBLIC ROUTES ====================

router.get('/', (req, res) => {
  try {
    const players = statements.getApprovedStatePlayers.all();
    res.json({ players });
  } catch (error) {
    log('error', `Failed to fetch state players: ${error.message}`);
    res.status(500).json({ error: 'Failed to fetch state players' });
  }
});

router.get('/:id', (req, res) => {
  try {
    const player = statements.getStatePlayerById.get(req.params.id);
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }
    res.json({ player });
  } catch (error) {
    log('error', `Failed to fetch state player: ${error.message}`);
    res.status(500).json({ error: 'Failed to fetch player' });
  }
});

router.post('/', submitLimiter, async (req, res) => {
  try {
    const { player_tag, state_name, submitter_name } = req.body;

    if (!player_tag || !state_name) {
      return res.status(400).json({ error: 'Player tag and state name are required' });
    }

    const cleanTag = sanitizeTag(player_tag);
    if (!cleanTag || cleanTag.length < 3) {
      return res.status(400).json({ error: 'Invalid player tag' });
    }

    // Fetch player data from Clash Royale API
    let playerData;
    try {
      playerData = await fetchFromCR(`/players/%23${cleanTag}`, `state-player-${cleanTag}`, 60);
    } catch (error) {
      return res.status(400).json({ error: 'Could not find player with that tag. Please check and try again.' });
    }

    const result = statements.insertStatePlayer.run(
      cleanTag,
      state_name.trim(),
      (submitter_name || 'Anonymous').trim(),
      playerData.trophies || 0,
      playerData.rank || null,
      'pending'
    );

    log('success', `State player submitted: ${playerData.name} in ${state_name} (ID: ${result.lastInsertRowid})`);
    res.status(201).json({ id: result.lastInsertRowid, message: 'State player submitted for review' });
  } catch (error) {
    log('error', `Failed to submit state player: ${error.message}`);
    res.status(500).json({ error: 'Failed to submit state player' });
  }
});

export default router;
