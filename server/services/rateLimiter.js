import crypto from 'crypto';
import { db, statements } from '../db.js';

const hits = new Map();

export const globalRateLimit = {
  max: 60,
  windowMinutes: 1,
};

export const adminOverrides = new Map(); // keyHash -> { max, windowMinutes }

export function hashAdminKey(key) {
  return crypto.createHash('sha256').update(key).digest('hex');
}

function normalizeInt(value, fallback) {
  const num = parseInt(value, 10);
  return Number.isFinite(num) && !Number.isNaN(num) ? num : fallback;
}

/**
 * Sliding-window in-memory rate limit check.
 * Resets automatically when the window expires or when max/window changes.
 */
export function isAllowed(storeKey, max, windowMinutes) {
  const cleanMax = normalizeInt(max, 0);
  const cleanWindow = normalizeInt(windowMinutes, 0);
  if (cleanMax <= 0 || cleanWindow <= 0) {
    return true; // limit disabled
  }

  const windowMs = cleanWindow * 60 * 1000;
  const now = Date.now();
  let rec = hits.get(storeKey);

  if (!rec || rec.max !== cleanMax || rec.windowMs !== windowMs || now > rec.resetTime) {
    rec = { max: cleanMax, windowMs, count: 0, resetTime: now + windowMs };
    hits.set(storeKey, rec);
  }

  if (rec.count >= cleanMax) {
    return false;
  }

  rec.count += 1;
  return true;
}

export function loadGlobalRateLimit() {
  try {
    const row = statements.getAppSetting.get('rate_limit_global');
    if (row && row.value) {
      const parsed = JSON.parse(row.value);
      globalRateLimit.max = normalizeInt(parsed.max, 60);
      globalRateLimit.windowMinutes = normalizeInt(parsed.windowMinutes, 1);
    }
  } catch (e) {
    console.warn('[RateLimiter] Failed to load global rate limit:', e.message);
  }
}

function validateLimitInputs(max, windowMinutes) {
  const cleanMax = normalizeInt(max, NaN);
  const cleanWindow = normalizeInt(windowMinutes, NaN);

  if (!Number.isFinite(cleanMax) || cleanMax < 1 || cleanMax > 10000) {
    return { error: 'max must be an integer between 1 and 10000' };
  }
  if (!Number.isFinite(cleanWindow) || cleanWindow < 1 || cleanWindow > 1440) {
    return { error: 'windowMinutes must be an integer between 1 and 1440' };
  }

  return { max: cleanMax, windowMinutes: cleanWindow };
}

export function updateGlobalRateLimit(max, windowMinutes) {
  const validated = validateLimitInputs(max, windowMinutes);
  if (validated.error) {
    return { error: validated.error };
  }

  try {
    statements.setAppSetting.run('rate_limit_global', JSON.stringify({
      max: validated.max,
      windowMinutes: validated.windowMinutes,
    }));

    globalRateLimit.max = validated.max;
    globalRateLimit.windowMinutes = validated.windowMinutes;

    return { success: true, max: validated.max, windowMinutes: validated.windowMinutes };
  } catch (e) {
    console.warn('[RateLimiter] Failed to save global rate limit:', e.message);
    return { error: 'Failed to save global rate limit' };
  }
}

export function loadAdminRateLimits() {
  try {
    adminOverrides.clear();
    const rows = db.prepare(
      `SELECT key_hash, rate_limit_max, rate_limit_window_minutes FROM admin_keys WHERE is_active = 1`
    ).all();

    for (const row of rows) {
      const max = row.rate_limit_max;
      const windowMinutes = row.rate_limit_window_minutes;
      if (max !== null || windowMinutes !== null) {
        adminOverrides.set(row.key_hash, {
          max: max !== null ? normalizeInt(max, globalRateLimit.max) : globalRateLimit.max,
          windowMinutes: windowMinutes !== null ? normalizeInt(windowMinutes, globalRateLimit.windowMinutes) : globalRateLimit.windowMinutes,
        });
      }
    }
  } catch (e) {
    console.warn('[RateLimiter] Failed to load admin rate limits:', e.message);
  }
}

export function updateAdminRateLimit(id, max, windowMinutes) {
  const idNum = normalizeInt(id, NaN);
  if (!Number.isFinite(idNum)) {
    return { error: 'Invalid admin ID' };
  }

  // null/undefined means "inherit global"
  const maxValue = max === null || max === undefined || max === '' ? null : normalizeInt(max, NaN);
  const windowValue = windowMinutes === null || windowMinutes === undefined || windowMinutes === '' ? null : normalizeInt(windowMinutes, NaN);

  if (maxValue !== null && (maxValue < 1 || maxValue > 10000)) {
    return { error: 'max must be between 1 and 10000 or empty to inherit' };
  }
  if (windowValue !== null && (windowValue < 1 || windowValue > 1440)) {
    return { error: 'windowMinutes must be between 1 and 1440 or empty to inherit' };
  }

  try {
    const existing = db.prepare('SELECT id FROM admin_keys WHERE id = ?').get(idNum);
    if (!existing) {
      return { error: 'Sub-admin not found' };
    }

    statements.updateAdminKeyRateLimit.run(maxValue, windowValue, idNum);
    loadAdminRateLimits();
    return { success: true, id: idNum, rateLimitMax: maxValue, rateLimitWindowMinutes: windowValue };
  } catch (e) {
    console.warn('[RateLimiter] Failed to update admin rate limit:', e.message);
    return { error: 'Failed to update admin rate limit' };
  }
}

// Load settings on startup
loadGlobalRateLimit();
loadAdminRateLimits();
