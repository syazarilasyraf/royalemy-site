import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import roadmapRouter from './routes/roadmap.js';
import communityTournamentRouter from './routes/communityTournaments.js';
import communityClanRouter from './routes/communityClans.js';
import statePlayerRouter from './routes/statePlayers.js';
import communityDeckRouter from './routes/communityDecks.js';
import notificationRouter from './routes/notifications.js';
import adminNotificationRouter from './routes/adminNotifications.js';
import adminRouter from './routes/admin.js';
import { log, logRequest, logError } from './logger.js';
import { db, getDbDiagnostics, dbPath, dbDir, statements } from './db.js';
import { fetchFromCR, clearCache, deleteCacheKey, getCacheKey, CACHE_TTL, cache, MAX_CACHE_SIZE } from './services/crApi.js';
import { fetchMetaDecks, META_DECK_CACHE_KEY } from './services/metaDecks.js';
import { createTournamentNotification } from './services/notifications.js';
import { validateAdminKey, validateAdminKey as validateAdminKeyForEndpoint, sanitizeTag } from './middleware/auth.js';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.set('trust proxy', 1);

// Security headers
app.use(helmet({
  contentSecurityPolicy: false, // Allow inline styles/scripts for now
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: false // Let our CORS middleware control cross-origin access
}));

const PORT = process.env.PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const CR_API_BASE = 'https://api.clashroyale.com/v1';
const CR_API_TOKEN = process.env.CR_API_TOKEN;

// CR_API_TOKEN is validated lazily inside fetchFromCR so the server can start
// and serve non-CR routes (community decks, roadmap, etc.) without it

// ==================== MIDDLEWARE ====================

// CORS - Allow configured frontend origin(s)
// Note: we mirror the request origin so admin requests work from any valid frontend
// (Netlify production, deploy previews, mobile browsers, etc.). The actual security
// is enforced by the admin key, not the origin.
app.use(cors({
  origin: function (origin, callback) {
    callback(null, origin || true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Admin-Key', 'x-admin-key'],
  exposedHeaders: ['X-Request-Id'],
  optionsSuccessStatus: 204,
  maxAge: 0
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

function validatePlayerTag(tag) {
  const cleanTag = sanitizeTag(tag);
  if (!cleanTag || cleanTag.length < 3 || cleanTag.length > 10) {
    return { valid: false, error: 'Player tag must be 3-10 alphanumeric characters (e.g., #2P0JJQ0Y)' };
  }
  return { valid: true, tag: cleanTag };
}

function validateClanTag(tag) {
  const cleanTag = sanitizeTag(tag);
  if (!cleanTag || cleanTag.length < 3 || cleanTag.length > 10) {
    return { valid: false, error: 'Clan tag must be 3-10 alphanumeric characters (e.g., #2P2QU0)' };
  }
  return { valid: true, tag: cleanTag };
}

// ==================== AUDIT TRAIL ====================

function logAdminAction(req, action, resource, resourceId, details = null) {
  try {
    const ip = req.ip || req.connection.remoteAddress;
    const detailStr = details ? JSON.stringify(details).slice(0, 500) : null;
    statements.insertAdminAction.run(action, resource, String(resourceId), detailStr, ip);
  } catch (e) {
    log('warn', `Failed to log admin action: ${e.message}`);
  }
}

// ==================== API ROUTES ====================

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

import { clearCache as clearCrCache } from './services/crApi.js';

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
    deleteCacheKey(META_DECK_CACHE_KEY);
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
app.use('/api/notifications', notificationRouter);

// ==================== ADMIN ====================

app.use('/api/admin', adminRouter);
app.use('/api/admin/notifications', adminNotificationRouter);

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

// ==================== GLOBAL ERROR HANDLER ====================

app.use((err, req, res, next) => {
  log('error', `Server error: ${err.message}`);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// ==================== AUTOMATED TOURNAMENT REMINDERS ====================

import webpush from 'web-push';

function setupTournamentReminders() {
  const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
  const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@royalemy.gg';

  if (!vapidPublicKey || !vapidPrivateKey) {
    log('warn', 'Tournament reminders disabled: VAPID keys not configured');
    return;
  }

  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

  // Check every 5 minutes for upcoming tournaments
  setInterval(() => {
    try {
      const now = new Date();
      const tournaments = db.prepare(`SELECT * FROM community_tournaments WHERE status IN ('approved', 'registration_open') AND start_date > datetime('now')`).all();

      for (const tournament of tournaments) {
        const startDate = new Date(tournament.start_date);
        const diffMs = startDate - now;
        const diffHours = diffMs / (1000 * 60 * 60);

        if (diffHours <= 24 && diffHours > 23 && !tournament.notified_24h) {
          // Send 24h reminder
          db.prepare(`UPDATE community_tournaments SET notified_24h = 1 WHERE id = ?`).run(tournament.id);
          createTournamentNotification(tournament.id, 'reminder_24h', `Tournament "${tournament.name}" starts in 24 hours!`);
          log('info', `Sent 24h reminder for tournament ${tournament.id}`);
        }

        if (diffHours <= 1 && diffHours > 0 && !tournament.notified_1h) {
          // Send 1h reminder
          db.prepare(`UPDATE community_tournaments SET notified_1h = 1 WHERE id = ?`).run(tournament.id);
          createTournamentNotification(tournament.id, 'reminder_1h', `Tournament "${tournament.name}" starts in 1 hour! Get ready!`);
          log('info', `Sent 1h reminder for tournament ${tournament.id}`);
        }
      }
    } catch (e) {
      log('warn', `Tournament reminder check failed: ${e.message}`);
    }
  }, 5 * 60 * 1000);

  log('info', 'Automated tournament reminders initialized (checking every 5 minutes)');
}

// ==================== START SERVER ====================

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
  console.log(`CORS mode: mirror request origin (maxAge: 0)`);
  console.log('');
  console.log('Ready for viewers! 👥');
  console.log('');

  setupTournamentReminders();
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
