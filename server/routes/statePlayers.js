import express from 'express';
import rateLimit from 'express-rate-limit';
import { statements } from '../db.js';
import { fetchFromCR } from '../services/crApi.js';
import { log } from '../logger.js';
import { validateAdminKey, sanitizeTag, sanitizeHtml } from '../middleware/auth.js';

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
    const { search, status } = req.query;
    let players = statements.getAllStatePlayers.all();

    if (status && VALID_STATUSES.includes(status)) {
      players = players.filter(p => p.status === status);
    }
    if (search) {
      const q = search.toLowerCase();
      players = players.filter(p =>
        (p.player_tag && p.player_tag.toLowerCase().includes(q)) ||
        (p.state_name && p.state_name.toLowerCase().includes(q)) ||
        (p.submitter_name && p.submitter_name.toLowerCase().includes(q))
      );
    }

    res.json({ players });
  } catch (error) {
    log('error', `Admin failed to fetch state players: ${error.message}`);
    res.status(500).json({ error: 'Failed to fetch state players' });
  }
});

// Bulk operations
router.post('/admin/bulk', validateAdminKey, (req, res) => {
  try {
    const { action, ids } = req.body;
    if (!action || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'action and ids[] are required' });
    }

    const results = [];
    for (const id of ids) {
      try {
        const player = statements.getStatePlayerById.get(id);
        if (!player) {
          results.push({ id, success: false, error: 'Not found' });
          continue;
        }

        if (action === 'approve') {
          if (player.status !== 'pending') {
            results.push({ id, success: false, error: 'Not pending' });
            continue;
          }
          statements.updateStatePlayerStatus.run('approved', id);
          log('success', `State player ${id} approved (bulk)`);
          results.push({ id, success: true });
        } else if (action === 'reject') {
          statements.updateStatePlayerStatus.run('rejected', id);
          log('success', `State player ${id} rejected (bulk)`);
          results.push({ id, success: true });
        } else if (action === 'delete') {
          statements.deleteStatePlayer.run(id);
          log('success', `State player ${id} deleted (bulk)`);
          results.push({ id, success: true });
        } else if (action === 'status' && req.body.status) {
          if (!VALID_STATUSES.includes(req.body.status)) {
            results.push({ id, success: false, error: 'Invalid status' });
            continue;
          }
          statements.updateStatePlayerStatus.run(req.body.status, id);
          log('success', `State player ${id} status updated to ${req.body.status} (bulk)`);
          results.push({ id, success: true });
        } else {
          results.push({ id, success: false, error: 'Unknown action' });
        }
      } catch (err) {
        results.push({ id, success: false, error: err.message });
      }
    }

    logAdminAction(req, 'bulk', 'state_player', ids.join(','), { action, results });
    res.json({ results });
  } catch (error) {
    log('error', `Bulk state player operation failed: ${error.message}`);
    res.status(500).json({ error: 'Bulk operation failed' });
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
    logAdminAction(req, 'approve', 'state_player', id, { tag: player.player_tag, state: player.state_name });
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
    logAdminAction(req, 'reject', 'state_player', id, { tag: player.player_tag, state: player.state_name });
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
    logAdminAction(req, 'status', 'state_player', id, { tag: player.player_tag, state: player.state_name, status });
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
    logAdminAction(req, 'delete', 'state_player', id, { tag: player.player_tag, state: player.state_name });
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

    // Duplicate detection
    const duplicate = statements.checkDuplicateStatePlayer.get(cleanTag, state_name.trim());
    if (duplicate) {
      return res.status(409).json({ error: 'This player has already been submitted for this state.' });
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
      sanitizeHtml(state_name),
      sanitizeHtml(submitter_name) || 'Anonymous',
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
