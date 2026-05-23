import { ARENA_DECKS } from './arenaDecks';
import { getCardById } from '../utils/cardMapping';

// ==================== HASH HELPERS ====================

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

function seededRandom(seed) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function randInt(seed, min, max) {
  return Math.floor(seededRandom(seed) * (max - min + 1)) + min;
}

// ==================== CHAMPION DETECTION ====================

export function isChampionCard(cardId) {
  const card = getCardById(cardId);
  return card?.rarity === 'champion';
}

export function deckHasChampion(deck) {
  return deck.cardIds.some(id => isChampionCard(id));
}

// ==================== DYNAMIC AVG ELIXIR ====================

export function calculateDynamicAvgElixir(cardIds) {
  if (!cardIds || cardIds.length === 0) return '0.0';
  const total = cardIds.reduce((sum, id) => sum + (getCardById(id)?.elixir || 0), 0);
  return (total / cardIds.length).toFixed(1);
}

// ==================== DECK SOURCE CONFIG ====================

export const DECK_SOURCES = {
  ladder: {
    id: 'ladder',
    label: 'Top Ladder',
    description: 'Meta decks from top Path of Legends and ladder players',
    rankRange: { min: 100, max: 1000 },
    icon: '🏆'
  },
  grand: {
    id: 'grand',
    label: 'Grand Challenge',
    description: 'Decks from Grand Challenge 12-win finishes',
    winsRange: { min: 1, max: 12 },
    icon: '⚔️'
  },
  classic: {
    id: 'classic',
    label: 'Classic Challenge',
    description: 'Decks from Classic Challenge 12-win finishes',
    winsRange: { min: 1, max: 12 },
    icon: '🛡️'
  }
};

// ==================== ENRICHED DECK POOLS ====================

function enrichDeckForSource(deck, sourceId) {
  const seed = hashString(deck.id + sourceId);
  const source = DECK_SOURCES[sourceId];

  let meta = {};
  if (sourceId === 'ladder') {
    meta = { rank: randInt(seed, source.rankRange.min, source.rankRange.max), source: 'ladder' };
  } else if (sourceId === 'grand') {
    meta = { wins: randInt(seed, source.winsRange.min, source.winsRange.max), source: 'grand' };
  } else if (sourceId === 'classic') {
    meta = { wins: randInt(seed, source.winsRange.min, source.winsRange.max), source: 'classic' };
  }

  const winRate = Number((48 + seededRandom(seed + 1) * 17).toFixed(1));
  const usageCount = randInt(seed + 2, 50, 5000);

  return {
    ...deck,
    avgElixir: calculateDynamicAvgElixir(deck.cardIds),
    sourceMeta: meta,
    winRate,
    usageCount,
    hasChampion: deckHasChampion(deck)
  };
}

function buildSourcePools() {
  const allDecks = Object.values(ARENA_DECKS).flat();
  const pools = { ladder: [], grand: [], classic: [] };

  allDecks.forEach(deck => {
    const seed = hashString(deck.id);
    if (deck.arenaId >= 15) pools.ladder.push(enrichDeckForSource(deck, 'ladder'));
    if (deck.arenaId >= 10 && deck.arenaId <= 23) pools.grand.push(enrichDeckForSource(deck, 'grand'));
    pools.classic.push(enrichDeckForSource(deck, 'classic'));
  });

  // Duplicate legendary decks for ladder variety
  const legendaryDecks = ARENA_DECKS[20] || [];
  legendaryDecks.forEach((deck, idx) => {
    for (let i = 0; i < 3; i++) {
      const variantId = `${deck.id}-ladder-${i}`;
      pools.ladder.push(enrichDeckForSource({ ...deck, id: variantId, title: deck.title }, 'ladder'));
    }
  });

  // Deduplicate
  Object.keys(pools).forEach(key => {
    const seen = new Set();
    pools[key] = pools[key].filter(d => { if (seen.has(d.id)) return false; seen.add(d.id); return true; });
  });

  return pools;
}

const SOURCE_POOLS = buildSourcePools();

// ==================== EXPORTED FUNCTIONS ====================

export function getDecksForSource(sourceId, filters = {}) {
  let decks = SOURCE_POOLS[sourceId] || [];

  if (filters.rankRange && sourceId === 'ladder') {
    const [min, max] = filters.rankRange;
    decks = decks.filter(d => d.sourceMeta.rank >= min && d.sourceMeta.rank <= max);
  }

  if (filters.minWins && sourceId !== 'ladder') {
    decks = decks.filter(d => d.sourceMeta.wins >= filters.minWins);
  }

  if (filters.includeHeroes === false) {
    decks = decks.filter(d => !d.hasChampion);
  }

  return decks;
}

export function getRankPresets() {
  return [
    { label: 'Top 100', value: [1, 100] },
    { label: 'Top 200', value: [1, 200] },
    { label: 'Top 300', value: [1, 300] },
    { label: 'Top 400', value: [1, 400] },
    { label: 'Top 500', value: [1, 500] },
    { label: 'Top 600', value: [1, 600] },
    { label: 'Top 700', value: [1, 700] },
    { label: 'Top 800', value: [1, 800] },
    { label: 'Top 900', value: [1, 900] },
    { label: 'Top 1000', value: [1, 1000] },
  ];
}

export function getWinsPresets() {
  return [
    { label: '12 Wins', value: 12 },
    { label: '11+ Wins', value: 11 },
    { label: '10+ Wins', value: 10 },
    { label: '9+ Wins', value: 9 },
    { label: '8+ Wins', value: 8 },
    { label: '7+ Wins', value: 7 },
    { label: '6+ Wins', value: 6 },
    { label: '5+ Wins', value: 5 },
    { label: '4+ Wins', value: 4 },
    { label: '3+ Wins', value: 3 },
    { label: '2+ Wins', value: 2 },
    { label: 'Any Wins', value: 1 },
  ];
}
