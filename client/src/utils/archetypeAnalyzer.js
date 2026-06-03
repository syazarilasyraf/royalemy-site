/**
 * Archetype Analyzer Module
 * 
 * Card-tag based deck archetype classification engine.
 * Supports: Cycle, Bait, Bridge Spam, Beatdown, Control, Siege,
 * Air, Splashyard, Miner Control, Dual Lane Pressure
 */

import cardsData from '../data/cards.json';

// ─── Card Archetype Tags ──────────────────────────────────────
// Each card maps to archetype scores (0.0–1.0+)
// Higher = more defining for that archetype

const CARD_ARCHETYPE_TAGS = {
  // ─── Troops ───
  '26000000': { cycle: 0.5, control: 0.5, siege: 0.4, splashyard: 0.4, bait: 0.3 }, // Knight
  '26000001': { cycle: 0.5, siege: 0.5, control: 0.3 }, // Archers
  '26000002': { cycle: 0.7, bait: 0.6 }, // Goblins
  '26000003': { beatdown: 1.0, splashyard: 0.3 }, // Giant
  '26000004': { bridgespam: 0.7, beatdown: 0.4 }, // P.E.K.K.A
  '26000005': { air: 0.7, beatdown: 0.3 }, // Minions
  '26000006': { air: 1.0, beatdown: 0.5 }, // Balloon
  '26000007': { beatdown: 0.4, splashyard: 0.3 }, // Witch
  '26000008': { cycle: 0.4, dualLane: 0.5 }, // Barbarians
  '26000009': { beatdown: 1.0 }, // Golem
  '26000010': { cycle: 1.0, minerControl: 0.5, siege: 0.4 }, // Skeletons
  '26000011': { splashyard: 0.8, control: 0.4 }, // Valkyrie
  '26000012': { bait: 0.7 }, // Skeleton Army
  '26000013': { cycle: 0.4 }, // Bomber
  '26000014': { cycle: 0.5, control: 0.6, siege: 0.5 }, // Musketeer
  '26000015': { air: 0.7, beatdown: 0.4, splashyard: 0.6 }, // Baby Dragon
  '26000016': { bridgespam: 0.5, beatdown: 0.3 }, // Prince
  '26000017': { beatdown: 0.3, control: 0.3 }, // Wizard
  '26000018': { control: 0.4 }, // Mini P.E.K.K.A
  '26000019': { cycle: 0.7, dualLane: 0.3 }, // Spear Goblins
  '26000020': { beatdown: 0.5 }, // Giant Skeleton
  '26000021': { cycle: 0.7, bridgespam: 0.6, dualLane: 0.4 }, // Hog Rider
  '26000022': { air: 0.8, beatdown: 0.3 }, // Minion Horde
  '26000023': { control: 0.8, siege: 0.5, splashyard: 0.6 }, // Ice Wizard
  '26000024': { siege: 0.6, control: 0.5 }, // Royal Giant
  '26000025': { control: 0.4, splashyard: 0.3 }, // Guards
  '26000026': { bait: 1.0, control: 0.3 }, // Princess
  '26000027': { bridgespam: 0.7, beatdown: 0.3 }, // Dark Prince
  '26000028': { dualLane: 0.9, beatdown: 0.3 }, // Three Musketeers
  '26000029': { air: 1.0, beatdown: 1.0 }, // Lava Hound
  '26000030': { cycle: 1.0, siege: 0.4, minerControl: 0.4 }, // Ice Spirit
  '26000031': { cycle: 0.7 }, // Fire Spirit
  '26000032': { minerControl: 1.0, control: 0.6, cycle: 0.3 }, // Miner
  '26000033': { beatdown: 0.4 }, // Sparky
  '26000034': { splashyard: 0.8, control: 0.4 }, // Bowler
  '26000035': { beatdown: 0.6, bridgespam: 0.8, air: 0.4 }, // Lumberjack
  '26000036': { bridgespam: 1.0, dualLane: 0.5, cycle: 0.3 }, // Battle Ram
  '26000037': { air: 0.6, beatdown: 0.3 }, // Inferno Dragon
  '26000038': { cycle: 0.7, control: 0.5, beatdown: 0.3, air: 0.3 }, // Ice Golem
  '26000039': { air: 0.7, beatdown: 0.4, minerControl: 0.6, control: 0.5 }, // Mega Minion
  '26000040': { bait: 0.8, cycle: 0.4 }, // Dart Goblin
  '26000041': { bait: 0.9, control: 0.3 }, // Goblin Gang
  '26000042': { control: 0.6, bridgespam: 0.5, minerControl: 0.5 }, // Electro Wizard
  '26000043': { bridgespam: 0.8, dualLane: 0.5 }, // Elite Barbarians
  '26000044': { control: 0.5 }, // Hunter
  '26000045': { splashyard: 0.8, control: 0.4 }, // Executioner
  '26000046': { bridgespam: 1.0, control: 0.3 }, // Bandit
  '26000047': { dualLane: 1.0, beatdown: 0.3 }, // Royal Recruits
  '26000048': { beatdown: 0.8 }, // Night Witch
  '26000049': { cycle: 0.7, air: 0.5, bait: 0.6, minerControl: 0.5 }, // Bats
  '26000050': { bridgespam: 0.9, control: 0.4, dualLane: 0.4 }, // Royal Ghost
  '26000051': { bridgespam: 1.0, dualLane: 0.4, control: 0.4 }, // Ram Rider
  '26000052': { control: 0.5, dualLane: 0.4 }, // Zappies
  '26000053': { dualLane: 0.5, control: 0.3 }, // Rascals
  '26000054': { bridgespam: 0.6 }, // Cannon Cart
  '26000055': { bridgespam: 0.6, beatdown: 0.5 }, // Mega Knight
  '26000056': { bait: 0.7, dualLane: 0.4, minerControl: 0.5 }, // Skeleton Barrel
  '26000057': { air: 0.7, dualLane: 0.4 }, // Flying Machine
  '26000058': { bridgespam: 0.7, cycle: 0.5, dualLane: 0.6, minerControl: 0.5 }, // Wall Breakers
  '26000059': { dualLane: 1.0, cycle: 0.4 }, // Royal Hogs
  '26000060': { beatdown: 0.9 }, // Goblin Giant
  '26000061': { control: 0.7, splashyard: 0.5 }, // Fisherman
  '26000062': { bridgespam: 0.6, control: 0.5, siege: 0.4 }, // Magic Archer
  '26000063': { air: 0.5, beatdown: 0.3, splashyard: 0.3 }, // Electro Dragon
  '26000064': { cycle: 0.6, siege: 0.5 }, // Firecracker
  '26000065': { minerControl: 0.6, control: 0.5 }, // Mighty Miner
  '26000067': { beatdown: 0.8 }, // Elixir Golem
  '26000068': { beatdown: 0.7, bridgespam: 0.4 }, // Battle Healer
  '26000069': { control: 0.4, splashyard: 0.3 }, // Skeleton King
  '26000072': { control: 0.4, minerControl: 0.3 }, // Archer Queen
  '26000074': { bridgespam: 0.7, control: 0.3 }, // Golden Knight
  '26000077': { control: 0.4 }, // Monk
  '26000080': { air: 0.6, splashyard: 0.6, beatdown: 0.3 }, // Skeleton Dragons
  '26000083': { control: 0.4 }, // Mother Witch
  '26000084': { cycle: 1.0 }, // Electro Spirit
  '26000085': { beatdown: 0.8 }, // Electro Giant
  '26000087': { air: 0.8, beatdown: 0.4 }, // Phoenix
  '26000093': { control: 0.5, minerControl: 0.3 }, // Little Prince
  '26000095': { cycle: 0.4 }, // Goblin Demolisher
  '26000096': { beatdown: 0.5 }, // Goblin Machine
  '26000097': { cycle: 0.5 }, // Suspicious Bush
  '26000099': { control: 0.4 }, // Goblinstein
  '26000101': { beatdown: 0.5 }, // Rune Giant
  '26000102': { cycle: 0.6 }, // Berserker
  '26000103': { bridgespam: 0.5 }, // Boss Bandit

  // ─── Buildings ───
  '27000000': { cycle: 0.7, siege: 0.6, control: 0.6 }, // Cannon
  '27000001': { bait: 0.4, beatdown: 0.3 }, // Goblin Hut
  '27000002': { siege: 1.0, cycle: 0.4 }, // Mortar
  '27000003': { control: 0.7, bait: 0.5 }, // Inferno Tower
  '27000004': { control: 0.4 }, // Bomb Tower
  '27000005': { beatdown: 0.3 }, // Barbarian Hut
  '27000006': { siege: 0.7, control: 0.6, cycle: 0.5 }, // Tesla
  '27000007': { beatdown: 0.7 }, // Elixir Collector
  '27000008': { siege: 1.0, cycle: 0.3 }, // X-Bow
  '27000009': { control: 0.5, splashyard: 0.3 }, // Tombstone
  '27000010': { bait: 0.5, control: 0.3 }, // Furnace
  '27000012': { control: 0.4 }, // Goblin Cage
  '27000013': { bait: 0.8, dualLane: 0.6, minerControl: 0.4 }, // Goblin Drill

  // ─── Spells ───
  '28000000': { siege: 0.4, control: 0.5, cycle: 0.3, minerControl: 0.4, dualLane: 0.3 }, // Fireball
  '28000001': { dualLane: 0.4, cycle: 0.3 }, // Arrows
  '28000002': { beatdown: 0.5, air: 0.4 }, // Rage
  '28000003': { siege: 0.7, control: 0.7, cycle: 0.3 }, // Rocket
  '28000004': { bait: 1.0, minerControl: 0.3 }, // Goblin Barrel
  '28000005': { beatdown: 0.4, air: 0.5, splashyard: 0.5 }, // Freeze
  '28000006': { dualLane: 0.3, beatdown: 0.3 }, // Mirror
  '28000007': { beatdown: 0.4, air: 0.3, dualLane: 0.4 }, // Lightning
  '28000008': { cycle: 0.5, minerControl: 0.5, bridgespam: 0.3, air: 0.3 }, // Zap
  '28000009': { control: 0.5, minerControl: 0.8, beatdown: 0.4, splashyard: 0.7 }, // Poison
  '28000010': { splashyard: 1.0, control: 0.6 }, // Graveyard
  '28000011': { cycle: 0.5, control: 0.4, minerControl: 0.5, siege: 0.4, splashyard: 0.4 }, // The Log
  '28000012': { splashyard: 0.9, control: 0.5, beatdown: 0.3 }, // Tornado
  '28000013': { beatdown: 0.5, air: 0.4 }, // Clone
  '28000014': { siege: 0.3, cycle: 0.3 }, // Earthquake
  '28000015': { cycle: 0.5, splashyard: 0.4 }, // Barbarian Barrel
  '28000016': { cycle: 1.0 }, // Heal Spirit
  '28000017': { cycle: 0.5, control: 0.3 }, // Giant Snowball
  '28000018': { siege: 0.4, control: 0.4, dualLane: 0.4, splashyard: 0.5 }, // Royal Delivery
  '28000023': { control: 0.3 }, // Void
  '28000024': { control: 0.3 }, // Goblin Curse
  '28000026': { control: 0.3 }, // Vines
};

