import express from 'express';
import rateLimit from 'express-rate-limit';
import { statements } from '../db.js';
import { log } from '../logger.js';
import { validateAdminKey, requirePermission, sanitizeHtml } from '../middleware/auth.js';

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

// Rate limit for deck comments: 10 per hour per IP
const commentLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: {
    error: 'You can only post 10 deck comments per hour. Please try again later.',
    retryAfter: 3600
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    log('warn', `Deck comment rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json(options.message);
  }
});

// Rate limit for deck voting: 30 per hour per IP
const voteLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  message: {
    error: 'You can only vote on 30 decks per hour. Please try again later.',
    retryAfter: 3600
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    log('warn', `Deck vote rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json(options.message);
  }
});

// ==================== ADMIN ROUTES ====================

router.get('/admin', validateAdminKey, requirePermission('decks'), (req, res) => {
  try {
    const { search, status } = req.query;
    let decks = statements.getAllCommunityDecks.all();

    if (status && VALID_STATUSES.includes(status)) {
      decks = decks.filter(d => d.status === status);
    }
    if (search) {
      const q = search.toLowerCase();
      decks = decks.filter(d =>
        (d.author_name && d.author_name.toLowerCase().includes(q)) ||
        (d.description && d.description.toLowerCase().includes(q))
      );
    }

    const parsed = decks.map(d => ({
      ...d,
      cardIds: JSON.parse(d.card_ids || '[]'),
      tags: JSON.parse(d.tags || '[]')
    }));
    res.json({ decks: parsed });
  } catch (error) {
    log('error', `Admin failed to fetch community decks: ${error.message}`);
    res.status(500).json({ error: 'Failed to fetch community decks' });
  }
});

// Bulk operations
router.post('/admin/bulk', validateAdminKey, requirePermission('decks'), (req, res) => {
  try {
    const { action, ids } = req.body;
    if (!action || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'action and ids[] are required' });
    }

    const results = [];
    for (const id of ids) {
      try {
        const deck = statements.getCommunityDeckById.get(id);
        if (!deck) {
          results.push({ id, success: false, error: 'Not found' });
          continue;
        }

        if (action === 'approve') {
          if (deck.status !== 'pending') {
            results.push({ id, success: false, error: 'Not pending' });
            continue;
          }
          statements.updateCommunityDeckStatus.run('approved', id);
          log('success', `Community deck ${id} approved (bulk)`);
          results.push({ id, success: true });
        } else if (action === 'reject') {
          statements.updateCommunityDeckStatus.run('rejected', id);
          log('success', `Community deck ${id} rejected (bulk)`);
          results.push({ id, success: true });
        } else if (action === 'delete') {
          statements.deleteCommunityDeck.run(id);
          log('success', `Community deck ${id} deleted (bulk)`);
          results.push({ id, success: true });
        } else if (action === 'status' && req.body.status) {
          if (!VALID_STATUSES.includes(req.body.status)) {
            results.push({ id, success: false, error: 'Invalid status' });
            continue;
          }
          statements.updateCommunityDeckStatus.run(req.body.status, id);
          log('success', `Community deck ${id} status updated to ${req.body.status} (bulk)`);
          results.push({ id, success: true });
        } else {
          results.push({ id, success: false, error: 'Unknown action' });
        }
      } catch (err) {
        results.push({ id, success: false, error: err.message });
      }
    }

    logAdminAction(req, 'bulk', 'deck', ids.join(','), { action, results });
    res.json({ results });
  } catch (error) {
    log('error', `Bulk deck operation failed: ${error.message}`);
    res.status(500).json({ error: 'Bulk operation failed' });
  }
});

router.post('/admin/:id/approve', validateAdminKey, requirePermission('decks'), (req, res) => {
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
    logAdminAction(req, 'approve', 'deck', id, { link: deck.deck_link });
    res.json({ message: 'Deck approved', id });
  } catch (error) {
    log('error', `Failed to approve community deck: ${error.message}`);
    res.status(500).json({ error: 'Failed to approve deck' });
  }
});

router.post('/admin/:id/reject', validateAdminKey, requirePermission('decks'), (req, res) => {
  try {
    const { id } = req.params;
    const deck = statements.getCommunityDeckById.get(id);
    if (!deck) {
      return res.status(404).json({ error: 'Deck not found' });
    }
    statements.updateCommunityDeckStatus.run('rejected', id);
    log('success', `Community deck ${id} rejected`);
    logAdminAction(req, 'reject', 'deck', id, { link: deck.deck_link });
    res.json({ message: 'Deck rejected', id });
  } catch (error) {
    log('error', `Failed to reject community deck: ${error.message}`);
    res.status(500).json({ error: 'Failed to reject deck' });
  }
});

router.post('/admin/:id/status', validateAdminKey, requirePermission('decks'), (req, res) => {
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
    logAdminAction(req, 'status', 'deck', id, { link: deck.deck_link, status });
    res.json({ message: `Status updated to ${status}`, id });
  } catch (error) {
    log('error', `Failed to update community deck status: ${error.message}`);
    res.status(500).json({ error: 'Failed to update deck status' });
  }
});

