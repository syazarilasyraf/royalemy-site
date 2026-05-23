import { getCardById } from './cardMapping';

// ==================== PLAYER CARD MAP ====================

export function getPlayerCardMap(playerData) {
  if (!playerData?.cards) return {};
  const map = {};
  playerData.cards.forEach(card => {
    const id = typeof card.id === 'number' ? card.id : parseInt(card.id);
    map[id] = {
      level: card.level,
      maxLevel: card.maxLevel,
      count: card.count,
      name: card.name,
      rarity: getCardById(id)?.rarity || 'common'
    };
  });
  return map;
}

// ==================== COMPATIBILITY CALCULATION ====================

export function calculateDeckCompatibility(deck, playerCardMap) {
  if (!playerCardMap || Object.keys(playerCardMap).length === 0) {
    return {
      score: 0,
      owned: 0,
      missing: deck.cardIds,
      avgLevel: '0.0',
      details: deck.cardIds.map(id => ({ cardId: id, owned: false, level: null }))
    };
  }

  let owned = 0;
  let totalLevel = 0;
  const missing = [];
  const details = [];

  deck.cardIds.forEach(cardId => {
    const playerCard = playerCardMap[cardId];
    if (playerCard) {
      owned++;
      totalLevel += playerCard.level;
      details.push({ cardId, owned: true, level: playerCard.level });
    } else {
      missing.push(cardId);
      details.push({ cardId, owned: false, level: null });
    }
  });

  const score = Math.round((owned / deck.cardIds.length) * 100);
  // Avg level includes ALL 8 cards (missing count as 0)
  const avgLevelAll = owned > 0 ? (totalLevel / deck.cardIds.length).toFixed(1) : '0.0';
  // Avg level of owned cards only
  const avgLevelOwned = owned > 0 ? (totalLevel / owned).toFixed(1) : '0.0';

  return { score, owned, missing, avgLevel: avgLevelAll, avgLevelOwned, details };
}

// ==================== SCORING ====================

export function calculateDeckScore(deck, playerCardMap) {
  const compat = calculateDeckCompatibility(deck, playerCardMap);

  let score = compat.score;

  if (compat.score === 100) {
    score += Math.min(parseFloat(compat.avgLevelOwned) * 3, 50);
  }

  score -= compat.missing.length * 8;

  return {
    ...compat,
    finalScore: Math.max(0, Math.min(150, Math.round(score)))
  };
}

export function sortDecks(decks, sortBy, playerCardMap) {
  const scored = decks.map(deck => ({
    ...deck,
    analysis: playerCardMap ? calculateDeckScore(deck, playerCardMap) : null
  }));

  switch (sortBy) {
    case 'compatibility':
      scored.sort((a, b) => (b.analysis?.finalScore || 0) - (a.analysis?.finalScore || 0));
      break;
    case 'winRate':
      scored.sort((a, b) => (b.winRate || 0) - (a.winRate || 0));
      break;
    case 'usage':
      scored.sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0));
      break;
    case 'elixir-asc':
      scored.sort((a, b) => (a.avgElixir || 0) - (b.avgElixir || 0));
      break;
    case 'elixir-desc':
      scored.sort((a, b) => (b.avgElixir || 0) - (a.avgElixir || 0));
      break;
    case 'name':
      scored.sort((a, b) => a.title.localeCompare(b.title));
      break;
    default:
      if (playerCardMap) {
        scored.sort((a, b) => (b.analysis?.finalScore || 0) - (a.analysis?.finalScore || 0));
      } else {
        scored.sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0));
      }
      break;
  }

  return scored;
}

// ==================== COMPATIBILITY COLOR ====================

export function getCompatibilityColor(score) {
  if (score >= 120) return '#00E676';
  if (score >= 100) return '#4CAF50';
  if (score >= 75) return '#8BC34A';
  if (score >= 50) return '#FFC107';
  if (score >= 25) return '#FF9800';
  return '#F44336';
}

export function getCompatibilityLabel(score) {
  if (score >= 120) return 'Perfect Fit';
  if (score >= 100) return 'Ready to Play';
  if (score >= 75) return 'Almost Ready';
  if (score >= 50) return 'Work in Progress';
  if (score >= 25) return 'Needs Upgrades';
  return 'Not Viable';
}
