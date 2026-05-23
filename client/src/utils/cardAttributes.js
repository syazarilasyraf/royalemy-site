/**
 * Extended card attributes for advanced deck analysis
 * These complement the data in cards.json
 */

// Cards that can attack air troops
export const airHittingCards = new Set([
  // Troops
  '26000001', // Archers
  '26000005', // Minions
  '26000007', // Witch
  '26000014', // Musketeer
  '26000017', // Wizard
  '26000022', // Minion Horde
  '26000023', // Ice Wizard
  '26000026', // Princess
  '26000030', // Ice Spirit
  '26000031', // Fire Spirit
  '26000037', // Inferno Dragon
  '26000039', // Mega Minion
  '26000040', // Dart Goblin
  '26000042', // Electro Wizard
  '26000045', // Executioner
  '26000048', // Night Witch
  '26000049', // Bats
  '26000052', // Zappies
  '26000057', // Flying Machine
  '26000062', // Magic Archer
  '26000063', // Electro Dragon
  '26000064', // Firecracker
  '26000080', // Skeleton Dragons
  '26000083', // Mother Witch
  '26000084', // Electro Spirit
  '26000087', // Phoenix
  '26000093', // Little Prince
  // Buildings
  '27000002', // Mortar
  '27000003', // Inferno Tower
  '27000006', // Tesla
  '27000008', // X-Bow
  // Spells
  '28000000', // Fireball
  '28000001', // Arrows
  '28000003', // Rocket
  '28000005', // Freeze
  '28000007', // Lightning
  '28000008', // Zap
  '28000009', // Poison
  '28000010', // Graveyard
  '28000011', // The Log
  '28000012', // Tornado
  '28000014', // Earthquake
  '28000017', // Giant Snowball
  '28000018', // Royal Delivery
  '28000023', // Void
  '28000024', // Goblin Curse
]);

// Cards with splash/area damage
export const splashCards = new Set([
  // Troops
  '26000007', // Witch
  '26000011', // Valkyrie
  '26000015', // Baby Dragon
  '26000017', // Wizard
  '26000020', // Giant Skeleton (death bomb)
  '26000034', // Bowler
  '26000045', // Executioner
  '26000063', // Electro Dragon (chain)
  '26000080', // Skeleton Dragons
  '26000085', // Electro Giant (reflective)
  '26000011', // Valkyrie
  // Buildings
  '27000004', // Bomb Tower
  // Spells (all spells are splash)
  '28000000', // Fireball
  '28000001', // Arrows
  '28000002', // Rage
  '28000003', // Rocket
  '28000004', // Goblin Barrel
  '28000005', // Freeze
  '28000007', // Lightning
  '28000008', // Zap
  '28000009', // Poison
  '28000010', // Graveyard
  '28000011', // The Log
  '28000012', // Tornado
  '28000013', // Clone
  '28000014', // Earthquake
  '28000015', // Barbarian Barrel
  '28000016', // Heal Spirit
  '28000017', // Giant Snowball
  '28000018', // Royal Delivery
  '28000023', // Void
  '28000024', // Goblin Curse
  '28000026', // Vines
]);

// Win condition cards (primary tower damage dealers)
export const winConditions = new Set([
  '26000003', // Giant
  '26000004', // P.E.K.K.A
  '26000006', // Balloon
  '26000009', // Golem
  '26000016', // Prince
  '26000021', // Hog Rider
  '26000024', // Royal Giant
  '26000029', // Lava Hound
  '26000036', // Battle Ram
  '26000051', // Ram Rider
  '26000055', // Mega Knight
  '26000059', // Royal Hogs
  '26000060', // Goblin Giant
  '26000072', // Archer Queen
  '26000074', // Golden Knight
  '26000077', // Monk
  '27000008', // X-Bow
  '27000002', // Mortar
  '28000004', // Goblin Barrel
]);

// Melee range troops
export const meleeCards = new Set([
  '26000000', // Knight
  '26000002', // Goblins
  '26000004', // P.E.K.K.A
  '26000008', // Barbarians
  '26000010', // Skeletons
  '26000011', // Valkyrie
  '26000012', // Skeleton Army
  '26000016', // Prince
  '26000018', // Mini P.E.K.K.A
  '26000020', // Giant Skeleton
  '26000025', // Guards
  '26000027', // Dark Prince
  '26000032', // Miner
  '26000034', // Bowler
  '26000035', // Lumberjack
  '26000036', // Battle Ram
  '26000038', // Ice Golem
  '26000041', // Goblin Gang
  '26000043', // Elite Barbarians
  '26000046', // Bandit
  '26000047', // Royal Recruits
  '26000048', // Night Witch
  '26000050', // Royal Ghost
  '26000051', // Ram Rider
  '26000055', // Mega Knight
  '26000058', // Wall Breakers
  '26000060', // Goblin Giant
  '26000067', // Elixir Golem
  '26000068', // Battle Healer
  '26000069', // Skeleton King
  '26000072', // Archer Queen
  '26000074', // Golden Knight
  '26000077', // Monk
  '26000102', // Berserker
  '26000103', // Boss Bandit
]);