// ─── Archetype Definitions ────────────────────────────────────

const ARCHETYPE_DEFINITIONS = {
  cycle: {
    name: 'Cycle',
    description: 'Rotate quickly through cheap cards to outpace opponents and apply constant pressure.',
    winConditions: [
      'Rotate quickly to get back to your win condition',
      'Outcycle enemy counters before they can respond',
      'Apply constant pressure to force mistakes',
      'Defend efficiently with cheap cards',
      'Build small but relentless counterpushes',
    ],
    strengths: [
      'Very fast card rotation',
      'Can outcycle opponent\'s answers',
      'Low elixir commitment on defense',
      'Consistent pressure output',
    ],
    weaknesses: [
      'Vulnerable to heavy spell value',
      'Can struggle against heavy tanks without proper timing',
      'Requires precise elixir management',
      'Weak if key defensive card is out of cycle',
    ],
  },
  bait: {
    name: 'Bait',
    description: 'Force out enemy spells with fragile swarms, then punish with your real threats.',
    winConditions: [
      'Force out small spells with bait units',
      'Punish with Goblin Barrel or swarms when spell is down',
      'Create unfavorable spell trades for the opponent',
      'Defend with high-DPS swarm units',
      'Build spell-proof pushes by layering threats',
    ],
    strengths: [
      'Punishes opponents who carry only one small spell',
      'Creates explosive damage windows',
      'Very strong if opponent misuses spell',
      'Flexible defense with swarm units',
    ],
    weaknesses: [
      'Struggles against multiple spells or heavy splash',
      'Swarm units die to splash troops easily',
      'Requires good spell-bait timing',
      'Can be hard to break through spell-heavy decks',
    ],
  },
  bridgespam: {
    name: 'Bridge Spam',
    description: 'Defend efficiently and convert defenses into aggressive bridge pressure with hard-to-stop units.',
    winConditions: [
      'Defend efficiently and build counterpushes',
      'Pressure at the bridge with fast, heavy threats',
      'Punish expensive enemy commitments instantly',
      'Split lane pressure to overwhelm defenses',
      'Use high-damage charge units to force reactions',
    ],
    strengths: [
      'Strong counterpush potential',
      'Excellent at punishing elixir leaks',
      'Good dual-lane pressure options',
      'Very threatening on offense when ahead',
    ],
    weaknesses: [
      'Can struggle against heavy tanks without PEKKA/MK',
      'Requires good bridge placement timing',
      'Vulnerable to good spell/troop combos',
      'Some units are expensive to commit blindly',
    ],
  },
  beatdown: {
    name: 'Beatdown',
    description: 'Build massive elixir advantages behind heavy tanks and overwhelm towers with huge pushes.',
    winConditions: [
      'Build a big elixir lead behind your tank',
      'Support the tank with splash and high-DPS troops',
      'Overwhelm enemy defenses with push size',
      'Absorb tower damage while support deals damage',
      'Use spells to clear defensive buildings/troops',
    ],
    strengths: [
      'Extremely powerful when a push connects',
      'Great at absorbing damage and tower pressure',
      'Spell-proof when built correctly',
      'Strong in double elixir',
    ],
    weaknesses: [
      'Very expensive — vulnerable during setup',
      'Can be kited and split by fast units',
      'Weak against Inferno Tower/Dragon without zap',
      'Struggles against heavy cycle pressure',
    ],
  },
  control: {
    name: 'Control',
    description: 'Play reactively, defend with positive trades, and win through small counterpushes and spell damage.',
    winConditions: [
      'Defend with positive elixir trades',
      'Win through counterpush damage and spell chip',
      'Control the pace of the match',
      'Use buildings to pull and kite enemies',
      'Punish overcommitments with precise defense',
    ],
    strengths: [
      'Very efficient defense',
      'Excels at punishing mistakes',
      'Great elixir management',
      'Consistent damage output through chip',
    ],
    weaknesses: [
      'Can struggle against heavy spell cycling',
      'Requires excellent defensive timing',
      'Low burst damage potential',
      'Vulnerable if defensive building is out of cycle',
    ],
  },
  siege: {
    name: 'Siege',
    description: 'Attack enemy towers from your side using long-range buildings like X-Bow and Mortar.',
    winConditions: [
      'Lock onto the tower with siege buildings',
      'Defend your siege unit with cheap troops/spells',
      'Cycle back to siege quickly after it dies',
      'Use spells to clear defensive troops',
      'Tornado/Fisherman to pull defenders away',
    ],
    strengths: [
      'Attacks from your side — hard to counterpush',
      'Extremely threatening when locked on',
      'Fast cycle variants are relentless',
      'Great spell synergy for clearing defense',
    ],
    weaknesses: [
      'Very weak when siege unit is out of cycle',
      'Hard countered by heavy tanks and buildings',
      'Requires perfect defensive placement',
      'Struggles against fast bridge spam pressure',
    ],
  },
  air: {
    name: 'Air',
    description: 'Overwhelm ground-based defenses with flying troops that many decks struggle to answer.',
    winConditions: [
      'Build a massive air push behind Lava Hound or Balloon',
      'Overwhelm anti-air with too many flying threats',
      'Use spells to clear enemy air defense',
      'Support your air tank with high-DPS flyers',
      'Freeze or rage your air push for huge damage',
    ],
    strengths: [
      'Many decks lack sufficient air defense',
      'Ground troops cannot target air units',
      'Extremely powerful when air push connects',
      'Balloon/Lava are very tanky win conditions',
    ],
    weaknesses: [
      'Hard countered by good air defense (Wizard, Executioner, E-Wiz)',
      'Inferno Dragon/Tower destroys pushes without zap',
      'Very expensive — vulnerable during setup',
      'Can be completely shut down by specific decks',
    ],
  },
  splashyard: {
    name: 'Splashyard',
    description: 'Use Graveyard with splash troops and Tornado to create deadly, hard-to-stop offensive combos.',
    winConditions: [
      'Place Graveyard on tower with a tank',
      'Use Tornado to pull defenders into splash range',
      'Poison spell to kill swarm defenders',
      'Defend efficiently with splash troops',
      'Build counterpushes after successful defense',
    ],
    strengths: [
      'Graveyard + Tornado + Splash is devastating',
      'Excellent at clearing swarm defenses',
      'Very strong counterpush potential',
      'Tornado provides incredible defensive value',
    ],
    weaknesses: [
      'Struggles against decks with multiple small spells',
      'Vulnerable to anti-Graveyard cards (Valkyrie, Bomber)',
      'Requires precise Tornado timing',
      'Can be hard to break through heavy buildings',
    ],
  },
  minerControl: {
    name: 'Miner Control',
    description: 'Chip away at towers with Miner and small troops while controlling the board with efficient defense.',
    winConditions: [
      'Chip tower with Miner + Poison or small troops',
      'Defend efficiently and support with Miner counterpush',
      'Use cheap cycle cards to get back to Miner quickly',
      'Punish passive play with constant Miner pressure',
      'Spell cycle to finish low-HP towers',
    ],
    strengths: [
      'Relentless chip damage is hard to stop completely',
      'Very flexible offense and defense',
      'Fast cycle gets back to Miner quickly',
      'Poison + Miner is unavoidable damage',
    ],
    weaknesses: [
      'Low burst damage — games go long',
      'Vulnerable to heavy spell cycling',
      'Requires excellent prediction skills',
      'Can struggle against decks with lots of heal/tanks',
    ],
  },
  dualLane: {
    name: 'Dual Lane Pressure',
    description: 'Split your threats across both lanes to force the opponent to divide their defense.',
    winConditions: [
      'Split troops to attack both lanes simultaneously',
      'Force opponent to choose which tower to defend',
      'Use high-pressure cards in opposite lanes',
      'Build a push in one lane while pressuring the other',
      'Overwhelm single-lane defensive decks',
    ],
    strengths: [
      'Forces opponent to split elixir',
      'Very hard to fully defend both sides',
      'Excels in overtime and double elixir',
      'Constant pressure from multiple angles',
    ],
    weaknesses: [
      'Can be countered by wide splash (Wizard, Executioner)',
      'Requires good map awareness',
      'Split pushes are weaker individually',
      'Vulnerable if opponent ignores one lane and pushes hard',
    ],
  },
};

