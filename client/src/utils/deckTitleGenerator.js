import { getCardById } from './cardMapping';

// ==================== CARD CATEGORIES ====================

const WIN_CONDITIONS = new Set([
  'Hog Rider', 'Balloon', 'Graveyard', 'Miner', 'Goblin Barrel',
  'Battle Ram', 'Ram Rider', 'Royal Giant', 'Giant', 'Golem',
  'Electro Giant', 'Goblin Giant', 'Lava Hound', 'X-Bow', 'Mortar',
  'Wall Breakers', 'Skeleton Barrel', 'Royal Hogs', 'Three Musketeers',
  'Sparky', 'Goblin Drill', 'Elixir Golem'
]);

const CHAMPIONS = new Set([
  'Skeleton King', 'Archer Queen', 'Golden Knight', 'Monk', 'Little Prince'
]);

const KEY_SPELLS = new Set([
  'Poison', 'Fireball', 'Rocket', 'Lightning', 'Earthquake',
  'Freeze', 'Rage', 'Tornado', 'Zap', 'The Log', 'Giant Snowball',
  'Barbarian Barrel', 'Arrows'
]);

const KEY_BUILDINGS = new Set([
  'Tesla', 'Cannon', 'Inferno Tower', 'Bomb Tower',
  'Tombstone', 'Furnace', 'Goblin Hut', 'Barbarian Hut', 'Mortar', 'X-Bow'
]);

const SIGNATURE_TROOPS = new Set([
  'P.E.K.K.A', 'Mega Knight', 'Bandit', 'Dark Prince', 'Lumberjack',
  'Night Witch', 'Inferno Dragon', 'Magic Archer', 'Ice Wizard',
  'Electro Wizard', 'Fisherman', 'Hunter', 'Executioner', 'Bowler',
  'Prince', 'Mini P.E.K.K.A', 'Valkyrie', 'Musketeer', 'Wizard',
  'Witch', 'Baby Dragon', 'Skeleton Dragons', 'Electro Dragon',
  'Phoenix', 'Mighty Miner', 'Goblin Cage', 'Cannon Cart',
  'Rascals', 'Flying Machine', 'Zappies', 'Royal Ghost',
  'Royal Recruits', 'Elite Barbarians', 'Firecracker',
  'Heal Spirit', 'Ice Spirit', 'Fire Spirit', 'Electro Spirit',
  'Skeletons', 'Ice Golem', 'Knight', 'Minions', 'Goblins',
  'Spear Goblins', 'Bats', 'Goblin Gang', 'Guards', 'Barbarians',
  'Royal Delivery', 'Mother Witch', 'Golden Knight', 'Monk',
  'Little Prince', 'Skeleton King', 'Archer Queen', 'Goblinstein',
  'Spirit Empress', 'Berserker', 'Boss Bandit'
]);

const GENERIC_CARDS = new Set([
  'Knight', 'Archers', 'Goblins', 'Minions', 'Bats', 'Skeletons',
  'Ice Spirit', 'Fire Spirit', 'Heal Spirit', 'Electro Spirit',
  'Zap', 'The Log', 'Giant Snowball', 'Barbarian Barrel', 'Arrows',
  'Spear Goblins', 'Goblin Gang'
]);

// ==================== ARCHETYPE DETECTION ====================

const ARCHETYPES = [
  { name: 'Log Bait', cards: ['Goblin Barrel', 'The Log'], showElixir: true },
  { name: 'LavaLoon', cards: ['Lava Hound', 'Balloon'] },
  { name: 'LavaLoon', cards: ['Lava Hound'] },
  { name: 'Bridge Spam', cards: ['Battle Ram', 'Bandit', 'P.E.K.K.A'] },
  { name: 'PEKKA Bridge Spam', cards: ['P.E.K.K.A', 'Battle Ram'] },
  { name: 'Bridge Spam', cards: ['Battle Ram', 'Bandit'] },
  { name: 'Golem Beatdown', cards: ['Golem'] },
  { name: 'Giant Beatdown', cards: ['Giant', 'Graveyard'] },
  { name: 'Giant Beatdown', cards: ['Giant', 'Prince'] },
  { name: 'Giant Beatdown', cards: ['Giant'] },
  { name: 'Royal Giant', cards: ['Royal Giant'] },
  { name: 'Electro Giant', cards: ['Electro Giant'] },
  { name: 'Goblin Giant', cards: ['Goblin Giant'] },
  { name: 'X-Bow', cards: ['X-Bow'] },
  { name: 'Mortar', cards: ['Mortar'] },
  { name: 'Hog Cycle', cards: ['Hog Rider'], maxElixir: 3.4 },
  { name: 'Hog', cards: ['Hog Rider'] },
  { name: 'Graveyard', cards: ['Graveyard'] },
  { name: 'Miner Poison', cards: ['Miner', 'Poison'] },
  { name: 'Miner Wall Breakers', cards: ['Miner', 'Wall Breakers'] },
  { name: 'Miner', cards: ['Miner'] },
  { name: 'Mega Knight', cards: ['Mega Knight'] },
  { name: 'Sparky', cards: ['Sparky'] },
  { name: 'Ram Rider', cards: ['Ram Rider'] },
  { name: 'Balloon', cards: ['Balloon'] },
  { name: 'Skeleton Barrel', cards: ['Skeleton Barrel'] },
  { name: 'Wall Breakers', cards: ['Wall Breakers'] },
  { name: 'Three Musketeers', cards: ['Three Musketeers'] },
  { name: 'Goblin Drill', cards: ['Goblin Drill'] },
  { name: 'Elixir Golem', cards: ['Elixir Golem'] },
  { name: 'Royal Hogs', cards: ['Royal Hogs'] },
];

