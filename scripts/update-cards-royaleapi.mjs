/**
 * Clash Royale Card Asset Updater
 * Downloads card images (base, evolution, hero) from RoyaleAPI CDN
 * and converts them to WebP for use in the project.
 *
 * This script does NOT require a Clash Royale API token.
 * Image source: https://cdn.royaleapi.com/static/img/cards/{key}.png
 *
 * Run from project root:
 *   node scripts/update-cards-royaleapi.mjs
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const CARDS_JSON_PATH = path.join(ROOT, 'client', 'src', 'data', 'cards.json');
const PUBLIC_CARDS_DIR = path.join(ROOT, 'client', 'public', 'cards');
const DIST_CARDS_DIR = path.join(ROOT, 'client', 'dist', 'cards');
const ROYALE_API_CARDS_URL = 'https://royaleapi.github.io/cr-api-data/json/cards.json';
const CDN_BASE_URL = 'https://cdn.royaleapi.com/static/img/cards';

// New cards to add that are not in any existing data source
const NEW_CARDS = [
  {
    id: 26000106,
    name: 'Ronin',
    key: 'ronin',
    elixir: 5,
    rarity: 'legendary',
    type: 'troop'
  }
];

// Event-only / limited-time cards to exclude from the default card list
const EXCLUDED_IDS = new Set([
  '26000066', // Super Witch
  '26000070', // Super Lava Hound
  '26000071', // Super Magic Archer
  '26000073', // Santa Hog Rider
  '26000075', // Super Ice Golem
  '26000078', // Super Archers
  '26000081', // Terry
  '26000082', // Super Mini P.E.K.K.A
  '26000086', // Raging Prince
  '27000014', // Party Hut
  '28000020'  // Party Rocket
]);

// Manual key overrides for edge cases
const KEY_OVERRIDES = {
  // None needed currently; RoyaleAPI keys + name-to-key cover all known cards.
  // Add here if a future card has a non-obvious CDN key.
};

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchJson(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      if (i === retries - 1) throw err;
      await sleep(1000 * (i + 1));
    }
  }
}

async function downloadImage(url, retries = 2) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, { headers: { Accept: 'image/png,image/*' } });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return Buffer.from(await res.arrayBuffer());
    } catch (err) {
      if (i === retries - 1) return null;
      await sleep(500 * (i + 1));
    }
  }
  return null;
}

function nameToKey(name) {
  return name
    .toLowerCase()
    .replace(/\./g, '')
    .replace(/'/g, '')
    .replace(/!/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function getRarity(rarity) {
  return rarity ? rarity.toLowerCase() : 'common';
}

function getType(card) {
  if (card.type) {
    const t = String(card.type).toLowerCase();
    if (t === 'building') return 'building';
    if (t === 'spell') return 'spell';
    return 'troop';
  }
  const id = String(card.id);
  if (id.startsWith('27')) return 'building';
  if (id.startsWith('28')) return 'spell';
  return 'troop';
}

async function convertPngToWebp(pngPath, webpPath) {
  await sharp(pngPath).webp({ quality: 85, effort: 4 }).toFile(webpPath);
}

async function processCard(card, key, index, total) {
  const id = String(card.id);
  const results = { base: false, evo: false, hero: false };

  // Base image
  const baseUrl = `${CDN_BASE_URL}/${key}.png`;
  const basePng = path.join(PUBLIC_CARDS_DIR, `${id}.png`);
  const baseWebp = path.join(PUBLIC_CARDS_DIR, `${id}.webp`);

  const baseImg = await downloadImage(baseUrl);
  if (baseImg) {
    await fs.writeFile(basePng, baseImg);
    await convertPngToWebp(basePng, baseWebp);
    await fs.unlink(basePng);
    results.base = true;
  }

  // Evolution image
  const evoUrl = `${CDN_BASE_URL}/${key}-ev1.png`;
  const evoPng = path.join(PUBLIC_CARDS_DIR, `${id}_evo.png`);
  const evoWebp = path.join(PUBLIC_CARDS_DIR, `${id}_evo.webp`);

  const evoImg = await downloadImage(evoUrl);
  if (evoImg) {
    await fs.writeFile(evoPng, evoImg);
    await convertPngToWebp(evoPng, evoWebp);
    await fs.unlink(evoPng);
    card.evolutionImage = `/cards/${id}_evo.webp`;
    results.evo = true;
  } else {
    delete card.evolutionImage;
  }

  // Hero image
  const heroUrl = `${CDN_BASE_URL}/${key}-hero.png`;
  const heroPng = path.join(PUBLIC_CARDS_DIR, `${id}_hero.png`);
  const heroWebp = path.join(PUBLIC_CARDS_DIR, `${id}_hero.webp`);

  const heroImg = await downloadImage(heroUrl);
  if (heroImg) {
    await fs.writeFile(heroPng, heroImg);
    await convertPngToWebp(heroPng, heroWebp);
    await fs.unlink(heroPng);
    card.heroImage = `/cards/${id}_hero.webp`;
    results.hero = true;
  } else {
    delete card.heroImage;
  }

  // Safety cleanup
  for (const leftover of [basePng, evoPng, heroPng]) {
    try { await fs.unlink(leftover); } catch {}
  }

  const flags = [
    results.base ? 'base' : 'MISSING',
    results.evo ? 'evo' : '',
    results.hero ? 'hero' : ''
  ].filter(Boolean).join('|');

  console.log(`  [${index}/${total}] ${id} - ${card.name} (${key}) [${flags}]`);
  await sleep(30);

  return results;
}

async function main() {
  console.log('========================================');
  console.log('  Clash Royale Card Asset Updater');
  console.log('  (RoyaleAPI CDN Edition)');
  console.log('========================================\n');

  await fs.mkdir(PUBLIC_CARDS_DIR, { recursive: true });
  await fs.mkdir(DIST_CARDS_DIR, { recursive: true });

  // Load existing local cards
  console.log('Loading existing cards.json...');
  const localCardsRaw = await fs.readFile(CARDS_JSON_PATH, 'utf8');
  const localCards = JSON.parse(localCardsRaw);

  // Fetch RoyaleAPI card data for key mapping and missing cards
  console.log('Fetching RoyaleAPI card data...');
  let remoteCards = [];
  try {
    remoteCards = await fetchJson(ROYALE_API_CARDS_URL);
    console.log(`  Found ${remoteCards.length} cards in RoyaleAPI data`);
  } catch (err) {
    console.warn(`  Warning: Could not fetch RoyaleAPI data: ${err.message}`);
  }

  // Build id -> key mapping
  const keyMap = {};
  for (const card of remoteCards) {
    keyMap[String(card.id)] = card.key;
  }
  for (const [id, key] of Object.entries(KEY_OVERRIDES)) {
    keyMap[id] = key;
  }
  for (const card of NEW_CARDS) {
    keyMap[String(card.id)] = card.key;
  }

  // Build comprehensive card map (excluding event-only cards)
  const cardsMap = {};
  for (const [id, card] of Object.entries(localCards)) {
    if (EXCLUDED_IDS.has(id)) continue;
    cardsMap[id] = { ...card };
  }

  // Add remote-only cards (excluding event-only cards)
  for (const card of remoteCards) {
    const id = String(card.id);
    if (EXCLUDED_IDS.has(id)) continue;
    if (!cardsMap[id]) {
      cardsMap[id] = {
        id: card.id,
        name: card.name,
        image: `/cards/${id}.webp`,
        elixir: card.elixir ?? 0,
        rarity: getRarity(card.rarity),
        type: getType(card)
      };
    }
  }

  // Add new cards (excluding event-only cards)
  for (const card of NEW_CARDS) {
    const id = String(card.id);
    if (!cardsMap[id]) {
      cardsMap[id] = {
        id: card.id,
        name: card.name,
        image: `/cards/${id}.webp`,
        elixir: card.elixir,
        rarity: getRarity(card.rarity),
        type: getType(card)
      };
    }
  }

  // Ensure Tombstone has heroImage reference
  if (cardsMap['27000009']) {
    // Will be set after download if hero image exists
  }

  // Determine keys for all cards
  for (const [id, card] of Object.entries(cardsMap)) {
    if (!keyMap[id]) {
      keyMap[id] = nameToKey(card.name);
    }
  }

  const sortedIds = Object.keys(cardsMap).sort((a, b) => parseInt(a) - parseInt(b));
  console.log(`\nTotal cards to process: ${sortedIds.length}\n`);

  // Process cards sequentially to be polite to the CDN
  console.log('Downloading and converting images...');
  let baseOk = 0;
  let evoOk = 0;
  let heroOk = 0;
  let missingBase = [];

  for (let i = 0; i < sortedIds.length; i++) {
    const id = sortedIds[i];
    const card = cardsMap[id];
    const key = keyMap[id];

    if (!key) {
      console.log(`  [${i + 1}/${sortedIds.length}] ${id} - ${card.name} (no CDN key, skipped)`);
      missingBase.push(`${id} (no key)`);
      continue;
    }

    const results = await processCard(card, key, i + 1, sortedIds.length);
    if (results.base) baseOk++;
    else missingBase.push(`${id} - ${card.name}`);
    if (results.evo) evoOk++;
    if (results.hero) heroOk++;
  }

  // Save updated cards.json
  console.log('\nSaving updated cards.json...');
  const orderedCards = {};
  for (const id of sortedIds) {
    orderedCards[id] = cardsMap[id];
  }
  await fs.writeFile(CARDS_JSON_PATH, JSON.stringify(orderedCards, null, 2) + '\n', 'utf8');

  // Remove orphaned WebP files from public/cards (cards no longer in JSON)
  console.log('Cleaning up orphaned images...');
  const validPrefixes = new Set();
  for (const id of sortedIds) {
    validPrefixes.add(id);
    const card = cardsMap[id];
    if (card.evolutionImage) validPrefixes.add(`${id}_evo`);
    if (card.heroImage) validPrefixes.add(`${id}_hero`);
  }
  const publicFiles = await fs.readdir(PUBLIC_CARDS_DIR);
  let removed = 0;
  for (const file of publicFiles) {
    if (!file.endsWith('.webp') || file === 'placeholder.webp') continue;
    const prefix = file.replace(/\.webp$/, '').replace(/(_evo|_hero)$/, '');
    if (!validPrefixes.has(prefix)) {
      await fs.unlink(path.join(PUBLIC_CARDS_DIR, file));
      removed++;
    }
  }
  if (removed) console.log(`  Removed ${removed} orphaned image(s)`);

  // Mirror to dist
  console.log('Mirroring images to dist/cards/...');
  const remainingPublicFiles = await fs.readdir(PUBLIC_CARDS_DIR);
  for (const file of remainingPublicFiles) {
    if (file.endsWith('.webp')) {
      const src = path.join(PUBLIC_CARDS_DIR, file);
      const dst = path.join(DIST_CARDS_DIR, file);
      await fs.copyFile(src, dst);
    }
  }
  const distFiles = await fs.readdir(DIST_CARDS_DIR);
  for (const file of distFiles) {
    if (!remainingPublicFiles.includes(file)) {
      await fs.unlink(path.join(DIST_CARDS_DIR, file));
    }
  }

  console.log('\n========================================');
  console.log('  Update Complete!');
  console.log('========================================');
  console.log(`  Total cards in JSON: ${sortedIds.length}`);
  console.log(`  Base images:  ${baseOk}/${sortedIds.length}`);
  console.log(`  Evo images:   ${evoOk}`);
  console.log(`  Hero images:  ${heroOk}`);
  if (missingBase.length > 0) {
    console.log(`\n  Missing base images:`);
    missingBase.forEach(m => console.log(`    - ${m}`));
  }
  console.log('');
}

main().catch(err => {
  console.error('ERROR:', err);
  process.exit(1);
});