// ─── Meta Decks Database ──────────────────────────────────────

const META_DECKS = [
  {
    name: '2.6 Hog Cycle',
    archetypes: ['cycle'],
    cardIds: ['26000021', '26000014', '26000030', '26000010', '27000000', '28000000', '28000011', '26000038'],
  },
  {
    name: 'Classic Log Bait',
    archetypes: ['bait', 'control'],
    cardIds: ['26000026', '28000004', '27000003', '26000000', '26000041', '26000040', '28000003', '28000011'],
  },
  {
    name: 'P.E.K.K.A Bridge Spam',
    archetypes: ['bridgespam'],
    cardIds: ['26000004', '26000036', '26000046', '26000050', '26000042', '28000009', '28000008', '26000062'],
  },
  {
    name: 'Golem Beatdown',
    archetypes: ['beatdown'],
    cardIds: ['26000009', '26000015', '26000039', '28000007', '28000012', '28000011', '26000035', '26000030'],
  },
  {
    name: 'Lava Hound Air',
    archetypes: ['air', 'beatdown'],
    cardIds: ['26000029', '26000006', '26000039', '26000037', '28000008', '28000009', '26000035', '26000038'],
  },
  {
    name: 'X-Bow Cycle',
    archetypes: ['siege', 'cycle'],
    cardIds: ['27000008', '27000006', '26000010', '26000030', '26000014', '28000011', '28000000', '26000038'],
  },
  {
    name: 'Mortar Cycle',
    archetypes: ['siege', 'cycle'],
    cardIds: ['27000002', '26000064', '26000010', '26000030', '26000000', '28000011', '28000018', '28000014'],
  },
  {
    name: 'Giant Splashyard',
    archetypes: ['splashyard', 'beatdown'],
    cardIds: ['26000003', '28000010', '28000012', '26000011', '26000014', '28000009', '26000041', '28000011'],
  },
  {
    name: 'Miner Poison Control',
    archetypes: ['minerControl', 'control'],
    cardIds: ['26000032', '28000009', '26000042', '26000039', '26000010', '26000030', '28000011', '27000009'],
  },
  {
    name: 'Royal Hogs Cycle',
    archetypes: ['dualLane', 'cycle'],
    cardIds: ['26000059', '26000052', '26000061', '28000007', '26000038', '26000014', '28000011', '28000018'],
  },
  {
    name: 'Lumberjack Balloon',
    archetypes: ['air', 'cycle'],
    cardIds: ['26000006', '26000035', '26000030', '26000010', '28000008', '28000011', '26000038', '26000014'],
  },
  {
    name: 'Electro Giant Control',
    archetypes: ['beatdown', 'control'],
    cardIds: ['26000085', '28000012', '26000042', '26000062', '28000008', '28000009', '26000038', '26000014'],
  },
  {
    name: 'Mega Knight Bridge Spam',
    archetypes: ['bridgespam'],
    cardIds: ['26000055', '26000036', '26000046', '26000050', '26000042', '28000009', '28000008', '26000062'],
  },
  {
    name: 'Ram Rider Bridge Spam',
    archetypes: ['bridgespam', 'control'],
    cardIds: ['26000051', '26000004', '26000046', '26000050', '26000042', '28000009', '28000008', '26000062'],
  },
  {
    name: 'Goblin Giant Sparky',
    archetypes: ['beatdown'],
    cardIds: ['26000060', '26000033', '26000040', '26000041', '26000039', '28000008', '28000018', '26000000'],
  },
  {
    name: 'Graveyard Control',
    archetypes: ['splashyard', 'control'],
    cardIds: ['28000010', '26000011', '26000042', '26000039', '28000009', '26000010', '28000011', '27000009'],
  },
  {
    name: 'Three Musketeers',
    archetypes: ['dualLane', 'beatdown'],
    cardIds: ['26000028', '26000036', '26000008', '28000001', '26000019', '26000000', '28000008', '26000035'],
  },
  {
    name: 'Royal Recruits Hogs',
    archetypes: ['dualLane', 'beatdown'],
    cardIds: ['26000047', '26000059', '26000043', '28000018', '26000014', '28000011', '28000008', '26000038'],
  },
  {
    name: 'Wall Breakers Cycle',
    archetypes: ['cycle', 'bridgespam'],
    cardIds: ['26000058', '26000032', '26000010', '26000030', '26000000', '28000011', '28000000', '26000038'],
  },
  {
    name: 'Miner Wall Breakers',
    archetypes: ['minerControl', 'cycle'],
    cardIds: ['26000032', '26000058', '26000030', '26000010', '26000014', '28000011', '28000000', '26000038'],
  },
  {
    name: 'Hog EQ Cycle',
    archetypes: ['cycle', 'siege'],
    cardIds: ['26000021', '26000000', '26000030', '26000010', '27000000', '28000011', '28000014', '28000018'],
  },
  {
    name: 'Elixir Golem Heal',
    archetypes: ['beatdown'],
    cardIds: ['26000067', '26000068', '26000039', '26000015', '28000002', '28000008', '28000011', '26000030'],
  },
  {
    name: 'Phoenix Lava Hound',
    archetypes: ['air', 'beatdown'],
    cardIds: ['26000029', '26000087', '26000006', '26000039', '28000008', '28000009', '26000038', '26000030'],
  },
  {
    name: 'Goblin Drill Bait',
    archetypes: ['bait', 'minerControl'],
    cardIds: ['27000013', '28000004', '26000041', '26000026', '26000040', '26000000', '28000011', '28000008'],
  },
  {
    name: 'Rascals Mortar',
    archetypes: ['siege', 'control'],
    cardIds: ['27000002', '26000053', '26000064', '26000010', '26000030', '28000011', '28000000', '26000038'],
  },
  {
    name: 'P.E.K.K.A Wizard Control',
    archetypes: ['control', 'bridgespam'],
    cardIds: ['26000004', '26000017', '26000011', '26000014', '28000000', '28000011', '26000038', '27000009'],
  },
  {
    name: 'Hog Exe Nado',
    archetypes: ['cycle', 'control', 'splashyard'],
    cardIds: ['26000021', '26000045', '28000012', '26000014', '26000000', '28000000', '28000011', '26000038'],
  },
  {
    name: 'Bandit Battle Ram Cycle',
    archetypes: ['bridgespam', 'cycle'],
    cardIds: ['26000036', '26000046', '26000030', '26000010', '26000014', '28000011', '28000008', '26000038'],
  },
  {
    name: 'Golden Knight Bridge Spam',
    archetypes: ['bridgespam'],
    cardIds: ['26000074', '26000036', '26000046', '26000050', '26000042', '28000009', '28000008', '26000062'],
  },
  {
    name: 'Monk Phoenix Control',
    archetypes: ['control'],
    cardIds: ['26000077', '26000087', '26000042', '26000062', '26000030', '28000011', '28000000', '26000038'],
  },
];