// ==================== NAMING HELPERS ====================

function getAvgElixir(cardIds) {
  const total = cardIds.reduce((sum, id) => sum + (getCardById(id)?.elixir || 0), 0);
  return total / (cardIds.length || 1);
}

function getCards(cardIds) {
  return cardIds
    .map(id => getCardById(id))
    .filter(c => c && c.name)
    .sort((a, b) => (b.elixir || 0) - (a.elixir || 0));
}

// Get 1-2 most distinctive support cards for naming
function getKeySupportCards(cards, excludeNames) {
  const excluded = new Set(excludeNames);
  const candidates = cards.filter(c => !excluded.has(c.name));

  // Priority 1: Champion
  const champ = candidates.find(c => CHAMPIONS.has(c.name));
  if (champ) return champ;

  // Priority 2: Signature spell (not generic spells)
  const signatureSpells = ['Poison', 'Fireball', 'Rocket', 'Lightning', 'Earthquake', 'Freeze', 'Rage', 'Tornado'];
  const spell = candidates.find(c => signatureSpells.includes(c.name));
  if (spell) return spell;

  // Priority 3: Building
  const building = candidates.find(c => KEY_BUILDINGS.has(c.name));
  if (building) return building;

  // Priority 4: Distinctive troop (not generic)
  const distinctive = candidates.find(c =>
    SIGNATURE_TROOPS.has(c.name) && !GENERIC_CARDS.has(c.name)
  );
  if (distinctive) return distinctive;

  // Priority 5: Any notable troop
  const notable = candidates.find(c => SIGNATURE_TROOPS.has(c.name));
  if (notable) return notable;

  // Fallback
  return candidates[0] || null;
}

// ==================== BASE TITLE (single deck) ====================

function generateBaseDeckTitle(cardIds) {
  if (!cardIds || cardIds.length === 0) return 'Meta Deck';

  const avgElixir = getAvgElixir(cardIds);
  const cards = getCards(cardIds);
  const names = cards.map(c => c.name);
  const lowerNames = names.map(n => n.toLowerCase());

  // 1. Check archetypes
  for (const archetype of ARCHETYPES) {
    const archetypeNames = archetype.cards.map(c => c.toLowerCase());
    const matches = archetypeNames.every(name => lowerNames.includes(name));
    if (matches) {
      if (archetype.maxElixir && avgElixir <= archetype.maxElixir) {
        return `${archetype.name} ${avgElixir.toFixed(1)}`;
      }
      if (archetype.showElixir) {
        return `${archetype.name} ${avgElixir.toFixed(1)}`;
      }
      const support = getKeySupportCards(cards, archetype.cards);
      if (support) {
        return `${archetype.name} ${support.name}`;
      }
      return archetype.name;
    }
  }

  // 2. Build from key cards
  const winCon = cards.find(c => WIN_CONDITIONS.has(c.name));
  const champion = cards.find(c => CHAMPIONS.has(c.name));

  const parts = [];
  if (champion) parts.push(champion.name);
  if (winCon) parts.push(winCon.name);
  if (parts.length === 0) parts.push(cards[0]?.name || 'Meta');

  const mainCardName = parts[parts.length - 1];
  const support = getKeySupportCards(cards, [mainCardName]);
  if (support && !parts.includes(support.name)) {
    parts.push(support.name);
  }

  // For low/mid-elixir decks with win condition, add elixir to differentiate cycle variants
  if (avgElixir <= 3.5 && winCon && parts.length < 4) {
    return `${parts.slice(0, 3).join(' ')} ${avgElixir.toFixed(1)}`;
  }

  return parts.slice(0, 3).join(' ');
}

