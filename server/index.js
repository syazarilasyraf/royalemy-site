import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import fetch from 'node-fetch';
import rateLimit from 'express-rate-limit';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import roadmapRouter from './routes/roadmap.js';
import communityTournamentRouter from './routes/communityTournaments.js';
import communityClanRouter from './routes/communityClans.js';
import statePlayerRouter from './routes/statePlayers.js';
import communityDeckRouter from './routes/communityDecks.js';
import adminRouter from './routes/admin.js';
import { log, logRequest, logError } from './logger.js';
import { db, getDbDiagnostics, dbPath, dbDir } from './db.js';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.set('trust proxy', 1);

// Security headers
app.use(helmet({
  contentSecurityPolicy: false, // Allow inline styles/scripts for now
  crossOriginEmbedderPolicy: false
}));

const PORT = process.env.PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const CR_API_BASE = 'https://api.clashroyale.com/v1';
const CR_API_TOKEN = process.env.CR_API_TOKEN;

// CR_API_TOKEN is validated lazily inside fetchFromCR so the server can start
// and serve non-CR routes (community decks, roadmap, etc.) without it

// ==================== CACHE SETUP ====================

const cache = new Map();
const MAX_CACHE_SIZE = 500;

const CACHE_TTL = {
  player: 60,           // 1 minute
  battlelog: 300,       // 5 minutes
  chests: 60,           // 1 minute
  clanSearch: 300,      // 5 minutes
  clanDetails: 300,     // 5 minutes
  locations: 86400,     // 24 hours
  rankings: 300,        // 5 minutes
  cards: 86400,         // 24 hours
};

function getCacheKey(type, identifier) {
  return `${type}:${identifier}`;
}

function getCache(key) {
  const item = cache.get(key);
  if (!item) return null;
  
  if (Date.now() > item.expiry) {
    cache.delete(key);
    return null;
  }
  
  return item.data;
}

function setCache(key, data, ttlSeconds) {
  // Evict expired entries if cache is near capacity
  if (cache.size >= MAX_CACHE_SIZE) {
    const now = Date.now();
    for (const [k, item] of cache.entries()) {
      if (now > item.expiry) {
        cache.delete(k);
      }
      if (cache.size < MAX_CACHE_SIZE) break;
    }
    // If still full, evict oldest entry
    if (cache.size >= MAX_CACHE_SIZE) {
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey);
    }
  }
  cache.set(key, {
    data,
    expiry: Date.now() + (ttlSeconds * 1000)
  });
}

function clearCache() {
  const size = cache.size;
  cache.clear();
  log('info', `Cache cleared. Removed ${size} entries.`);
}

// Auto-clear expired entries every hour
setInterval(() => {
  const now = Date.now();
  let cleared = 0;
  for (const [key, item] of cache.entries()) {
    if (now > item.expiry) {
      cache.delete(key);
      cleared++;
    }
  }
  if (cleared > 0) {
    log('info', `Auto-cleared ${cleared} expired cache entries`);
  }
}, 3600000);

// ==================== MIDDLEWARE ====================

// CORS - Allow configured frontend origin(s)
const corsOrigins = [FRONTEND_URL];
if (process.env.CORS_ORIGINS) {
  process.env.CORS_ORIGINS.split(',').forEach(o => corsOrigins.push(o.trim()));
}