// ─── Helpers ──────────────────────────────────────────────────

const ALL_ARCHETYPES = Object.keys(ARCHETYPE_DEFINITIONS);

function getCardTags(cardId) {
  return CARD_ARCHETYPE_TAGS[String(cardId)] || {};
}

function getAvgElixir(cardIds) {
  let total = 0;
  for (const id of cardIds) {
    const card = cardsData?.[String(id)];
    total += card?.elixir || 0;
  }
  return total / cardIds.length;
}

// ─── Core Analysis ────────────────────────────────────────────

/**
 * Analyze a deck's archetype composition.
 * @param {string[]} cardIds - Array of 8 card IDs
 * @returns {object} Archetype analysis results
 */
export function analyzeDeckArchetypes(cardIds) {
  if (!cardIds || cardIds.length !== 8) {
    return null;
  }

  const rawScores = {};
  ALL_ARCHETYPES.forEach(a => rawScores[a] = 0);

  cardIds.forEach(cardId => {
    const tags = getCardTags(cardId);
    ALL_ARCHETYPES.forEach(arch => {
      if (tags[arch]) {
        rawScores[arch] += tags[arch];
      }
    });
  });

  // Apply deck-wide modifiers
  const elixirCosts = cardIds.map(id => {
    // We don't have cardsData here, so we use a rough estimate
    // based on typical card costs, but ideally this is passed in.
    // For now we skip elixir-based modifiers in raw scoring and
    // let the caller handle avg-elixir if needed.
    return 0;
  });

  // Normalize: typical max raw score for a "pure" deck is ~6-8
  // We'll normalize against a theoretical max of 7 per archetype
  const THEORETICAL_MAX = 7;
  const normalized = {};
  ALL_ARCHETYPES.forEach(arch => {
    normalized[arch] = Math.min(100, Math.round((rawScores[arch] / THEORETICAL_MAX) * 100));
  });

  // Sort archetypes by score
  const sorted = ALL_ARCHETYPES
    .map(arch => ({ key: arch, score: normalized[arch] }))
    .sort((a, b) => b.score - a.score);

  const primary = sorted[0];
  const secondary = sorted[1];

  // Confidence: based on gap between primary and secondary, and absolute primary score
  const gap = primary.score - secondary.score;
  const confidence = Math.min(100, Math.round(
    (primary.score * 0.6) + (gap * 0.4)
  ));

  // Generate description
  let description = '';
  if (primary.score >= 70) {
    description = `This is a strong ${ARCHETYPE_DEFINITIONS[primary.key].name} deck.`;
  } else if (primary.score >= 45) {
    description = `This deck leans toward ${ARCHETYPE_DEFINITIONS[primary.key].name} with elements of ${ARCHETYPE_DEFINITIONS[secondary.key].name}.`;
  } else {
    description = `This deck is a hybrid with mixed playstyles, primarily ${ARCHETYPE_DEFINITIONS[primary.key].name} and ${ARCHETYPE_DEFINITIONS[secondary.key].name}.`;
  }

  // Add flavor text based on primary
  description += ' ' + ARCHETYPE_DEFINITIONS[primary.key].description;

  return {
    primaryArchetype: {
      key: primary.key,
      name: ARCHETYPE_DEFINITIONS[primary.key].name,
      score: primary.score,
    },
    secondaryArchetype: {
      key: secondary.key,
      name: ARCHETYPE_DEFINITIONS[secondary.key].name,
      score: secondary.score,
    },
    confidence,
    description,
    breakdown: sorted,
    rawScores: normalized,
  };
}

