import express from 'express';
import { syncTournamentBattles, getLeaderboard, getStats, getParticipants } from '../services/tournamentLive.js';
import { log } from '../logger.js';
import { validateAdminKey, requirePermission } from '../middleware/auth.js';

const router = express.Router();

function noStoreCache(req, res, next) {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
}

router.use(noStoreCache);

function handleError(res, error, context) {
  log('error', `${context}: ${error.message}`);
  if (error.message === 'Tournament not found') {
    return res.status(404).json({ error: error.message });
  }
  return res.status(500).json({ error: error.message || 'Internal server error' });
}

router.get('/:id/leaderboard', async (req, res) => {
  try {
    const { id } = req.params;
    const limit = Math.min(Math.max(Number(req.query.limit) || 3, 1), 50);
    const data = getLeaderboard(id, limit);
    res.json(data);
  } catch (error) {
    handleError(res, error, 'Leaderboard fetch failed');
  }
});

router.get('/:id/stats', async (req, res) => {
  try {
    const { id } = req.params;
    const data = getStats(id);
    res.json(data);
  } catch (error) {
    handleError(res, error, 'Stats fetch failed');
  }
});

router.get('/:id/participants', async (req, res) => {
  try {
    const { id } = req.params;
    const data = getParticipants(id);
    res.json(data);
  } catch (error) {
    handleError(res, error, 'Participants fetch failed');
  }
});

router.post('/:id/sync-battles', validateAdminKey, requirePermission('tournaments'), async (req, res) => {
  try {
    const { id } = req.params;
    const result = await syncTournamentBattles(id);
    res.json({
      success: true,
      tournament_id: id,
      ...result,
    });
  } catch (error) {
    handleError(res, error, 'Sync battles failed');
  }
});

export default router;
