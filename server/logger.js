import { db, statements } from './db.js';

// Track server start time for uptime calculations
const serverStartTime = Date.now();

function getServerStartTime() {
  return serverStartTime;
}

/**
 * Central logging utility.
 * Writes to console and persists to SQLite (last 10,000 entries).
 */
function log(level, message, data = null) {
  const timestamp = new Date().toISOString();
  const prefix = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : level === 'success' ? '✅' : '📡';

  // Console output (unchanged behavior)
  if (data) {
    console.log(`${prefix} [${timestamp}] ${message}`, data);
  } else {
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  // Persist to SQLite (fire-and-forget; don't block on DB errors)
  try {
    const dataJson = data ? JSON.stringify(data).slice(0, 2000) : null;
    statements.insertLog.run(level, String(message).slice(0, 1000), dataJson, timestamp);
  } catch (err) {
    // Silently fail so logging never breaks the app
    // eslint-disable-next-line no-console
    console.error('Logger DB error:', err.message);
  }
}

// Async log trimming every 5 minutes instead of inline on every write
setInterval(() => {
  try {
    const count = statements.getLogCount.get();
    if (count && count.count > 10000) {
      statements.trimOldLogs.run(10000);
      log('info', `Trimmed logs to last 10,000 entries (was ${count.count})`);
    }
  } catch (err) {
    // Silently fail
    // eslint-disable-next-line no-console
    console.error('Logger trim error:', err.message);
  }
}, 5 * 60 * 1000);

function logRequest(req, type = 'API') {
  const ip = req.ip || req.connection.remoteAddress;
  log('info', `${type} Request: ${req.method} ${req.path} from ${ip}`);
}

function logError(req, error, type = 'API') {
  const ip = req.ip || req.connection.remoteAddress;
  log('error', `${type} Error: ${req.method} ${req.path} from ${ip} - ${error.message}`);
}

export { log, logRequest, logError, getServerStartTime };