router.delete('/admin/:id', validateAdminKey, requirePermission('decks'), (req, res) => {
  try {
    const { id } = req.params;
    const deck = statements.getCommunityDeckById.get(id);
    if (!deck) {
      return res.status(404).json({ error: 'Deck not found' });
    }
    statements.deleteCommunityDeck.run(id);
    log('success', `Community deck ${id} deleted by admin`);
    logAdminAction(req, 'delete', 'deck', id, { link: deck.deck_link });
    res.json({ message: 'Deck deleted', id });
  } catch (error) {
    log('error', `Failed to delete community deck: ${error.message}`);
    res.status(500).json({ error: 'Failed to delete deck' });
  }
});

// ==================== PUBLIC ROUTES ====================

router.get('/', (req, res) => {
  try {
    const { sort = 'top' } = req.query;
    let decks = statements.getApprovedCommunityDecks.all();

    // Parse card_ids JSON string back to array
    let parsed = decks.map(d => ({
      ...d,
      cardIds: JSON.parse(d.card_ids || '[]'),
      tags: JSON.parse(d.tags || '[]')
    }));

    if (sort === 'trending') {
      const now = Date.now();
      parsed = parsed.map(d => {
        const hours = Math.max(1, (now - new Date(d.created_at).getTime()) / (1000 * 60 * 60));
        const trendingScore = d.votes / Math.pow(hours + 2, 1.5);
        return { ...d, trendingScore };
      }).sort((a, b) => b.trendingScore - a.trendingScore);
    }
    // 'top' uses the default ORDER BY from the prepared statement

    res.json({ decks: parsed });
  } catch (error) {
    log('error', `Failed to fetch community decks: ${error.message}`);
    res.status(500).json({ error: 'Failed to fetch community decks' });
  }
});

// Public share page for rich social media previews
router.get('/:id/share', (req, res) => {
  try {
    const deck = statements.getCommunityDeckById.get(req.params.id);
    if (!deck || deck.status !== 'approved') {
      return res.status(404).send('<html><body><h1>Deck not found</h1></body></html>');
    }

    const cardIds = JSON.parse(deck.card_ids || '[]');
    const firstCardId = cardIds[0] || '';
    const frontUrl = (process.env.FRONTEND_URL || '').replace(/\/$/, '');
    const shareUrl = `${frontUrl}/communitydecks?deck=${deck.id}`;
    const imageUrl = firstCardId ? `${frontUrl}/cards/${firstCardId}.webp` : `${frontUrl}/android-chrome-512x512.png`;
    const title = `Community Deck by ${deck.author_name || 'Anonymous'} | RoyaleMY`;
    const description = deck.description
      ? sanitizeHtml(deck.description).slice(0, 160)
      : `Check out this community deck on RoyaleMY!`;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <meta name="description" content="${description.replace(/"/g, '&quot;')}">
  <meta property="og:title" content="${title.replace(/"/g, '&quot;')}">
  <meta property="og:description" content="${description.replace(/"/g, '&quot;')}">
  <meta property="og:image" content="${imageUrl}">
  <meta property="og:url" content="${shareUrl}">
  <meta property="og:type" content="website">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${title.replace(/"/g, '&quot;')}">
  <meta name="twitter:description" content="${description.replace(/"/g, '&quot;')}">
  <meta name="twitter:image" content="${imageUrl}">
  <script>window.location.href = "${shareUrl}";</script>
</head>
<body>
  <p>Redirecting to RoyaleMY...</p>
  <p>If you are not redirected, <a href="${shareUrl}">click here</a>.</p>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    log('error', `Failed to generate deck share page: ${error.message}`);
    res.status(500).send('<html><body><h1>Failed to generate share page</h1></body></html>');
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

// Public: get comments for a deck
router.get('/:id/comments', (req, res) => {
  try {
    const deck = statements.getCommunityDeckById.get(req.params.id);
    if (!deck) {
      return res.status(404).json({ error: 'Deck not found' });
    }
    const comments = statements.getDeckComments.all(req.params.id);
    res.json({ comments });
  } catch (error) {
    log('error', `Failed to fetch deck comments: ${error.message}`);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

// Public: add a comment to a deck
router.post('/:id/comments', commentLimiter, (req, res) => {
  try {
    const { id } = req.params;
    const deck = statements.getCommunityDeckById.get(id);
    if (!deck) {
      return res.status(404).json({ error: 'Deck not found' });
    }
    if (deck.status !== 'approved') {
      return res.status(400).json({ error: 'Comments are only allowed on approved decks' });
    }

    let { author_name, comment } = req.body;
    author_name = sanitizeHtml((author_name || '').trim()) || 'Anonymous';
    comment = sanitizeHtml((comment || '').trim());

    if (!comment || comment.length < 2 || comment.length > 500) {
      return res.status(400).json({ error: 'Comment must be between 2 and 500 characters' });
    }

    const result = statements.insertDeckComment.run(id, author_name, comment);
    log('success', `Comment added to deck ${id} by ${author_name}`);
    res.status(201).json({ id: result.lastInsertRowid, message: 'Comment added' });
  } catch (error) {
    log('error', `Failed to add deck comment: ${error.message}`);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

router.post('/:id/vote', voteLimiter, (req, res) => {
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

    // Duplicate detection: same deck link within 1 hour
    const duplicate = statements.checkDuplicateDeck.get(deck_link.trim());
    if (duplicate) {
      return res.status(409).json({ error: 'This deck was already submitted within the last hour.' });
    }

    const result = statements.insertCommunityDeck.run(
      deck_link.trim(),
      JSON.stringify(card_ids),
      sanitizeHtml(author_name) || 'Anonymous',
      sanitizeHtml(description) || '',
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