// ==================== BATCH DISAMBIGUATION ====================

export function generateDeckTitles(decks) {
  // First pass: generate base titles
  const baseTitles = decks.map(d => generateBaseDeckTitle(d.cardIds));

  // Count occurrences
  const counts = {};
  baseTitles.forEach(t => { counts[t] = (counts[t] || 0) + 1; });

  const usedTitles = new Set();
  const result = [];

  for (let i = 0; i < decks.length; i++) {
    const deck = decks[i];
    const base = baseTitles[i];
    const cards = getCards(deck.cardIds);

    // If unique, use as-is
    if (counts[base] === 1) {
      usedTitles.add(base);
      result.push(base);
      continue;
    }

    // Duplicate — try adding a second support card
    // Skip cards already implied by the base title (substring match)
    // Skip cards implied by archetypes (e.g., Lava Hound in LavaLoon)
    const archetypeImplied = {
      'LavaLoon': ['Lava Hound', 'Balloon'],
      'Hog Cycle': ['Hog Rider'],
      'Hog': ['Hog Rider'],
      'Log Bait': ['Goblin Barrel', 'The Log'],
      'Golem Beatdown': ['Golem'],
      'Giant Beatdown': ['Giant'],
      'PEKKA Bridge Spam': ['P.E.K.K.A', 'Battle Ram'],
      'Bridge Spam': ['Battle Ram'],
      'Miner Poison': ['Miner', 'Poison'],
      'Miner Wall Breakers': ['Miner', 'Wall Breakers'],
    };

    const basePrefix = base.split(' ')[0];
    const impliedCards = new Set(archetypeImplied[basePrefix] || []);

    const candidates = cards.filter(c =>
      !base.includes(c.name) &&
      !impliedCards.has(c.name) &&
      !GENERIC_CARDS.has(c.name)
    );

    let resolved = false;
    for (const candidate of candidates) {
      const candidateTitle = `${base} ${candidate.name}`;
      if (!usedTitles.has(candidateTitle)) {
        usedTitles.add(candidateTitle);
        result.push(candidateTitle);
        resolved = true;
        break;
      }
    }

    if (resolved) continue;

    // Fallback: add avg elixir (only if not already in title)
    const avg = getAvgElixir(deck.cardIds);
    const avgStr = avg.toFixed(1);
    if (!base.endsWith(avgStr)) {
      const elixirTitle = `${base} ${avgStr}`;
      usedTitles.add(elixirTitle);
      result.push(elixirTitle);
      continue;
    }

    // Last resort: append a generic differentiator
    const fallbackTitle = `${base} #${i + 1}`;
    usedTitles.add(fallbackTitle);
    result.push(fallbackTitle);
  }

  return result;
}

// ==================== SINGLE DECK TITLE (backward compat) ====================

export function generateDeckTitle(cardIds) {
  return generateBaseDeckTitle(cardIds);
}

// ==================== DESCRIPTION GENERATOR ====================

export function generateDeckDescription(cardIds) {
  if (!cardIds || cardIds.length === 0) {
    return 'A strong meta deck used by top players.';
  }

  const avgElixir = getAvgElixir(cardIds);
  const cards = getCards(cardIds);

  const winCon = cards.find(c => WIN_CONDITIONS.has(c.name));
  const champion = cards.find(c => CHAMPIONS.has(c.name));
  const hasBuilding = cards.some(c => KEY_BUILDINGS.has(c.name));
  const spell = cards.find(c => KEY_SPELLS.has(c.name));

  let desc = '';

  if (winCon && champion) {
    desc = `${champion.name} ${winCon.name} build`;
  } else if (winCon) {
    desc = `${winCon.name} focused deck`;
  } else if (champion) {
    desc = `${champion.name} centered build`;
  } else {
    desc = 'Aggressive meta build';
  }

  if (hasBuilding) {
    desc += ' with defensive structure';
  }

  if (spell) {
    desc += `, supported by ${spell.name}`;
  }

  if (avgElixir <= 2.9) {
    desc += `. Fast cycle at ${avgElixir.toFixed(1)} avg elixir.`;
  } else if (avgElixir <= 3.5) {
    desc += `. Balanced ${avgElixir.toFixed(1)} avg elixir curve.`;
  } else {
    desc += `. Heavy ${avgElixir.toFixed(1)} avg elixir beatdown.`;
  }

  return desc;
}
