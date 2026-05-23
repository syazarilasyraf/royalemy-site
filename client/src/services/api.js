/**
 * RoyaleMY API Service
 * All requests go through our backend proxy
 */

const API_BASE = import.meta.env.VITE_API_URL || '/api';

async function fetchAPI(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
        ...options.headers
      }
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`API Error (${endpoint}):`, error);
    throw error;
  }
}

// ==================== PLAYERS ====================

export function getPlayer(playerTag) {
  return fetchAPI(`/players/${encodeURIComponent(playerTag)}`);
}

export function getPlayerBattleLog(playerTag) {
  return fetchAPI(`/players/${encodeURIComponent(playerTag)}/battlelog`);
}

export function getPlayerUpcomingChests(playerTag) {
  return fetchAPI(`/players/${encodeURIComponent(playerTag)}/upcomingchests`);
}

// ==================== CLANS ====================

export function searchClans(params = {}) {
  const queryParams = new URLSearchParams();
  if (params.name) queryParams.append('name', params.name);
  if (params.minTrophies) queryParams.append('minTrophies', params.minTrophies);
  if (params.minMembers) queryParams.append('minMembers', params.minMembers);

  return fetchAPI(`/clans?${queryParams.toString()}`);
}

export function getClan(clanTag) {
  return fetchAPI(`/clans/${encodeURIComponent(clanTag)}`);
}

export function getClanMembers(clanTag) {
  return fetchAPI(`/clans/${encodeURIComponent(clanTag)}/members`);
}

// ==================== LOCATIONS / RANKINGS ====================

export function getLocations() {
  return fetchAPI('/locations');
}

export function getLocation(locationId) {
  return fetchAPI(`/locations/${locationId}`);
}

export function getPlayerRankings(locationId) {
  return fetchAPI(`/locations/${locationId}/rankings/players`);
}

export function getClanRankings(locationId) {
  return fetchAPI(`/locations/${locationId}/rankings/clans`);
}

export function getClanWarRankings(locationId) {
  return fetchAPI(`/locations/${locationId}/rankings/clanwars`);
}

export function getPathOfLegendRankings(locationId) {
  return fetchAPI(`/locations/${locationId}/pathoflegend/players`);
}

// ==================== TOURNAMENTS ====================

export function searchTournaments(name) {
  return fetchAPI(`/tournaments?name=${encodeURIComponent(name)}`);
}

export function getTournament(tournamentTag) {
  return fetchAPI(`/tournaments/${encodeURIComponent(tournamentTag)}`);
}

export function getGlobalTournaments() {
  return fetchAPI('/globaltournaments');
}

// ==================== CARDS ====================

export function getCards() {
  return fetchAPI('/cards');
}

// ==================== META DECKS ====================

export function getMetaDecks() {
  return fetchAPI('/meta-decks');
}

// ==================== UTILS ====================

export function checkHealth() {
  return fetchAPI('/health');
}