// Buildings that are primarily defensive
export const defensiveBuildings = new Set([
  '27000000', // Cannon
  '27000001', // Goblin Hut
  '27000003', // Inferno Tower
  '27000004', // Bomb Tower
  '27000005', // Barbarian Hut
  '27000006', // Tesla
  '27000007', // Elixir Collector
  '27000009', // Tombstone
  '27000010', // Furnace
  '27000012', // Goblin Cage
  '27000013', // Goblin Drill
]);

// Fast moving cards (for quick counter-pushes)
export const fastCards = new Set([
  '26000002', // Goblins
  '26000010', // Skeletons
  '26000019', // Spear Goblins
  '26000030', // Ice Spirit
  '26000031', // Fire Spirit
  '26000049', // Bats
  '26000058', // Wall Breakers
  '26000084', // Electro Spirit
  '28000016', // Heal Spirit
]);

// Heavy tanks (high HP, slow)
export const tanks = new Set([
  '26000003', // Giant
  '26000004', // P.E.K.K.A
  '26000009', // Golem
  '26000020', // Giant Skeleton
  '26000029', // Lava Hound
  '26000038', // Ice Golem
  '26000055', // Mega Knight
  '26000060', // Goblin Giant
  '26000067', // Elixir Golem
  '26000096', // Goblin Machine
]);

// Small spells (cheap, for cycle/reset)
export const smallSpells = new Set([
  '28000002', // Rage (2 elixir)
  '28000006', // Mirror (1 elixir with +1)
  '28000008', // Zap (2 elixir)
  '28000011', // The Log (2 elixir)
  '28000015', // Barbarian Barrel (2 elixir)
  '28000017', // Giant Snowball (2 elixir)
]);

// Big spells (heavy damage)
export const bigSpells = new Set([
  '28000000', // Fireball (4 elixir)
  '28000003', // Rocket (6 elixir)
  '28000005', // Freeze (4 elixir)
  '28000007', // Lightning (6 elixir)
  '28000009', // Poison (4 elixir)
  '28000010', // Graveyard (5 elixir)
  '28000018', // Royal Delivery (3 elixir but heavy)
]);

/**
 * Check if a card can hit air troops
 * @param {string} cardId 
 * @returns {boolean}
 */
export function canHitAir(cardId) {
  return airHittingCards.has(String(cardId));
}

/**
 * Check if a card has splash/area damage
 * @param {string} cardId 
 * @returns {boolean}
 */
export function hasSplash(cardId) {
  return splashCards.has(String(cardId));
}

/**
 * Check if a card is a win condition
 * @param {string} cardId 
 * @returns {boolean}
 */
export function isWinCondition(cardId) {
  return winConditions.has(String(cardId));
}

/**
 * Check if a card is melee range
 * @param {string} cardId 
 * @returns {boolean}
 */
export function isMelee(cardId) {
  return meleeCards.has(String(cardId));
}

/**
 * Check if a card is a defensive building
 * @param {string} cardId 
 * @returns {boolean}
 */
export function isDefensiveBuilding(cardId) {
  return defensiveBuildings.has(String(cardId));
}

/**
 * Check if a card is fast (for cycle/quick defense)
 * @param {string} cardId 
 * @returns {boolean}
 */
export function isFast(cardId) {
  return fastCards.has(String(cardId));
}

/**
 * Check if a card is a tank
 * @param {string} cardId 
 * @returns {boolean}
 */
export function isTank(cardId) {
  return tanks.has(String(cardId));
}

/**
 * Check if a spell is a small spell
 * @param {string} cardId 
 * @returns {boolean}
 */
export function isSmallSpell(cardId) {
  return smallSpells.has(String(cardId));
}

/**
 * Check if a spell is a big spell
 * @param {string} cardId 
 * @returns {boolean}
 */
export function isBigSpell(cardId) {
  return bigSpells.has(String(cardId));
}