app.use(cors({
  origin: corsOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Request logging middleware
// Request correlation ID middleware
app.use((req, res, next) => {
  req.id = crypto.randomUUID();
  next();
});

app.use((req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  log('info', `${req.method} ${req.path} - IP: ${ip}`, { requestId: req.id });
  next();
});

// Rate limiting - 60 requests per minute per IP
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute
  message: {
    error: 'Rate limit exceeded. Please try again later.',
    retryAfter: 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    log('warn', `Rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json(options.message);
  }
});

app.use('/api/', limiter);

// ==================== VALIDATION ====================

function sanitizeTag(tag) {
  if (!tag) return '';
  // Remove # if present, keep only alphanumeric, uppercase
  return tag.replace('#', '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
}

function validatePlayerTag(tag) {
  const cleanTag = sanitizeTag(tag);
  // Player tags: 3-10 alphanumeric characters
  if (!cleanTag || cleanTag.length < 3 || cleanTag.length > 10) {
    return { valid: false, error: 'Player tag must be 3-10 alphanumeric characters (e.g., #2P0JJQ0Y)' };
  }
  return { valid: true, tag: cleanTag };
}

function validateClanTag(tag) {
  const cleanTag = sanitizeTag(tag);
  // Clan tags: 3-10 alphanumeric characters
  if (!cleanTag || cleanTag.length < 3 || cleanTag.length > 10) {
    return { valid: false, error: 'Clan tag must be 3-10 alphanumeric characters (e.g., #2P2QU0)' };
  }
  return { valid: true, tag: cleanTag };
}

// ==================== CR API HELPERS ====================

function requireCRToken() {
  if (!CR_API_TOKEN) {
    throw new Error('Clash Royale API token is not configured on the server');
  }
}

async function fetchFromCR(endpoint, cacheKey, ttl) {
  requireCRToken();

  // Check cache first
  const cached = getCache(cacheKey);
  if (cached) {
    log('success', `Cache hit: ${cacheKey}`);
    return cached;
  }

  const url = `${CR_API_BASE}${endpoint}`;
  
  try {
    log('info', `Fetching: ${endpoint}`);
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${CR_API_TOKEN}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      // Map CR API errors to friendly messages
      let message = 'Unknown error from Clash Royale API';
      
      switch (response.status) {
        case 400:
          message = 'Bad request. Please check your input.';
          break;
        case 403:
          message = 'Access denied. Your IP may not be whitelisted.';
          break;
        case 404:
          message = 'Not found. Please check the tag and try again.';
          break;
        case 410:
          message = 'Gone. This data is no longer available from the Clash Royale API.';
          break;
        case 429:
          message = 'Rate limited by Clash Royale API. Please try again in a moment.';
          break;
        case 500:
          message = 'Clash Royale API server error. Please try again later.';
          break;
        case 503:
          message = 'Clash Royale API is temporarily unavailable. Please try again later.';
          break;
        default:
          message = errorData.reason || `API Error: ${response.status}`;
      }
      
      throw new Error(message);
    }

    const data = await response.json();
    
    // Store in cache
    setCache(cacheKey, data, ttl);
    log('success', `Cached: ${cacheKey} (${ttl}s TTL)`);
    
    return data;
  } catch (error) {
    log('error', `Fetch error for ${endpoint}: ${error.message}`);
    throw error;
  }
}

export { fetchFromCR };

// ==================== API ROUTES ====================

// Admin: database diagnostics (protected by admin key)
function validateAdminKeyForEndpoint(req, res, next) {
  const key = req.query.key;
  const adminKey = process.env.ROADMAP_ADMIN_KEY;
  if (!adminKey) {
    return res.status(500).json({ error: 'Admin key not configured on server' });
  }
  if (key !== adminKey) {
    log('warn', `Invalid admin key attempt on ${req.path} from ${req.ip}`);
    return res.status(403).json({ error: 'Invalid admin key' });
  }
  next();
}

app.get('/admin/db-info', validateAdminKeyForEndpoint, (req, res) => {
  try {
    const diagnostics = getDbDiagnostics();
    res.json(diagnostics);
  } catch (error) {
    log('error', `Admin db-info failed: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

// Admin: download current database file
app.get('/admin/download-db', validateAdminKeyForEndpoint, (req, res) => {
  try {
    if (!fs.existsSync(dbPath)) {
      return res.status(404).json({ error: 'Database file not found' });
    }
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', 'attachment; filename=roadmap.db');
    res.sendFile(path.resolve(dbPath));
  } catch (error) {
    log('error', `Database download failed: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

// Admin: upload and replace database file (protected by admin key)
// Usage: curl -X POST "https://.../admin/upload-db?key=ADMIN_KEY" \
//            -H "Content-Type: application/octet-stream" \
//            --data-binary @server/data/roadmap.db
app.post('/admin/upload-db', validateAdminKeyForEndpoint, express.raw({ type: 'application/octet-stream', limit: '10mb' }), (req, res) => {
  try {
    if (!req.body || req.body.length === 0) {
      return res.status(400).json({ error: 'No file data received. Send the .db file as raw binary body with Content-Type: application/octet-stream' });
    }

    // Validate SQLite magic bytes ("SQLite format 3\0")
    const sqliteMagic = Buffer.from('SQLite format 3\0');
    if (!req.body.slice(0, sqliteMagic.length).equals(sqliteMagic)) {
      return res.status(400).json({ error: 'Uploaded file is not a valid SQLite database' });
    }

    const timestamp = Date.now();
    const backupPath = path.join(dbDir, `roadmap.db.bak.${timestamp}`);
    const tempPath = path.join(dbDir, `roadmap.db.tmp.${timestamp}`);

    // Backup existing DB if it exists
    if (fs.existsSync(dbPath)) {
      fs.copyFileSync(dbPath, backupPath);
      log('info', `Database backed up to ${backupPath}`);
    }

    // Write uploaded data to temp file, then atomically replace
    fs.writeFileSync(tempPath, req.body);
    fs.renameSync(tempPath, dbPath);
    log('info', `Database replaced with uploaded file (${req.body.length} bytes)`);

    res.json({
      success: true,
      bytesWritten: req.body.length,
      backupPath,
      dbPath,
      message: 'Database uploaded successfully. Server will restart in 3 seconds to load the new database.'
    });

    // Exit to force container restart with new database
    setTimeout(() => {
      log('info', 'Restarting server to load uploaded database');
      process.exit(0);
    }, 3000);
  } catch (error) {
    log('error', `Database upload failed: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

// Clear cache (admin endpoint)
app.post('/api/admin/clear-cache', validateAdminKeyForEndpoint, (req, res) => {
  clearCache();
  res.json({ status: 'ok', message: 'Cache cleared successfully' });
});

// ==================== PLAYERS ====================

app.get('/api/players/:playerTag', async (req, res) => {
  try {
    logRequest(req);
    
    const { playerTag } = req.params;
    const validation = validatePlayerTag(playerTag);
    
    if (!validation.valid) {
      log('warn', `Invalid player tag rejected: ${playerTag}`);
      return res.status(400).json({ error: validation.error });
    }
    
    const cleanTag = validation.tag;
    const cacheKey = getCacheKey('player', cleanTag);
    
    const data = await fetchFromCR(`/players/%23${cleanTag}`, cacheKey, CACHE_TTL.player);
    res.json(data);
  } catch (error) {
    logError(req, error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/players/:playerTag/battlelog', async (req, res) => {
  try {
    logRequest(req);
    
    const { playerTag } = req.params;
    const validation = validatePlayerTag(playerTag);
    
    if (!validation.valid) {
      log('warn', `Invalid player tag rejected: ${playerTag}`);
      return res.status(400).json({ error: validation.error });
    }
    
    const cleanTag = validation.tag;
    const cacheKey = getCacheKey('battlelog', cleanTag);
    
    const data = await fetchFromCR(`/players/%23${cleanTag}/battlelog`, cacheKey, CACHE_TTL.battlelog);
    res.json(data);
  } catch (error) {
    logError(req, error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/players/:playerTag/upcomingchests', async (req, res) => {
  try {
    logRequest(req);
    
    const { playerTag } = req.params;
    const validation = validatePlayerTag(playerTag);
    
    if (!validation.valid) {
      log('warn', `Invalid player tag rejected: ${playerTag}`);
      return res.status(400).json({ error: validation.error });
    }
    
    const cleanTag = validation.tag;
    const cacheKey = getCacheKey('chests', cleanTag);
    
    const data = await fetchFromCR(`/players/%23${cleanTag}/upcomingchests`, cacheKey, CACHE_TTL.chests);
    res.json(data);
  } catch (error) {
    logError(req, error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== CLANS ====================

app.get('/api/clans', async (req, res) => {
  try {
    logRequest(req);
    
    const { name, minTrophies, minMembers } = req.query;
    
    if (!name || name.length < 2) {
      log('warn', `Invalid clan search: name too short`);
      return res.status(400).json({ error: 'Search name must be at least 2 characters.' });
    }
    
    let endpoint = '/clans?';
    
    if (name) endpoint += `name=${encodeURIComponent(name)}&`;
    if (minTrophies) endpoint += `minScore=${minTrophies}&`;
    if (minMembers) endpoint += `minMembers=${minMembers}&`;
    
    const cacheKey = getCacheKey('clanSearch', `${name}:${minTrophies}:${minMembers}`);
    
    const data = await fetchFromCR(endpoint, cacheKey, CACHE_TTL.clanSearch);
    res.json(data);
  } catch (error) {
    logError(req, error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/clans/:clanTag', async (req, res) => {
  try {
    logRequest(req);
    
    const { clanTag } = req.params;
    const validation = validateClanTag(clanTag);
    
    if (!validation.valid) {
      log('warn', `Invalid clan tag rejected: ${clanTag}`);
      return res.status(400).json({ error: validation.error });
    }
    
    const cleanTag = validation.tag;
    const cacheKey = getCacheKey('clan', cleanTag);
    
    const data = await fetchFromCR(`/clans/%23${cleanTag}`, cacheKey, CACHE_TTL.clanDetails);
    res.json(data);
  } catch (error) {
    logError(req, error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/clans/:clanTag/members', async (req, res) => {
  try {
    logRequest(req);
    
    const { clanTag } = req.params;
    const validation = validateClanTag(clanTag);
    
    if (!validation.valid) {
      log('warn', `Invalid clan tag rejected: ${clanTag}`);
      return res.status(400).json({ error: validation.error });
    }
    
    const cleanTag = validation.tag;
    const cacheKey = getCacheKey('clanMembers', cleanTag);
    
    const data = await fetchFromCR(`/clans/%23${cleanTag}/members`, cacheKey, CACHE_TTL.clanDetails);
    res.json(data);
  } catch (error) {
    logError(req, error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/clans/:clanTag/currentwar', async (req, res) => {
  try {
    logRequest(req);
    
    const { clanTag } = req.params;
    const validation = validateClanTag(clanTag);
    
    if (!validation.valid) {
      log('warn', `Invalid clan tag rejected: ${clanTag}`);
      return res.status(400).json({ error: validation.error });
    }
    
    const cleanTag = validation.tag;
    const cacheKey = getCacheKey('clanCurrentWar', cleanTag);
    
    const data = await fetchFromCR(`/clans/%23${cleanTag}/currentwar`, cacheKey, CACHE_TTL.clanDetails);
    res.json(data);
  } catch (error) {
    logError(req, error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/clans/:clanTag/warlog', async (req, res) => {
  try {
    logRequest(req);
    
    const { clanTag } = req.params;
    const validation = validateClanTag(clanTag);
    
    if (!validation.valid) {
      log('warn', `Invalid clan tag rejected: ${clanTag}`);
      return res.status(400).json({ error: validation.error });
    }
    
    const cleanTag = validation.tag;
    const cacheKey = getCacheKey('clanWarLog', cleanTag);
    
    const data = await fetchFromCR(`/clans/%23${cleanTag}/warlog`, cacheKey, CACHE_TTL.clanDetails);
    res.json(data);
  } catch (error) {
    logError(req, error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/clans/:clanTag/currentriverrace', async (req, res) => {
  try {
    logRequest(req);
    
    const { clanTag } = req.params;
    const validation = validateClanTag(clanTag);
    
    if (!validation.valid) {
      log('warn', `Invalid clan tag rejected: ${clanTag}`);
      return res.status(400).json({ error: validation.error });
    }
    
    const cleanTag = validation.tag;
    const cacheKey = getCacheKey('clanCurrentRiverRace', cleanTag);
    
    const data = await fetchFromCR(`/clans/%23${cleanTag}/currentriverrace`, cacheKey, CACHE_TTL.clanDetails);
    res.json(data);
  } catch (error) {
    logError(req, error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/clans/:clanTag/riverracelog', async (req, res) => {
  try {
    logRequest(req);
    
    const { clanTag } = req.params;
    const validation = validateClanTag(clanTag);
    
    if (!validation.valid) {
      log('warn', `Invalid clan tag rejected: ${clanTag}`);
      return res.status(400).json({ error: validation.error });
    }
    
    const cleanTag = validation.tag;
    const cacheKey = getCacheKey('clanRiverRaceLog', cleanTag);
    
    const data = await fetchFromCR(`/clans/%23${cleanTag}/riverracelog`, cacheKey, CACHE_TTL.clanDetails);
    res.json(data);
  } catch (error) {
    logError(req, error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== TOURNAMENTS ====================

app.get('/api/globaltournaments', async (req, res) => {
  try {
    logRequest(req);
    
    const cacheKey = getCacheKey('globaltournaments', 'all');
    
    const data = await fetchFromCR('/globaltournaments', cacheKey, CACHE_TTL.player);
    res.json(data);
  } catch (error) {
    logError(req, error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/tournaments', async (req, res) => {
  try {
    logRequest(req);
    
    const { name } = req.query;
    
    if (!name || name.length < 2) {
      log('warn', `Invalid tournament search: name too short`);
      return res.status(400).json({ error: 'Search name must be at least 2 characters.' });
    }
    
    const cacheKey = getCacheKey('tournaments', name);
    
    const data = await fetchFromCR(`/tournaments?name=${encodeURIComponent(name)}`, cacheKey, CACHE_TTL.player);
    res.json(data);
  } catch (error) {
    logError(req, error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/tournaments/:tournamentTag', async (req, res) => {
  try {
    logRequest(req);
    
    const { tournamentTag } = req.params;
    const cleanTag = sanitizeTag(tournamentTag);
    
    if (!cleanTag || cleanTag.length < 3) {
      log('warn', `Invalid tournament tag rejected: ${tournamentTag}`);
      return res.status(400).json({ error: 'Tournament tag must be at least 3 characters.' });
    }
    
    const cacheKey = getCacheKey('tournament', cleanTag);
    
    const data = await fetchFromCR(`/tournaments/%23${cleanTag}`, cacheKey, CACHE_TTL.player);
    res.json(data);
  } catch (error) {
    logError(req, error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== LOCATIONS / RANKINGS ====================

app.get('/api/locations', async (req, res) => {
  try {
    logRequest(req);
    
    const cacheKey = getCacheKey('locations', 'all');
    const data = await fetchFromCR('/locations', cacheKey, CACHE_TTL.locations);
    res.json(data);
  } catch (error) {
    logError(req, error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/locations/:locationId', async (req, res) => {
  try {
    logRequest(req);
    
    const { locationId } = req.params;
    const cacheKey = getCacheKey('location', locationId);
    
    const data = await fetchFromCR(`/locations/${locationId}`, cacheKey, CACHE_TTL.locations);
    res.json(data);
  } catch (error) {
    logError(req, error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/locations/:locationId/rankings/players', async (req, res) => {
  try {
    logRequest(req);
    
    const { locationId } = req.params;
    const cacheKey = getCacheKey('rankings', `players:${locationId}`);
    
    const data = await fetchFromCR(`/locations/${locationId}/rankings/players`, cacheKey, CACHE_TTL.rankings);
    res.json(data);
  } catch (error) {
    logError(req, error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/locations/:locationId/rankings/clans', async (req, res) => {
  try {
    logRequest(req);
    
    const { locationId } = req.params;
    const cacheKey = getCacheKey('rankings', `clans:${locationId}`);
    
    const data = await fetchFromCR(`/locations/${locationId}/rankings/clans`, cacheKey, CACHE_TTL.rankings);
    res.json(data);
  } catch (error) {
    logError(req, error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/locations/:locationId/rankings/clanwars', async (req, res) => {
  try {
    logRequest(req);
    
    const { locationId } = req.params;
    const cacheKey = getCacheKey('rankings', `clanwars:${locationId}`);
    
    const data = await fetchFromCR(`/locations/${locationId}/rankings/clanwars`, cacheKey, CACHE_TTL.rankings);
    res.json(data);
  } catch (error) {
    logError(req, error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/locations/:locationId/pathoflegend/players', async (req, res) => {
  try {
    logRequest(req);
    
    const { locationId } = req.params;
    const cacheKey = getCacheKey('rankings', `pol:${locationId}`);
    
    const data = await fetchFromCR(`/locations/${locationId}/pathoflegend/players`, cacheKey, CACHE_TTL.rankings);
    res.json(data);
  } catch (error) {
    logError(req, error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== CARDS ====================

app.get('/api/cards', async (req, res) => {
  try {
    logRequest(req);
    
    const cacheKey = getCacheKey('cards', 'all');
    const data = await fetchFromCR('/cards', cacheKey, CACHE_TTL.cards);
    res.json(data);
  } catch (error) {
    logError(req, error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== META DECKS ====================

import { FALLBACK_DECKS } from './data/fallbackDecks.js';
import { TOP_PLAYER_TAGS, TOP_PLAYER_SAMPLE_SIZE } from './data/topPlayers.js';

const META_DECK_CACHE_KEY = 'meta-decks';
const META_DECK_CACHE_TTL = 1800; // 30 minutes

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function generateFallbackMetaDecks() {
  // Deterministic random based on current hour so decks "rotate" over time
  const hourSeed = Math.floor(Date.now() / (1000 * 60 * 60));
  const rand = (seed) => {
    const x = Math.sin(seed + hourSeed) * 10000;
    return x - Math.floor(x);
  };

  // Shuffle and pick 15-20 decks from fallback pool
  const shuffled = [...FALLBACK_DECKS].sort(() => rand(Math.random()) - 0.5);
  const selected = shuffled.slice(0, 20);

  const decks = selected.map((deck, idx) => ({
    id: deck.id,
    cardIds: deck.cardIds,
    usageCount: Math.floor(rand(idx + 1) * 80) + 10,
    winRate: Number((48 + rand(idx + 100) * 18).toFixed(1))
  })).sort((a, b) => b.usageCount - a.usageCount);

  return {
    decks,
    lastUpdated: new Date().toISOString(),
    playerSampleSize: 0,
    totalBattlesAnalyzed: 0,
    source: 'fallback',
    fallbackReason: 'Top player battle logs temporarily unavailable. Showing curated meta decks.'
  };
}

async function fetchLiveMetaDecks() {
  log('info', `Fetching fresh meta decks from hardcoded top players...`);

  // Shuffle top player tags so we rotate through different players each fetch
  const shuffled = [...TOP_PLAYER_TAGS].sort(() => Math.random() - 0.5);
  const selectedPlayers = shuffled.slice(0, TOP_PLAYER_SAMPLE_SIZE);

  const allDecks = [];
  let successfulFetches = 0;

  // Fetch battle logs for each selected player with small delays to respect rate limits
  for (let i = 0; i < selectedPlayers.length; i++) {
    const player = selectedPlayers[i];
    const cleanTag = player.tag;
    const cacheKey = getCacheKey('battlelog', cleanTag);

    try {
      if (i > 0) await delay(200);

      const battlelog = await fetchFromCR(`/players/%23${cleanTag}/battlelog`, cacheKey, CACHE_TTL.battlelog);

      if (battlelog && Array.isArray(battlelog)) {
        for (const battle of battlelog) {
          if (battle.team && battle.team[0] && battle.team[0].cards) {
            const cardIds = battle.team[0].cards.map(c => Number(c.id));
            // Only include standard 8-card decks (skip 2v2/special modes with more cards)
            if (cardIds.length === 8) {
              const won = (battle.team[0].crowns || 0) > (battle.opponent?.[0]?.crowns || 0);
              allDecks.push({ cardIds, won, playerName: player.name });
            }
          }
        }
        successfulFetches++;
        log('success', `Fetched battle log for ${player.name} (#${cleanTag}): ${battlelog.length} battles`);
      }
    } catch (error) {
      log('warn', `Failed to fetch battle log for ${player.name} (#${cleanTag}): ${error.message}`);
    }
  }

  if (allDecks.length === 0) {
    log('warn', `No battle data from any hardcoded top players. Using fallback decks.`);
    throw new Error('No battle data available from top players');
  }

  log('info', `Extracted ${allDecks.length} decks from ${successfulFetches}/${selectedPlayers.length} players`);

  // Aggregate decks — deduplicate identical decks and track which players use them
  const deckMap = new Map();

  for (const { cardIds, won, playerName } of allDecks) {
    const sortedIds = [...cardIds].sort((a, b) => a - b);
    const key = sortedIds.join(',');

    if (!deckMap.has(key)) {
      deckMap.set(key, { cardIds: sortedIds, count: 0, wins: 0, players: new Set() });
    }

    const deck = deckMap.get(key);
    deck.count++;
    if (won) deck.wins++;
    deck.players.add(playerName);
  }

  // Convert to array, calculate stats, sort by usage
  const decks = Array.from(deckMap.values())
    .map(d => ({
      id: `meta-${d.cardIds.join('-')}`,
      cardIds: d.cardIds,
      usageCount: d.count,
      winRate: Number(((d.wins / d.count) * 100).toFixed(1)),
      usedBy: Array.from(d.players).sort()
    }))
    .sort((a, b) => b.usageCount - a.usageCount)
    .slice(0, 100);

  return {
    decks,
    lastUpdated: new Date().toISOString(),
    playerSampleSize: successfulFetches,
    totalBattlesAnalyzed: allDecks.length,
    source: 'live'
  };
}

let metaDeckBuildPromise = null;

async function fetchMetaDecks() {
  // Check cache first
  const cached = getCache(META_DECK_CACHE_KEY);
  if (cached) {
    log('success', `Meta deck cache hit`);
    return cached;
  }

  // Cache stampede protection: if another request is already building,
  // wait for it instead of spawning duplicate CR API calls
  if (metaDeckBuildPromise) {
    log('info', `Meta deck build already in progress, waiting...`);
    return metaDeckBuildPromise;
  }

  // Start the build and keep the promise so concurrent requests can await it
  metaDeckBuildPromise = (async () => {
    let result;
    try {
      result = await fetchLiveMetaDecks();
    } catch (error) {
      log('warn', `Live meta decks failed: ${error.message}. Using fallback.`);
      result = generateFallbackMetaDecks();
    }
    setCache(META_DECK_CACHE_KEY, result, META_DECK_CACHE_TTL);
    log('success', `Cached ${result.decks.length} meta decks (source: ${result.source})`);
    return result;
  })();

  try {
    return await metaDeckBuildPromise;
  } finally {
    metaDeckBuildPromise = null;
  }
}

app.get('/api/meta-decks', async (req, res) => {
  try {
    logRequest(req);
    const data = await fetchMetaDecks();
    res.json(data);
  } catch (error) {
    logError(req, error);
    res.status(500).json({ 
      error: error.message || 'Failed to fetch meta decks',
      hint: 'Meta decks are built from live top-player battle logs. Try again in a moment.'
    });
  }
});

// Force refresh meta decks (no cache)
app.post('/api/meta-decks/refresh', async (req, res) => {
  try {
    logRequest(req, 'ADMIN');
    cache.delete(META_DECK_CACHE_KEY);
    const data = await fetchMetaDecks();
    res.json({ ...data, refreshed: true });
  } catch (error) {
    logError(req, error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== ROADMAP ====================

app.use('/api/roadmap', roadmapRouter);

// ==================== COMMUNITY TOURNAMENTS ====================

app.use('/api/community-tournaments', communityTournamentRouter);
app.use('/api/community-clans', communityClanRouter);
app.use('/api/state-players', statePlayerRouter);
app.use('/api/community-decks', communityDeckRouter);

// ==================== ADMIN ====================

app.use('/api/admin', adminRouter);

// ==================== STATIC FILE SERVING (SPA) ====================

// Serve static files from the React app build directory
const staticPath = path.join(__dirname, '../client/dist');
app.use(express.static(staticPath));

// Handle React routing, return index.html for all non-API routes
app.get('*', (req, res) => {
  // Skip API routes - they should have been handled above
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  
  // Serve index.html for all other routes (SPA fallback)
  res.sendFile(path.join(staticPath, 'index.html'), (err) => {
    if (err) {
      log('error', `Failed to serve index.html: ${err.message}`);
      res.status(500).send('Error loading application. Make sure you have built the frontend with "npm run build"');
    }
  });
});

// ==================== HEALTH / VERSION ====================

let serverVersion = 'unknown';
try {
  const versionPath = path.join(__dirname, 'version.txt');
  if (fs.existsSync(versionPath)) {
    serverVersion = fs.readFileSync(versionPath, 'utf8').trim();
  }
} catch (e) {
  // ignore
}

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    version: serverVersion,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    db: dbPath,
    cacheSize: cache.size,
    crApiConfigured: !!CR_API_TOKEN,
    frontendUrl: FRONTEND_URL,
  });
});

// Log all registered routes for deploy verification
function logRegisteredRoutes() {
  console.log('');
  console.log('📋 Registered API Routes:');
  app._router.stack.forEach((middleware) => {
    if (middleware.route) {
      const methods = Object.keys(middleware.route.methods).map(m => m.toUpperCase()).join(',');
      console.log(`   ${methods.padEnd(6)} ${middleware.route.path}`);
    } else if (middleware.name === 'router') {
      const base = middleware.regexp.toString()
        .replace('/^\\', '')
        .replace('\\/?(?=\/|$)/i', '')
        .replace(/\\/g, '/');
      middleware.handle.stack.forEach((handler) => {
        if (handler.route) {
          const methods = Object.keys(handler.route.methods).map(m => m.toUpperCase()).join(',');
          const path = base + handler.route.path;
          console.log(`   ${methods.padEnd(6)} ${path}`);
        }
      });
    }
  });
  console.log('');
}

logRegisteredRoutes();

// ==================== GLOBAL ERROR HANDLER ====================

app.use((err, req, res, next) => {
  log('error', `Server error: ${err.message}`);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log('');
  console.log('🎮 ======================================');
  console.log('   RoyaleMY Server Started');
  console.log('   ======================================');
  console.log('');
  console.log(`📡 Server URL: http://localhost:${PORT}`);
  console.log(`🌐 Serving frontend from: ${staticPath}`);
  console.log(`✅ Clash Royale API: ${CR_API_TOKEN ? 'Configured' : 'NOT CONFIGURED'}`);
  console.log(`⚡ Rate Limit: 60 req/min per IP`);
  console.log(`💾 Cache: Enabled with TTL (max ${MAX_CACHE_SIZE} entries)`);
  console.log('');
  console.log(`Frontend should point to: ${FRONTEND_URL}`);
  console.log('');
  console.log('Ready for viewers! 👥');
  console.log('');
});

// Graceful shutdown
function shutdown(signal) {
  log('info', `${signal} received. Shutting down gracefully...`);
  server.close(() => {
    log('info', 'HTTP server closed.');
    try {
      db.close();
      log('info', 'Database connection closed.');
    } catch (e) {
      // already closed or never opened
    }
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
