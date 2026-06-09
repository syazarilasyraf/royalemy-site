import fetch from 'node-fetch';
import { log } from '../logger.js';

const CR_API_BASE = 'https://api.clashroyale.com/v1';
const CR_API_TOKEN = process.env.CR_API_TOKEN;

const cache = new Map();
const MAX_CACHE_SIZE = 500;

const CACHE_TTL = {
  player: 60,
  battlelog: 300,
  chests: 60,
  clanSearch: 300,
  clanDetails: 300,
  locations: 86400,
  rankings: 300,
  cards: 86400,
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
  if (cache.size >= MAX_CACHE_SIZE) {
    const now = Date.now();
    for (const [k, item] of cache.entries()) {
      if (now > item.expiry) {
        cache.delete(k);
      }
      if (cache.size < MAX_CACHE_SIZE) break;
    }
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

function requireCRToken() {
  if (!CR_API_TOKEN) {
    throw new Error('Clash Royale API token is not configured on the server');
  }
}

async function fetchFromCR(endpoint, cacheKey, ttl) {
  requireCRToken();

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
    setCache(cacheKey, data, ttl);
    log('success', `Cached: ${cacheKey} (${ttl}s TTL)`);
    return data;
  } catch (error) {
    log('error', `Fetch error for ${endpoint}: ${error.message}`);
    throw error;
  }
}

function deleteCacheKey(key) {
  cache.delete(key);
}

export {
  fetchFromCR,
  getCache,
  setCache,
  clearCache,
  deleteCacheKey,
  getCacheKey,
  CACHE_TTL,
  cache,
  MAX_CACHE_SIZE
};