/**
 * Get "How This Deck Wins" bullets based on archetype composition.
 * @param {object} archetypeAnalysis - result from analyzeDeckArchetypes
 * @returns {string[]} 3-5 bullet points
 */
export function getHowToWin(archetypeAnalysis) {
  if (!archetypeAnalysis) return [];

  const bullets = [];
  const { breakdown, primaryArchetype, secondaryArchetype } = archetypeAnalysis;

  // Collect top archetypes (score > 20), fallback to top 3 if none pass threshold
  let topArches = breakdown.filter(a => a.score > 20);
  if (topArches.length === 0) topArches = breakdown.slice(0, 3);

  // Take win conditions from primary and secondary
  const added = new Set();
  topArches.slice(0, 2).forEach(arch => {
    const defs = ARCHETYPE_DEFINITIONS[arch.key];
    if (defs) {
      defs.winConditions.forEach(b => {
        if (!added.has(b) && bullets.length < 5) {
          added.add(b);
          bullets.push(b);
        }
      });
    }
  });

  // If we still have room, add from 3rd archetype
  if (bullets.length < 3 && topArches[2]) {
    const defs = ARCHETYPE_DEFINITIONS[topArches[2].key];
    if (defs) {
      defs.winConditions.forEach(b => {
        if (!added.has(b) && bullets.length < 5) {
          added.add(b);
          bullets.push(b);
        }
      });
    }
  }

  return bullets;
}

