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
        ...options.headers
      }
    });

    if (!response.ok) {
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const error = await response.json().catch(() => ({ error: `Server error (${response.status})` }));
        throw new Error(error.error || `HTTP ${response.status}`);
      }
      // Server returned HTML (likely not running or misconfigured)
      if (response.status === 404) {
        throw new Error('API endpoint not found. Is the backend server running?');
      }
      throw new Error(`Server error (${response.status}). The backend may be down or misconfigured.`);
    }

    return await response.json();
  } catch (error) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      console.error(`API Error (${endpoint}): Backend unreachable`);
      throw new Error('Cannot connect to server. Please make sure the backend is running.');
    }
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

// ==================== COMMUNITY TOURNAMENTS ====================

export function getCommunityTournaments() {
  return fetchAPI('/community-tournaments');
}

export function getCommunityTournament(id) {
  return fetchAPI(`/community-tournaments/${id}`);
}

export function getTournamentArchive() {
  return fetchAPI('/community-tournaments/archive');
}

export function submitCommunityTournament(data) {
  return fetchAPI('/community-tournaments', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export function registerForTournament(id, data) {
  return fetchAPI(`/community-tournaments/${id}/register`, {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export function getTournamentRegistrations(id) {
  return fetchAPI(`/community-tournaments/${id}/registrations`);
}

export function getHallOfFame(limit = 50) {
  return fetchAPI(`/community-tournaments/hall-of-fame?limit=${limit}`);
}

// Admin Tournament APIs
export function getAdminTournaments(key) {
  return fetchAPI(`/community-tournaments/admin?key=${encodeURIComponent(key)}`);
}

export function approveTournament(id, key) {
  return fetchAPI(`/community-tournaments/admin/${id}/approve?key=${encodeURIComponent(key)}`, {
    method: 'POST'
  });
}

export function rejectTournament(id, key) {
  return fetchAPI(`/community-tournaments/admin/${id}/reject?key=${encodeURIComponent(key)}`, {
    method: 'POST'
  });
}

export function updateTournamentStatus(id, status, key) {
  return fetchAPI(`/community-tournaments/admin/${id}/status?key=${encodeURIComponent(key)}`, {
    method: 'POST',
    body: JSON.stringify({ status })
  });
}

export function updateTournamentWinners(id, winners, key) {
  return fetchAPI(`/community-tournaments/admin/${id}/winners?key=${encodeURIComponent(key)}`, {
    method: 'POST',
    body: JSON.stringify(winners)
  });
}

export function updateTournamentPrizeStatus(id, prizeStatus, key) {
  return fetchAPI(`/community-tournaments/admin/${id}/prize-status?key=${encodeURIComponent(key)}`, {
    method: 'POST',
    body: JSON.stringify({ prize_status: prizeStatus })
  });
}

export function deleteTournament(id, key) {
  return fetchAPI(`/community-tournaments/admin/${id}?key=${encodeURIComponent(key)}`, {
    method: 'DELETE'
  });
}

// ==================== COMMUNITY CLANS ====================

export function getCommunityClans() {
  return fetchAPI('/community-clans');
}

export function getCommunityClan(id) {
  return fetchAPI(`/community-clans/${id}`);
}

export function submitCommunityClan(data) {
  return fetchAPI('/community-clans', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export function getAdminClans(key) {
  return fetchAPI(`/community-clans/admin?key=${encodeURIComponent(key)}`);
}

export function approveClan(id, key) {
  return fetchAPI(`/community-clans/admin/${id}/approve?key=${encodeURIComponent(key)}`, {
    method: 'POST'
  });
}

export function rejectClan(id, key) {
  return fetchAPI(`/community-clans/admin/${id}/reject?key=${encodeURIComponent(key)}`, {
    method: 'POST'
  });
}

export function updateClanStatus(id, status, key) {
  return fetchAPI(`/community-clans/admin/${id}/status?key=${encodeURIComponent(key)}`, {
    method: 'POST',
    body: JSON.stringify({ status })
  });
}

export function deleteClan(id, key) {
  return fetchAPI(`/community-clans/admin/${id}?key=${encodeURIComponent(key)}`, {
    method: 'DELETE'
  });
}

// ==================== STATE PLAYERS ====================

export function getStatePlayers() {
  return fetchAPI('/state-players');
}

export function submitStatePlayer(data) {
  return fetchAPI('/state-players', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export function getAdminStatePlayers(key) {
  return fetchAPI(`/state-players/admin?key=${encodeURIComponent(key)}`);
}

export function approveStatePlayer(id, key) {
  return fetchAPI(`/state-players/admin/${id}/approve?key=${encodeURIComponent(key)}`, {
    method: 'POST'
  });
}

export function rejectStatePlayer(id, key) {
  return fetchAPI(`/state-players/admin/${id}/reject?key=${encodeURIComponent(key)}`, {
    method: 'POST'
  });
}

export function updateStatePlayerStatus(id, status, key) {
  return fetchAPI(`/state-players/admin/${id}/status?key=${encodeURIComponent(key)}`, {
    method: 'POST',
    body: JSON.stringify({ status })
  });
}

export function deleteStatePlayer(id, key) {
  return fetchAPI(`/state-players/admin/${id}?key=${encodeURIComponent(key)}`, {
    method: 'DELETE'
  });
}

// ==================== COMMUNITY DECKS ====================

export function getCommunityDecks() {
  return fetchAPI('/community-decks');
}

export function getCommunityDeck(id) {
  return fetchAPI(`/community-decks/${id}`);
}

export function submitCommunityDeck(data) {
  return fetchAPI('/community-decks', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export function voteCommunityDeck(id) {
  return fetchAPI(`/community-decks/${id}/vote`, {
    method: 'POST'
  });
}

export function getAdminCommunityDecks(key) {
  return fetchAPI(`/community-decks/admin?key=${encodeURIComponent(key)}`);
}

export function approveCommunityDeck(id, key) {
  return fetchAPI(`/community-decks/admin/${id}/approve?key=${encodeURIComponent(key)}`, {
    method: 'POST'
  });
}

export function rejectCommunityDeck(id, key) {
  return fetchAPI(`/community-decks/admin/${id}/reject?key=${encodeURIComponent(key)}`, {
    method: 'POST'
  });
}

export function updateCommunityDeckStatus(id, status, key) {
  return fetchAPI(`/community-decks/admin/${id}/status?key=${encodeURIComponent(key)}`, {
    method: 'POST',
    body: JSON.stringify({ status })
  });
}

export function deleteCommunityDeck(id, key) {
  return fetchAPI(`/community-decks/admin/${id}?key=${encodeURIComponent(key)}`, {
    method: 'DELETE'
  });
}

// ==================== UTILS ====================

export function checkHealth() {
  return fetchAPI('/health');
}

// ==================== ADMIN LOGS ====================

export function getAdminLogs(key, params = {}) {
  const query = new URLSearchParams();
  query.append('key', key);
  if (params.level) query.append('level', params.level);
  if (params.search) query.append('search', params.search);
  if (params.limit) query.append('limit', String(params.limit));
  if (params.offset) query.append('offset', String(params.offset));
  return fetchAPI(`/admin/logs?${query.toString()}`);
}

export function getAdminServerInfo(key) {
  return fetchAPI(`/admin/server-info?key=${encodeURIComponent(key)}`);
}
