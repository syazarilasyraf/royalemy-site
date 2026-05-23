/**
 * Arena Deck Recommender - Curated Deck Data
 * All 32 Clash Royale Arenas with deck recommendations
 */

// All 33 Clash Royale Arenas (0-32)
export const ARENAS = [
  { id: 0, name: "Training Camp", unlocks: "Tutorial cards, Basic troops" },
  { id: 1, name: "Goblin Stadium", unlocks: "Goblin, Spear Goblins, Goblin Cage" },
  { id: 2, name: "Bone Pit", unlocks: "Skeletons, Skeleton Army, Bomber, Tombstone" },
  { id: 3, name: "Barbarian Bowl", unlocks: "Barbarians, Barbarian Hut, Fireball" },
  { id: 4, name: "Spell Valley", unlocks: "Wizard, Witch, Poison, Freeze" },
  { id: 5, name: "Builder's Workshop", unlocks: "Mortar, Cannon Cart, Tesla" },
  { id: 6, name: "P.E.K.K.A's Playhouse", unlocks: "P.E.K.K.A, Lightning, Rage" },
  { id: 7, name: "Royal Arena", unlocks: "Royal Giant, Dark Prince, Three Musketeers" },
  { id: 8, name: "Frozen Peak", unlocks: "Ice Wizard, Ice Spirit, Ice Golem" },
  { id: 9, name: "Jungle Arena", unlocks: "Dart Goblin, Goblin Gang, Battle Ram" },
  { id: 10, name: "Hog Mountain", unlocks: "Hog Rider, Executioner, Tornado" },
  { id: 11, name: "Electro Valley", unlocks: "Electro Wizard, Zappies, Electro Dragon" },
  { id: 12, name: "Spooky Town", unlocks: "Graveyard, Ghost, Witch" },
  { id: 13, name: "Rascal's Hideout", unlocks: "Rascals, Cannon Cart, Mega Knight" },
  { id: 14, name: "Serenity Peak", unlocks: "Flying Machine, Royal Hogs, Zappies" },
  { id: 15, name: "Miner's Mine", unlocks: "Miner, Wall Breakers, Battle Healer" },
  { id: 16, name: "Executioner's Kitchen", unlocks: "Executioner, Tornado, Goblin Giant" },
  { id: 17, name: "Royal Crypt", unlocks: "Royal Ghost, Skeleton King, Golden Knight" },
  { id: 18, name: "Silent Sanctuary", unlocks: "Mother Witch, Electro Spirit, Phoenix" },
  { id: 19, name: "Dragon Spa", unlocks: "Skeleton Dragons, Electro Dragon, Baby Dragon" },
  { id: 20, name: "Legendary Arena", unlocks: "All cards, Path of Legends unlocked" },
  { id: 21, name: "Camp Royale", unlocks: "Monk, Card Mastery, Evolutions" },
  { id: 22, name: "Clan Boat", unlocks: "Boat defense mechanics, River races" },
  { id: 23, name: "Trophy Road", unlocks: "Progressive rewards, Seasonal items" },
  { id: 24, name: "Challenger I", unlocks: "League season rewards" },
  { id: 25, name: "Challenger II", unlocks: "Enhanced league rewards" },
  { id: 26, name: "Challenger III", unlocks: "Premium league rewards" },
  { id: 27, name: "Master I", unlocks: "Master tier badges" },
  { id: 28, name: "Master II", unlocks: "Elite master rewards" },
  { id: 29, name: "Master III", unlocks: "Top tier master prizes" },
  { id: 30, name: "Champion", unlocks: "Champion tier exclusives" },
  { id: 31, name: "Grand Champion", unlocks: "Grand champion rewards" },
  { id: 32, name: "Ultimate Champion", unlocks: "Ultimate champion status" },
];

