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

export function getClanCurrentWar(clanTag) {
  return fetchAPI(`/clans/${encodeURIComponent(clanTag)}/currentwar`);
}

export function getClanWarLog(clanTag) {
  return fetchAPI(`/clans/${encodeURIComponent(clanTag)}/warlog`);
}

export function getClanCurrentRiverRace(clanTag) {
  return fetchAPI(`/clans/${encodeURIComponent(clanTag)}/currentriverrace`);
}

export function getClanRiverRaceLog(clanTag) {
  return fetchAPI(`/clans/${encodeURIComponent(clanTag)}/riverracelog`);
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

// ==================== ROADMAP ====================

export function getRoadmapFeatures() {
  return fetchAPI('/roadmap/features');
}

export function submitFeature(name, description) {
  return fetchAPI('/roadmap/features', {
    method: 'POST',
    body: JSON.stringify({ name, description })
  });
}

export function voteFeature(featureId, voterId) {
  return fetchAPI('/roadmap/vote', {
    method: 'POST',
    body: JSON.stringify({ featureId, voterId })
  });
}

export function unvoteFeature(featureId, voterId) {
  return fetchAPI('/roadmap/vote', {
    method: 'DELETE',
    body: JSON.stringify({ featureId, voterId })
  });
}

export function getUserVotes(voterId) {
  return fetchAPI(`/roadmap/votes/${encodeURIComponent(voterId)}`);
}

// Admin
export function getAdminFeatures(key) {
  return fetchAPI(`/roadmap/admin/features?key=${encodeURIComponent(key)}`);
}

export function approveFeature(id, key) {
  return fetchAPI(`/roadmap/admin/features/${id}/approve?key=${encodeURIComponent(key)}`, {
    method: 'POST'
  });
}

export function rejectFeature(id, key) {
  return fetchAPI(`/roadmap/admin/features/${id}/reject?key=${encodeURIComponent(key)}`, {
    method: 'POST'
  });
}

export function updateFeatureStatus(id, status, key) {
  return fetchAPI(`/roadmap/admin/features/${id}/status?key=${encodeURIComponent(key)}`, {
    method: 'POST',
    body: JSON.stringify({ status })
  });
}

// ==================== UTILS ====================

export function checkHealth() {
  return fetchAPI('/health');
}
