import express from 'express';
import rateLimit from 'express-rate-limit';
import { statements } from '../db.js';
import { log } from '../logger.js';

const router = express.Router();

const VALID_STATUSES = ['pending', 'approved', 'rejected'];

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

// Rate limit for deck submissions: 5 per hour per IP
const submitLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: {
    error: 'You can only submit 5 decks per hour. Please try again later.',
    retryAfter: 3600
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    log('warn', `Community deck submit rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json(options.message);
  }
});

// ==================== ADMIN ROUTES ====================

router.get('/admin', validateAdminKey, (req, res) => {
  try {
    const decks = statements.getAllCommunityDecks.all();
    res.json({ decks });
  } catch (error) {
    log('error', `Admin failed to fetch community decks: ${error.message}`);
    res.status(500).json({ error: 'Failed to fetch community decks' });
  }
});

router.post('/admin/:id/approve', validateAdminKey, (req, res) => {
  try {
    const { id } = req.params;
    const deck = statements.getCommunityDeckById.get(id);
    if (!deck) {
      return res.status(404).json({ error: 'Deck not found' });
    }
    if (deck.status !== 'pending') {
      return res.status(400).json({ error: 'Deck is not pending' });
    }
    statements.updateCommunityDeckStatus.run('approved', id);
    log('success', `Community deck ${id} approved`);
    res.json({ message: 'Deck approved', id });
  } catch (error) {
    log('error', `Failed to approve community deck: ${error.message}`);
    res.status(500).json({ error: 'Failed to approve deck' });
  }
});

router.post('/admin/:id/reject', validateAdminKey, (req, res) => {
  try {
    const { id } = req.params;
    const deck = statements.getCommunityDeckById.get(id);
    if (!deck) {
      return res.status(404).json({ error: 'Deck not found' });
    }
    statements.updateCommunityDeckStatus.run('rejected', id);
    log('success', `Community deck ${id} rejected`);
    res.json({ message: 'Deck rejected', id });
  } catch (error) {
    log('error', `Failed to reject community deck: ${error.message}`);
    res.status(500).json({ error: 'Failed to reject deck' });
  }
});

router.post('/admin/:id/status', validateAdminKey, (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    const deck = statements.getCommunityDeckById.get(id);
    if (!deck) {
      return res.status(404).json({ error: 'Deck not found' });
    }
    statements.updateCommunityDeckStatus.run(status, id);
    log('success', `Community deck ${id} status updated to ${status}`);
    res.json({ message: `Status updated to ${status}`, id });
  } catch (error) {
    log('error', `Failed to update community deck status: ${error.message}`);
    res.status(500).json({ error: 'Failed to update deck status' });
  }
});

router.delete('/admin/:id', validateAdminKey, (req, res) => {
  try {
    const { id } = req.params;
    const deck = statements.getCommunityDeckById.get(id);
    if (!deck) {
      return res.status(404).json({ error: 'Deck not found' });
    }
    statements.deleteCommunityDeck.run(id);
    log('success', `Community deck ${id} deleted by admin`);
    res.json({ message: 'Deck deleted', id });
  } catch (error) {
    log('error', `Failed to delete community deck: ${error.message}`);
    res.status(500).json({ error: 'Failed to delete deck' });
  }
});

// ==================== PUBLIC ROUTES ====================

router.get('/', (req, res) => {
  try {
    const decks = statements.getApprovedCommunityDecks.all();
    // Parse card_ids JSON string back to array
    const parsed = decks.map(d => ({
      ...d,
      cardIds: JSON.parse(d.card_ids || '[]'),
      tags: JSON.parse(d.tags || '[]')
    }));
    res.json({ decks: parsed });
  } catch (error) {
    log('error', `Failed to fetch community decks: ${error.message}`);
    res.status(500).json({ error: 'Failed to fetch community decks' });
  }
});

router.get('/:id', (req, res) => {
  try {
    const deck = statements.getCommunityDeckById.get(req.params.id);
    if (!deck) {
      return res.status(404).json({ error: 'Deck not found' });
    }
    res.json({
      deck: {
        ...deck,
        cardIds: JSON.parse(deck.card_ids || '[]'),
        tags: JSON.parse(deck.tags || '[]')
      }
    });
  } catch (error) {
    log('error', `Failed to fetch community deck: ${error.message}`);
    res.status(500).json({ error: 'Failed to fetch deck' });
  }
});

router.post('/:id/vote', (req, res) => {
  try {
    const { id } = req.params;
    const deck = statements.getCommunityDeckById.get(id);
    if (!deck) {
      return res.status(404).json({ error: 'Deck not found' });
    }
    statements.voteCommunityDeck.run(id);
    log('success', `Community deck ${id} voted`);
    res.json({ message: 'Vote recorded', id });
  } catch (error) {
    log('error', `Failed to vote community deck: ${error.message}`);
    res.status(500).json({ error: 'Failed to vote' });
  }
});

router.post('/', submitLimiter, (req, res) => {
  try {
    const { deck_link, card_ids, author_name, description, avg_elixir, tags } = req.body;

    if (!deck_link || !card_ids || !Array.isArray(card_ids) || card_ids.length !== 8) {
      return res.status(400).json({ error: 'Valid deck link with 8 cards is required' });
    }

    const result = statements.insertCommunityDeck.run(
      deck_link.trim(),
      JSON.stringify(card_ids),
      (author_name || 'Anonymous').trim(),
      (description || '').trim(),
      avg_elixir || null,
      JSON.stringify(tags || []),
      0,
      'approved'
    );

    log('success', `Community deck submitted by ${author_name || 'Anonymous'} (ID: ${result.lastInsertRowid})`);
    res.status(201).json({ id: result.lastInsertRowid, message: 'Deck submitted successfully' });
  } catch (error) {
    log('error', `Failed to submit community deck: ${error.message}`);
    res.status(500).json({ error: 'Failed to submit deck' });
  }
});

export default router;