// Curated deck recommendations by arena
export const ARENA_DECKS = {
  1: [ // Goblin Stadium
    {
      id: "goblin-1",
      title: "Goblin Rush",
      arenaId: 1,
      arenaName: "Goblin Stadium",
      cardIds: [26000002, 26000019, 26000010, 26000000, 26000013, 28000008, 26000001, 28000011],
      avgElixir: 2.1,
      tags: ["Fast Cycle", "Beginner Friendly", "F2P Friendly"],
      description: "Fast cycle deck using goblins and cheap troops to overwhelm opponents."
    },
    {
      id: "goblin-2",
      title: "Mini Tank Push",
      arenaId: 1,
      arenaName: "Goblin Stadium",
      cardIds: [26000000, 26000002, 26000019, 26000005, 26000013, 28000008, 26000001, 28000000],
      avgElixir: 2.6,
      tags: ["Easy to Play", "Balanced"],
      description: "Knight leads the charge supported by air and ground troops."
    },
    {
      id: "goblin-3",
      title: "Air Raid",
      arenaId: 1,
      arenaName: "Goblin Stadium",
      cardIds: [26000005, 26000019, 26000010, 26000000, 26000013, 28000001, 26000001, 28000008],
      avgElixir: 2.4,
      tags: ["Air Focus", "Quick Deploy"],
      description: "Minions and support troops take to the skies."
    },
    {
      id: "goblin-4",
      title: "Giant Starter",
      arenaId: 1,
      arenaName: "Goblin Stadium",
      cardIds: [26000003, 26000002, 26000019, 26000010, 28000008, 26000013, 26000001, 28000000],
      avgElixir: 2.6,
      tags: ["Beatdown", "Beginner Friendly"],
      description: "Giant tanks for your support troops. A great starting deck."
    }
  ],
  2: [ // Bone Pit
    {
      id: "bone-1",
      title: "Skeleton Swarm",
      arenaId: 2,
      arenaName: "Bone Pit",
      cardIds: [26000010, 26000012, 26000013, 26000000, 26000019, 28000008, 28000011, 26000001],
      avgElixir: 2.3,
      tags: ["Swarm", "Fast Cycle", "F2P Friendly"],
      description: "Skeletons everywhere! Overwhelm with numbers."
    },
    {
      id: "bone-2",
      title: "Bomber Control",
      arenaId: 2,
      arenaName: "Bone Pit",
      cardIds: [26000013, 26000010, 26000000, 26000019, 28000008, 26000005, 26000001, 28000000],
      avgElixir: 2.5,
      tags: ["Control", "Splash Damage"],
      description: "Use Bomber's splash to clear swarms and counter-push."
    },
    {
      id: "bone-3",
      title: "Tombstone Defense",
      arenaId: 2,
      arenaName: "Bone Pit",
      cardIds: [27000009, 26000010, 26000012, 26000000, 26000019, 28000008, 26000005, 26000001],
      avgElixir: 2.5,
      tags: ["Defensive", "Spawner"],
      description: "Tombstone pulls tanks while skeletons clean up."
    }
  ],
  3: [ // Barbarian Bowl
    {
      id: "barb-1",
      title: "Barbarian Beatdown",
      arenaId: 3,
      arenaName: "Barbarian Bowl",
      cardIds: [26000008, 26000000, 26000005, 28000000, 26000019, 28000008, 26000013, 26000001],
      avgElixir: 3.0,
      tags: ["Beatdown", "Tanky"],
      description: "Barbarians tank while support deals damage from behind."
    },
    {
      id: "barb-2",
      title: "Fireball Cycle",
      arenaId: 3,
      arenaName: "Barbarian Bowl",
      cardIds: [28000000, 26000010, 26000019, 26000000, 28000008, 26000013, 26000005, 26000001],
      avgElixir: 2.5,
      tags: ["Spell Cycle", "Control"],
      description: "Use Fireball for value trades and chip damage."
    },
    {
      id: "barb-3",
      title: "Barrel Hut",
      arenaId: 3,
      arenaName: "Barbarian Bowl",
      cardIds: [27000005, 28000004, 26000008, 26000000, 26000019, 28000008, 26000010, 26000005],
      avgElixir: 3.1,
      tags: ["Spawner", "Pressure"],
      description: "Barbarian Hut generates constant pressure."
    }
  ],
  4: [ // Spell Valley
    {
      id: "spell-1",
      title: "Wizard Support",
      arenaId: 4,
      arenaName: "Spell Valley",
      cardIds: [26000017, 26000000, 26000008, 28000000, 26000019, 28000008, 26000005, 26000001],
      avgElixir: 3.4,
      tags: ["Splash Damage", "Support Heavy"],
      description: "Wizard clears swarms while tanking units push forward."
    },
    {
      id: "spell-2",
      title: "Poison Control",
      arenaId: 4,
      arenaName: "Spell Valley",
      cardIds: [28000009, 26000000, 26000010, 26000019, 26000013, 28000008, 26000005, 26000001],
      avgElixir: 2.5,
      tags: ["Spell Damage", "Control"],
      description: "Poison spell for value and slow pushes."
    },
    {
      id: "spell-3",
      title: "Witch Swarm",
      arenaId: 4,
      arenaName: "Spell Valley",
      cardIds: [26000007, 26000010, 26000000, 26000019, 28000008, 26000013, 26000005, 28000000],
      avgElixir: 2.8,
      tags: ["Spawner", "Splash"],
      description: "Witch spawns skeletons to overwhelm defenses."
    },
    {
      id: "spell-4",
      title: "Freeze Combo",
      arenaId: 4,
      arenaName: "Spell Valley",
      cardIds: [28000005, 26000003, 26000000, 26000019, 26000005, 28000008, 26000013, 26000001],
      avgElixir: 3.0,
      tags: ["Combo", "Surprise"],
      description: "Freeze the tower while Giant deals massive damage."
    }
  ],
  5: [ // Builder's Workshop
    {
      id: "builder-1",
      title: "Mortar Siege",
      arenaId: 5,
      arenaName: "Builder's Workshop",
      cardIds: [27000002, 26000010, 26000019, 26000000, 28000008, 26000013, 26000005, 28000000],
      avgElixir: 2.6,
      tags: ["Siege", "Control"],
      description: "Mortar chips the tower from your side of the bridge."
    },
    {
      id: "builder-2",
      title: "Tesla Defense",
      arenaId: 5,
      arenaName: "Builder's Workshop",
      cardIds: [27000006, 26000000, 26000008, 28000008, 26000019, 26000013, 26000005, 28000000],
      avgElixir: 3.1,
      tags: ["Defensive", "Building"],
      description: "Tesla pulls and zaps attackers effectively."
    },
    {
      id: "builder-3",
      title: "Cannon Cart Push",
      arenaId: 5,
      arenaName: "Builder's Workshop",
      cardIds: [26000054, 26000000, 26000010, 26000019, 28000008, 26000013, 26000005, 28000000],
      avgElixir: 2.8,
      tags: ["Ground Only", "High Damage"],
      description: "Cannon Cart transforms and deals massive tower damage."
    }
  ],
  6: [ // P.E.K.K.A's Playhouse
    {
      id: "pekka-1",
      title: "P.E.K.K.A Beatdown",
      arenaId: 6,
      arenaName: "P.E.K.K.A's Playhouse",
      cardIds: [26000004, 26000017, 26000000, 28000007, 26000019, 28000008, 26000013, 26000005],
      avgElixir: 3.8,
      tags: ["Beatdown", "Tank", "High Cost"],
      description: "P.E.K.K.A tanks everything while support cleans up."
    },
    {
      id: "pekka-2",
      title: "Lightning Strike",
      arenaId: 6,
      arenaName: "P.E.K.K.A's Playhouse",
      cardIds: [28000007, 26000003, 26000000, 26000017, 26000019, 28000008, 26000013, 26000005],
      avgElixir: 3.5,
      tags: ["Spell", "Heavy Damage"],
      description: "Lightning spell for value trades on support troops."
    },
    {
      id: "pekka-3",
      title: "Rage Rush",
      arenaId: 6,
      arenaName: "P.E.K.K.A's Playhouse",
      cardIds: [28000002, 26000008, 26000005, 26000010, 26000019, 28000008, 26000000, 26000013],
      avgElixir: 2.5,
      tags: ["Aggressive", "Fast"],
      description: "Rage spell makes your push unstoppable."
    },
    {
      id: "pekka-4",
      title: "Mini P.E.K.K.A Counter",
      arenaId: 6,
      arenaName: "P.E.K.K.A's Playhouse",
      cardIds: [26000018, 26000010, 26000019, 26000000, 28000008, 26000013, 26000005, 28000000],
      avgElixir: 2.6,
      tags: ["Counter Push", "Anti-Tank"],
      description: "Mini P.E.K.K.A defends then counter-pushes hard."
    }
  ],
  7: [ // Royal Arena
    {
      id: "royal-1",
      title: "Royal Giant Siege",
      arenaId: 7,
      arenaName: "Royal Arena",
      cardIds: [26000024, 26000017, 28000009, 26000000, 26000019, 28000008, 26000013, 28000011],
      avgElixir: 3.3,
      tags: ["Siege", "Win Condition"],
      description: "Royal Giant tanks tower shots while dealing massive damage."
    },
    {
      id: "royal-2",
      title: "Dark Prince Rush",
      arenaId: 7,
      arenaName: "Royal Arena",
      cardIds: [26000027, 26000010, 26000019, 26000000, 28000008, 26000013, 28000011, 26000005],
      avgElixir: 2.4,
      tags: ["Fast Push", "Dash"],
      description: "Dark Prince's dash catches opponents off guard."
    },
    {
      id: "royal-3",
      title: "Three Musketeers Split",
      arenaId: 7,
      arenaName: "Royal Arena",
      cardIds: [26000028, 26000010, 26000019, 28000008, 26000000, 26000013, 26000005, 28000000],
      avgElixir: 3.3,
      tags: ["High Cost", "Split Lane"],
      description: "Split Three Musketeers for dual lane pressure."
    }
  ],
  8: [ // Frozen Peak
    {
      id: "frozen-1",
      title: "Ice Wizard Control",
      arenaId: 8,
      arenaName: "Frozen Peak",
      cardIds: [26000023, 26000010, 26000019, 26000000, 28000008, 26000013, 26000005, 28000000],
      avgElixir: 2.5,
      tags: ["Control", "Slow Down"],
      description: "Ice Wizard slows everything to a crawl."
    },
    {
      id: "frozen-2",
      title: "Ice Spirit Cycle",
      arenaId: 8,
      arenaName: "Frozen Peak",
      cardIds: [26000030, 26000010, 26000019, 26000000, 28000008, 26000013, 26000005, 26000021],
      avgElixir: 2.3,
      tags: ["Fast Cycle", "F2P Friendly"],
      description: "1-elixir Ice Spirit for maximum value."
    },
    {
      id: "frozen-3",
      title: "Ice Golem Tank",
      arenaId: 8,
      arenaName: "Frozen Peak",
      cardIds: [26000038, 26000017, 26000010, 26000019, 28000008, 26000013, 26000005, 28000000],
      avgElixir: 2.8,
      tags: ["Cheap Tank", "Kite"],
      description: "Ice Golem kites and tanks for cheap."
    }
  ],
  9: [ // Jungle Arena
    {
      id: "jungle-1",
      title: "Log Bait Classic",
      arenaId: 9,
      arenaName: "Jungle Arena",
      cardIds: [26000032, 26000041, 28000011, 28000004, 26000026, 26000010, 28000012, 26000013],
      avgElixir: 2.5,
      tags: ["Log Bait", "Classic Deck", "Trophy Push"],
      description: "Bait out The Log, then punish with Goblin Barrel."
    },
    {
      id: "jungle-2",
      title: "Battle Ram Bridge",
      arenaId: 9,
      arenaName: "Jungle Arena",
      cardIds: [26000036, 26000017, 28000012, 26000000, 26000019, 28000008, 26000013, 26000005],
      avgElixir: 3.0,
      tags: ["Bridge Spam", "Aggressive"],
      description: "Constant pressure at the bridge with Battle Ram."
    },
    {
      id: "jungle-3",
      title: "Dart Goblin Sniper",
      arenaId: 9,
      arenaName: "Jungle Arena",
      cardIds: [26000040, 26000010, 26000019, 26000000, 28000008, 26000013, 26000005, 28000000],
      avgElixir: 2.5,
      tags: ["Range", "Fast Attack"],
      description: "Dart Goblin shoots from a safe distance."
    },
    {
      id: "jungle-4",
      title: "Goblin Gang Swarm",
      arenaId: 9,
      arenaName: "Jungle Arena",
      cardIds: [26000041, 28000004, 26000010, 26000019, 26000000, 28000008, 26000013, 28000011],
      avgElixir: 2.3,
      tags: ["Swarm", "Bait"],
      description: "Goblin Gang provides massive value for 3 elixir."
    }
  ],
  10: [ // Hog Mountain
    {
      id: "hog-1",
      title: "Hog Cycle 2.6",
      arenaId: 10,
      arenaName: "Hog Mountain",
      cardIds: [26000021, 26000030, 28000008, 26000010, 26000000, 26000020, 28000012, 26000004],
      avgElixir: 3.4,
      tags: ["Classic Deck", "Fast Cycle", "F2P Friendly", "Trophy Push"],
      description: "The legendary 2.6 Hog Cycle - fast, efficient, deadly."
    },
    {
      id: "hog-2",
      title: "Tornado Executioner",
      arenaId: 10,
      arenaName: "Hog Mountain",
      cardIds: [26000045, 28000012, 26000021, 26000000, 26000019, 28000008, 26000013, 28000000],
      avgElixir: 3.1,
      tags: ["Splash Damage", "Control"],
      description: "Tornado + Executioner combo destroys pushes."
    },
    {
      id: "hog-3",
      title: "Hog Exe Nado",
      arenaId: 10,
      arenaName: "Hog Mountain",
      cardIds: [26000021, 26000045, 28000012, 26000000, 26000010, 28000008, 26000005, 28000000],
      avgElixir: 3.1,
      tags: ["Meta Deck", "Defensive"],
      description: "Strong defense with ExeNado, counter-push with Hog."
    },
    {
      id: "hog-4",
      title: "Rocket Cycle",
      arenaId: 10,
      arenaName: "Hog Mountain",
      cardIds: [28000003, 26000021, 26000010, 26000019, 26000000, 28000008, 26000013, 26000030],
      avgElixir: 2.6,
      tags: ["Spell Cycle", "Trophy Push"],
      description: "Rocket the tower for clutch wins."
    }
  ],
  11: [ // Electro Valley
    {
      id: "electro-1",
      title: "Electro Wizard Control",
      arenaId: 11,
      arenaName: "Electro Valley",
      cardIds: [26000042, 26000010, 26000019, 26000000, 28000008, 26000013, 26000005, 28000000],
      avgElixir: 2.6,
      tags: ["Reset", "Control"],
      description: "Electro Wizard resets charges and stuns."
    },
    {
      id: "electro-2",
      title: "Zappies Trifecta",
      arenaId: 11,
      arenaName: "Electro Valley",
      cardIds: [26000052, 26000036, 26000010, 26000019, 26000000, 28000008, 26000013, 28000000],
      avgElixir: 2.8,
      tags: ["Stun", "Control"],
      description: "Zappies stun-lock enemies while Battle Ram hits."
    },
    {
      id: "electro-3",
      title: "Electro Dragon Chain",
      arenaId: 11,
      arenaName: "Electro Valley",
      cardIds: [26000063, 26000003, 26000010, 26000019, 26000000, 28000008, 26000013, 28000000],
      avgElixir: 3.0,
      tags: ["Chain Damage", "Air"],
      description: "Electro Dragon's chain lightning hits multiple targets."
    }
  ],
  12: [ // Spooky Town
    {
      id: "spooky-1",
      title: "Graveyard Control",
      arenaId: 12,
      arenaName: "Spooky Town",
      cardIds: [28000010, 26000038, 26000017, 28000009, 26000010, 28000008, 26000013, 26000001],
      avgElixir: 3.1,
      tags: ["Win Condition", "Spell"],
      description: "Graveyard at the tower with tank support."
    },
    {
      id: "spooky-2",
      title: "Royal Ghost Aggro",
      arenaId: 12,
      arenaName: "Spooky Town",
      cardIds: [26000050, 26000010, 26000019, 26000000, 28000008, 26000013, 28000011, 26000005],
      avgElixir: 2.3,
      tags: ["Invisible", "Ambush"],
      description: "Royal Ghost sneaks up and deals massive damage."
    },
    {
      id: "spooky-3",
      title: "Witch Graveyard",
      arenaId: 12,
      arenaName: "Spooky Town",
      cardIds: [26000007, 28000010, 26000010, 26000019, 26000000, 28000008, 26000013, 28000000],
      avgElixir: 3.0,
      tags: ["Spooky", "Swarm"],
      description: "Double the skeletons, double the fun."
    }
  ],
  13: [ // Rascal's Hideout
    {
      id: "rascal-1",
      title: "Mega Knight Control",
      arenaId: 13,
      arenaName: "Rascal's Hideout",
      cardIds: [26000055, 26000053, 26000040, 26000019, 28000008, 26000013, 26000005, 28000000],
      avgElixir: 3.5,
      tags: ["Splash Tank", "Defensive"],
      description: "Mega Knight for defense, counter-push with support."
    },
    {
      id: "rascal-2",
      title: "Rascals Bait",
      arenaId: 13,
      arenaName: "Rascal's Hideout",
      cardIds: [26000053, 28000004, 26000026, 28000011, 26000010, 28000008, 26000013, 26000001],
      avgElixir: 2.6,
      tags: ["Bait", "Spell Bait"],
      description: "Rascals tank while barrel gets spell value."
    },
    {
      id: "rascal-3",
      title: "Bridge Spam MK",
      arenaId: 13,
      arenaName: "Rascal's Hideout",
      cardIds: [26000055, 26000036, 26000027, 26000019, 26000010, 28000008, 26000013, 28000011],
      avgElixir: 3.0,
      tags: ["Bridge Spam", "Aggressive"],
      description: "Constant pressure from the bridge with MK."
    }
  ],
  14: [ // Serenity Peak
    {
      id: "serenity-1",
      title: "Flying Machine Air",
      arenaId: 14,
      arenaName: "Serenity Peak",
      cardIds: [26000057, 26000010, 26000019, 26000000, 28000008, 26000013, 26000005, 28000000],
      avgElixir: 2.6,
      tags: ["Air", "Range"],
      description: "Flying Machine shoots from a safe distance."
    },
    {
      id: "serenity-2",
      title: "Royal Hogs Split",
      arenaId: 14,
      arenaName: "Serenity Peak",
      cardIds: [26000059, 26000010, 26000019, 26000000, 28000008, 26000013, 26000005, 28000012],
      avgElixir: 2.6,
      tags: ["Split Lane", "Pressure"],
      description: "Royal Hogs split for dual lane pressure."
    },
    {
      id: "serenity-3",
      title: "Zappies Control",
      arenaId: 14,
      arenaName: "Serenity Peak",
      cardIds: [26000052, 26000057, 26000010, 26000019, 26000000, 28000008, 26000013, 28000000],
      avgElixir: 2.8,
      tags: ["Control", "Stun"],
      description: "Zappies and Flying Machine control the field."
    }
  ],
  15: [ // Miner's Mine
    {
      id: "miner-1",
      title: "Miner Poison",
      arenaId: 15,
      arenaName: "Miner's Mine",
      cardIds: [26000032, 28000009, 26000010, 26000019, 26000000, 28000008, 26000013, 26000005],
      avgElixir: 2.5,
      tags: ["Chip Damage", "Control"],
      description: "Miner + Poison chip away at the tower."
    },
    {
      id: "miner-2",
      title: "Wall Breaker Blitz",
      arenaId: 15,
      arenaName: "Miner's Mine",
      cardIds: [26000058, 26000010, 26000019, 26000000, 28000008, 26000013, 26000005, 28000011],
      avgElixir: 2.1,
      tags: ["Fast", "Surprise"],
      description: "Wall Breakers blast the tower quickly."
    },
    {
      id: "miner-3",
      title: "Battle Healer Elixir",
      arenaId: 15,
      arenaName: "Miner's Mine",
      cardIds: [26000068, 26000003, 26000010, 26000019, 26000000, 28000008, 26000013, 26000005],
      avgElixir: 2.8,
      tags: ["Healing", "Sustain"],
      description: "Battle Healer keeps your push alive."
    }
  ],
  16: [ // Executioner's Kitchen
    {
      id: "exec-1",
      title: "Executioner Tornado",
      arenaId: 16,
      arenaName: "Executioner's Kitchen",
      cardIds: [26000045, 28000012, 26000010, 26000019, 26000000, 28000008, 26000013, 26000060],
      avgElixir: 3.0,
      tags: ["Splash", "Control"],
      description: "Executioner + Tornado destroys everything."
    },
    {
      id: "exec-2",
      title: "Goblin Giant Sparky",
      arenaId: 16,
      arenaName: "Executioner's Kitchen",
      cardIds: [26000060, 26000033, 26000010, 26000019, 26000000, 28000008, 26000013, 28000000],
      avgElixir: 3.3,
      tags: ["High Damage", "Beatdown"],
      description: "Sparky behind Goblin Giant = dead tower."
    },
    {
      id: "exec-3",
      title: "Tornado Cycle",
      arenaId: 16,
      arenaName: "Executioner's Kitchen",
      cardIds: [28000012, 26000010, 26000019, 26000000, 26000030, 28000008, 26000013, 26000005],
      avgElixir: 2.1,
      tags: ["Spell", "Cycle"],
      description: "Tornado for value plays and king activation."
    }
  ],
  17: [ // Royal Crypt
    {
      id: "crypt-1",
      title: "Skeleton King Swarm",
      arenaId: 17,
      arenaName: "Royal Crypt",
      cardIds: [26000069, 26000012, 26000010, 26000041, 26000019, 28000008, 26000005, 28000000],
      avgElixir: 2.8,
      tags: ["Champion", "Swarm"],
      description: "Skeleton King's ability with swarm troops."
    },
    {
      id: "crypt-2",
      title: "Golden Knight Bridge",
      arenaId: 17,
      arenaName: "Royal Crypt",
      cardIds: [26000074, 26000036, 26000017, 26000010, 26000019, 28000008, 26000013, 28000011],
      avgElixir: 2.8,
      tags: ["Champion", "Dash"],
      description: "Golden Knight dashes through defenses."
    },
    {
      id: "crypt-3",
      title: "Royal Ghost Control",
      arenaId: 17,
      arenaName: "Royal Crypt",
      cardIds: [26000050, 26000069, 26000010, 26000019, 26000000, 28000008, 26000013, 28000000],
      avgElixir: 2.6,
      tags: ["Champion", "Invisible"],
      description: "Double ghost trouble for your opponent."
    }
  ],
  18: [ // Silent Sanctuary
    {
      id: "silent-1",
      title: "Mother Witch Hogs",
      arenaId: 18,
      arenaName: "Silent Sanctuary",
      cardIds: [26000083, 26000059, 26000010, 26000019, 26000000, 28000008, 26000013, 28000000],
      avgElixir: 2.9,
      tags: ["Legendary", "Swarm Counter"],
      description: "Mother Witch turns enemy swarms into hogs."
    },
    {
      id: "silent-2",
      title: "Electro Spirit Cycle",
      arenaId: 18,
      arenaName: "Silent Sanctuary",
      cardIds: [26000084, 26000010, 26000019, 26000000, 26000030, 28000008, 26000013, 26000021],
      avgElixir: 2.0,
      tags: ["1-Elixir", "Fast Cycle"],
      description: "Electro Spirit chains for massive value."
    },
    {
      id: "silent-3",
      title: "Phoenix Rebirth",
      arenaId: 18,
      arenaName: "Silent Sanctuary",
      cardIds: [26000087, 26000010, 26000019, 26000000, 28000008, 26000013, 26000005, 28000000],
      avgElixir: 2.6,
      tags: ["Legendary", "Revive"],
      description: "Phoenix revives and keeps fighting."
    }
  ],
  19: [ // Dragon Spa
    {
      id: "dragon-1",
      title: "Phoenix Cycle",
      arenaId: 19,
      arenaName: "Dragon Spa",
      cardIds: [26000087, 26000030, 26000010, 26000000, 28000008, 26000013, 26000019, 28000012],
      avgElixir: 2.3,
      tags: ["Legendary", "Fast Cycle"],
      description: "Phoenix revives and keeps pressure."
    },
    {
      id: "dragon-2",
      title: "Skeleton Dragon Bait",
      arenaId: 19,
      arenaName: "Dragon Spa",
      cardIds: [26000080, 28000004, 26000041, 28000011, 26000010, 28000008, 26000013, 26000001],
      avgElixir: 2.5,
      tags: ["Air Splash", "Bait"],
      description: "Skeleton Dragons clear swarms, barrel for damage."
    },
    {
      id: "dragon-3",
      title: "Triple Dragon",
      arenaId: 19,
      arenaName: "Dragon Spa",
      cardIds: [26000080, 26000015, 26000063, 26000010, 26000019, 26000000, 28000008, 26000013],
      avgElixir: 2.9,
      tags: ["Air Heavy", "Splash"],
      description: "All three dragons for maximum aerial dominance."
    }
  ],
  20: [ // Legendary Arena
    {
      id: "legendary-1",
      title: "Classic Log Bait",
      arenaId: 20,
      arenaName: "Legendary Arena",
      cardIds: [28000004, 26000032, 26000041, 28000011, 26000026, 26000010, 28000012, 26000013],
      avgElixir: 2.5,
      tags: ["Classic", "Trophy Push", "Meta"],
      description: "The classic Log Bait deck that never goes out of style."
    },
    {
      id: "legendary-2",
      title: "2.6 Hog Cycle",
      arenaId: 20,
      arenaName: "Legendary Arena",
      cardIds: [26000021, 26000030, 28000008, 26000010, 26000000, 26000020, 28000012, 26000004],
      avgElixir: 3.4,
      tags: ["Classic", "F2P Friendly", "Legendary"],
      description: "The most famous F2P deck in Clash Royale history."
    },
    {
      id: "legendary-3",
      title: "Golem Beatdown",
      arenaId: 20,
      arenaName: "Legendary Arena",
      cardIds: [26000009, 26000017, 26000025, 28000009, 26000003, 28000008, 26000005, 28000000],
      avgElixir: 4.3,
      tags: ["Beatdown", "Tank", "Heavy"],
      description: "Classic Golem beatdown for tower destruction."
    },
    {
      id: "legendary-4",
      title: "LavaLoon",
      arenaId: 20,
      arenaName: "Legendary Arena",
      cardIds: [26000029, 26000006, 26000005, 26000022, 28000001, 26000019, 28000008, 26000013],
      avgElixir: 3.6,
      tags: ["Air Beatdown", "Devastating"],
      description: "Lava Hound + Balloon = tower meltdown."
    },
    {
      id: "legendary-5",
      title: "X-Bow 3.0",
      arenaId: 20,
      arenaName: "Legendary Arena",
      cardIds: [27000008, 26000038, 26000010, 26000030, 28000008, 26000013, 26000019, 28000012],
      avgElixir: 2.5,
      tags: ["Siege", "Control", "Skill"],
      description: "The most skilled archetype - X-Bow lockdown."
    },
    {
      id: "legendary-6",
      title: "Ram Rider Bridge",
      arenaId: 20,
      arenaName: "Legendary Arena",
      cardIds: [26000051, 26000036, 26000027, 26000010, 26000019, 26000000, 28000008, 26000013],
      avgElixir: 2.8,
      tags: ["Bridge Spam", "Snare"],
      description: "Ram Rider snares while Battle Ram bashes."
    }
  ],
  21: [ // Camp Royale
    {
      id: "camp-1",
      title: "Monk Cycle",
      arenaId: 21,
      arenaName: "Camp Royale",
      cardIds: [26000077, 26000030, 26000010, 26000019, 26000000, 28000008, 26000013, 28000012],
      avgElixir: 2.4,
      tags: ["Champion", "Fast Cycle"],
      description: "Monk's ability counters spells and big pushes."
    },
    {
      id: "camp-2",
      title: "Little Prince Control",
      arenaId: 21,
      arenaName: "Camp Royale",
      cardIds: [26000093, 26000010, 26000019, 26000000, 28000008, 26000013, 26000005, 28000000],
      avgElixir: 2.5,
      tags: ["Champion", "Range"],
      description: "Little Prince deals massive damage from range."
    },
    {
      id: "camp-3",
      title: "Evolution Beatdown",
      arenaId: 21,
      arenaName: "Camp Royale",
      cardIds: [26000009, 26000008, 26000010, 26000019, 26000000, 28000008, 26000013, 26000005],
      avgElixir: 3.3,
      tags: ["Evolutions", "Beatdown"],
      description: "Use Card Evolutions for overwhelming power."
    }
  ],
  // Arenas 22-32 - Placeholder decks for higher leagues
  22: [ // Clan Boat
    {
      id: "boat-1",
      title: "River Race Rush",
      arenaId: 22,
      arenaName: "Clan Boat",
      cardIds: [26000036, 26000021, 26000010, 26000019, 26000000, 28000008, 26000013, 28000011],
      avgElixir: 2.5,
      tags: ["Fast", "Clan War"],
      description: "Quick deck for river race battles."
    },
    {
      id: "boat-2",
      title: "Boat Defense",
      arenaId: 22,
      arenaName: "Clan Boat",
      cardIds: [27000008, 26000045, 28000012, 26000010, 26000019, 26000000, 28000008, 26000013],
      avgElixir: 3.0,
      tags: ["Defensive", "Siege"],
      description: "Defend your boat with X-Bow control."
    }
  ],
  23: [ // Trophy Road
    {
      id: "road-1",
      title: "Road to Legendary",
      arenaId: 23,
      arenaName: "Trophy Road",
      cardIds: [26000021, 26000030, 26000010, 26000019, 26000000, 28000008, 26000013, 28000011],
      avgElixir: 2.1,
      tags: ["Trophy Push", "Fast"],
      description: "Push trophies quickly with this efficient deck."
    },
    {
      id: "road-2",
      title: "Season Grinder",
      arenaId: 23,
      arenaName: "Trophy Road",
      cardIds: [26000055, 26000010, 26000019, 26000000, 28000008, 26000013, 26000005, 28000000],
      avgElixir: 3.0,
      tags: ["Meta", "Reliable"],
      description: "Grind the trophy road with MK control."
    }
  ],
  24: [ // Challenger I
    {
      id: "chal1-1",
      title: "Challenger Control",
      arenaId: 24,
      arenaName: "Challenger I",
      cardIds: [26000023, 28000012, 26000010, 26000019, 26000000, 28000008, 26000013, 26000005],
      avgElixir: 2.4,
      tags: ["Control", "League Ready"],
      description: "Solid control deck for Challenger league."
    }
  ],
  25: [ // Challenger II
    {
      id: "chal2-1",
      title: "Challenger Aggro",
      arenaId: 25,
      arenaName: "Challenger II",
      cardIds: [26000036, 26000027, 26000010, 26000019, 26000000, 28000008, 26000013, 28000011],
      avgElixir: 2.5,
      tags: ["Aggressive", "Bridge Spam"],
      description: "Aggressive plays for Challenger II."
    }
  ],
  26: [ // Challenger III
    {
      id: "chal3-1",
      title: "Challenger Master",
      arenaId: 26,
      arenaName: "Challenger III",
      cardIds: [26000045, 26000042, 26000010, 26000019, 26000000, 28000008, 26000013, 28000000],
      avgElixir: 2.9,
      tags: ["Advanced", "High Skill"],
      description: "Master level deck for Challenger III."
    }
  ],
  27: [ // Master I
    {
      id: "master1-1",
      title: "Master Control",
      arenaId: 27,
      arenaName: "Master I",
      cardIds: [26000072, 26000010, 26000019, 26000000, 28000008, 26000013, 26000005, 28000012],
      avgElixir: 2.5,
      tags: ["Champion", "Master Tier"],
      description: "Archer Queen control for Master league."
    }
  ],
  28: [ // Master II
    {
      id: "master2-1",
      title: "Master Elite",
      arenaId: 28,
      arenaName: "Master II",
      cardIds: [26000077, 26000074, 26000010, 26000019, 26000000, 28000008, 26000013, 28000000],
      avgElixir: 2.9,
      tags: ["Double Champion", "Elite"],
      description: "Double champions for Master II battles."
    }
  ],
  29: [ // Master III
    {
      id: "master3-1",
      title: "Master Supreme",
      arenaId: 29,
      arenaName: "Master III",
      cardIds: [26000069, 26000077, 26000010, 26000019, 26000000, 28000008, 26000013, 28000000],
      avgElixir: 2.9,
      tags: ["Top Tier", "Champions"],
      description: "Supreme deck for top Master players."
    }
  ],
  30: [ // Champion
    {
      id: "champ-1",
      title: "Champion Deck",
      arenaId: 30,
      arenaName: "Champion",
      cardIds: [26000072, 26000077, 26000074, 26000010, 26000019, 28000008, 26000013, 28000000],
      avgElixir: 3.0,
      tags: ["Champion", "All Champions"],
      description: "Triple champion deck for Champion league."
    }
  ],
  31: [ // Grand Champion
    {
      id: "grand-1",
      title: "Grand Champion Meta",
      arenaId: 31,
      arenaName: "Grand Champion",
      cardIds: [26000093, 26000077, 26000069, 26000010, 26000019, 28000008, 26000013, 28000000],
      avgElixir: 2.9,
      tags: ["Grand", "Top Meta"],
      description: "Meta deck for Grand Champion players."
    }
  ],
  32: [ // Ultimate Champion
    {
      id: "ultimate-1",
      title: "Ultimate Deck",
      arenaId: 32,
      arenaName: "Ultimate Champion",
      cardIds: [26000093, 26000077, 26000072, 26000074, 26000069, 28000008, 26000013, 28000000],
      avgElixir: 3.5,
      tags: ["Ultimate", "All Champions"],
      description: "The ultimate deck for the best players."
    }
  ]
};

