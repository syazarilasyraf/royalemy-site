/**
 * One-time script to normalize all community deck links by removing
 * extra tracking parameters (slots, tt, ev, id, etc.).
 */
import { db } from '../server/db.js';

function extractDeckParam(url) {
  try {
    const urlObj = new URL(url.trim());
    let deckParam = urlObj.searchParams.get('deck');
    if (deckParam) return deckParam;
    const fullQuery = urlObj.search;
    if (fullQuery.includes('deck=')) {
      const match = fullQuery.match(/deck=([^&]+)/);
      if (match) return decodeURIComponent(match[1]);
    }
    return null;
  } catch {
    return null;
  }
}

function isValidDeckLink(url) {
  if (!url || typeof url !== 'string') return false;
  try {
    const urlObj = new URL(url.trim());
    if (!urlObj.hostname.includes('link.clashroyale.com')) return false;
    const deckParam = extractDeckParam(url);
    if (!deckParam) return false;
    const cardIds = deckParam.split(';');
    if (cardIds.length !== 8) return false;
    return cardIds.every(id => /^\d+$/.test(id.trim()));
  } catch {
    return false;
  }
}

function extractCardIds(url) {
  if (!isValidDeckLink(url)) return null;
  const deckParam = extractDeckParam(url);
  if (!deckParam) return null;
  const cardIds = deckParam.split(';').map(id => id.trim());
  return cardIds.length === 8 ? cardIds : null;
}

function normalizeDeckLink(url) {
  if (!url || typeof url !== 'string') return url;
  const trimmed = url.trim();
  const cardIds = extractCardIds(trimmed);
  if (!cardIds || cardIds.length !== 8) return trimmed;
  return `https://link.clashroyale.com/en?clashroyale://copyDeck?deck=${cardIds.join(';')}`;
}

try {
  const decks = db.prepare('SELECT id, deck_link FROM community_decks').all();
  let updated = 0;
  let unchanged = 0;
  let skipped = 0;

  const updateStmt = db.prepare('UPDATE community_decks SET deck_link = ? WHERE id = ?');

  for (const deck of decks) {
    const normalized = normalizeDeckLink(deck.deck_link);
    if (!normalized || normalized === deck.deck_link) {
      unchanged++;
      continue;
    }
    if (!isValidDeckLink(normalized)) {
      console.warn(`Skipping deck ${deck.id}: could not produce valid normalized link from ${deck.deck_link}`);
      skipped++;
      continue;
    }
    updateStmt.run(normalized, deck.id);
    console.log(`Updated deck ${deck.id}:`);
    console.log(`  FROM: ${deck.deck_link}`);
    console.log(`  TO:   ${normalized}`);
    updated++;
  }

  console.log('\n========================================');
  console.log(`Total decks:    ${decks.length}`);
  console.log(`Updated:        ${updated}`);
  console.log(`Unchanged:      ${unchanged}`);
  console.log(`Skipped (invalid): ${skipped}`);
  console.log('========================================');
} catch (error) {
  console.error('Failed to clean deck links:', error);
  process.exit(1);
}