/**
 * Get strengths and weaknesses based on archetype composition.
 * @param {object} archetypeAnalysis - result from analyzeDeckArchetypes
 * @returns {object} { strengths: string[], weaknesses: string[] }
 */
export function getStrengthsAndWeaknesses(archetypeAnalysis) {
  if (!archetypeAnalysis) return { strengths: [], weaknesses: [] };

  const { breakdown } = archetypeAnalysis;
  const strengths = [];
  const weaknesses = [];
  const addedS = new Set();
  const addedW = new Set();

  // Take top 3 archetypes
  breakdown.slice(0, 3).forEach(arch => {
    const defs = ARCHETYPE_DEFINITIONS[arch.key];
    if (!defs) return;

    defs.strengths.forEach(s => {
      if (!addedS.has(s) && strengths.length < 5) {
        addedS.add(s);
        strengths.push(s);
      }
    });

    defs.weaknesses.forEach(w => {
      if (!addedW.has(w) && weaknesses.length < 5) {
        addedW.add(w);
        weaknesses.push(w);
      }
    });
  });

  return { strengths, weaknesses };
}

// ─── Similarity Engine ────────────────────────────────────────

function jaccardSimilarity(setA, setB) {
  const intersection = new Set([...setA].filter(x => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  return union.size === 0 ? 0 : intersection.size / union.size;
}

function archetypeOverlap(deckArchScores, metaArchKeys) {
  let overlap = 0;
  metaArchKeys.forEach(key => {
    overlap += (deckArchScores[key] || 0) / 100;
  });
  return Math.min(1, overlap / Math.max(1, metaArchKeys.length * 0.6));
}

/**
 * Find similar meta decks.
 * @param {string[]} cardIds - Array of 8 card IDs
 * @param {number} avgElixir - Average elixir cost
 * @returns {object[]} Top similar decks with similarity %
 */
export function findSimilarDecks(cardIds, avgElixir = 3.5) {
  if (!cardIds || cardIds.length !== 8) return [];

  const deckSet = new Set(cardIds.map(String));
  const archetypeAnalysis = analyzeDeckArchetypes(cardIds);
  const archScores = archetypeAnalysis?.rawScores || {};

  const results = META_DECKS.map(meta => {
    const metaSet = new Set(meta.cardIds.map(String));

    // Shared cards (Jaccard)
    const cardSim = jaccardSimilarity(deckSet, metaSet);

    // Archetype overlap
    const archSim = archetypeOverlap(archScores, meta.archetypes);

    // Avg elixir similarity (inverse of difference, normalized)
    // We don't have exact meta deck elixir here, but we can approximate
    // by looking up cards. Since we don't have cardsData imported here,
    // we'll skip elixir penalty in this pure function and let the caller
    // adjust if needed. Instead we use a static penalty of 0 (neutral).
    const elixirSim = 1.0; // placeholder — caller can adjust

    // Combined: 50% cards, 35% archetype, 15% elixir
    const similarity = Math.round(
      (cardSim * 0.50 + archSim * 0.35 + elixirSim * 0.15) * 100
    );

    const sharedCards = [...deckSet].filter(id => metaSet.has(id));

    return {
      name: meta.name,
      similarity,
      sharedCount: sharedCards.length,
      sharedCards,
      archetypes: meta.archetypes,
    };
  });

  // Sort and return top matches
  return results
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 5);
}

/**
 * Full deck analysis combining all engines.
 * @param {string[]} cardIds - Array of 8 card IDs
 * @param {number} avgElixir - Average elixir cost
 * @returns {object} Complete analysis
 */
export function analyzeDeck(cardIds, avgElixir = 3.5) {
  const archetypes = analyzeDeckArchetypes(cardIds);
  if (!archetypes) return null;

  return {
    archetypes,
    howToWin: getHowToWin(archetypes),
    strengthsWeaknesses: getStrengthsAndWeaknesses(archetypes),
    similarDecks: findSimilarDecks(cardIds, avgElixir),
  };
}

// ─── Exports ──────────────────────────────────────────────────

export { ARCHETYPE_DEFINITIONS, META_DECKS, ALL_ARCHETYPES };