// Deterministic pseudo-random generator for deck stats
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

/**
 * Generate simulated stats for a deck based on its ID
 * This ensures the same deck always gets the same stats
 */
export function generateDeckStats(deck) {
  const seed = hashString(deck.id);
  const rand = (min, max) => Math.floor(seededRandom(seed + min + max) * (max - min + 1)) + min;
  const randFloat = (min, max) => Number((seededRandom(seed + min * 10) * (max - min) + min).toFixed(1));

  const difficulties = ['Easy', 'Medium', 'Hard'];
  const winRate = randFloat(48.5, 64.2);
  const usageCount = rand(120, 8500);
  const difficulty = difficulties[rand(0, 2)];

  return {
    winRate,
    usageCount,
    difficulty,
  };
}

/**
 * Enrich decks with generated stats
 */
export function enrichDecksWithStats(decks) {
  return decks.map(deck => ({
    ...deck,
    stats: generateDeckStats(deck)
  }));
}

// Helper function to get decks for an arena
export function getDecksForArena(arenaId) {
  const decks = ARENA_DECKS[arenaId] || [];
  return enrichDecksWithStats(decks);
}

// Helper to get all decks across all arenas
export function getAllDecks() {
  return Object.values(ARENA_DECKS).flat();
}

// Helper to get all arena IDs that have decks
export function getAvailableArenaIds() {
  return Object.keys(ARENA_DECKS).map(id => parseInt(id));
}

// Helper to get arena info by ID
export function getArenaById(arenaId) {
  return ARENAS.find(arena => arena.id === arenaId);
}

// All unique deck tags across all decks
export function getAllDeckTags() {
  const tags = new Set();
  Object.values(ARENA_DECKS).forEach(decks => {
    decks.forEach(deck => deck.tags.forEach(tag => tags.add(tag)));
  });
  return Array.from(tags).sort();
}
