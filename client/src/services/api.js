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
    // Network/CORS errors throw TypeError in all browsers
    if (error.name === 'TypeError') {
      console.error(`API Error (${endpoint}):`, error.message);
      throw new Error('Cannot connect to server. The backend may be restarting or a CORS issue occurred.');
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
  return fetchAPI('/locations', { cache: 'no-store' });
}

export function getLocation(locationId) {
  return fetchAPI(`/locations/${locationId}`, { cache: 'no-store' });
}

export function getPlayerRankings(locationId) {
  return fetchAPI(`/locations/${locationId}/rankings/players`, { cache: 'no-store' });
}

export function getClanRankings(locationId) {
  return fetchAPI(`/locations/${locationId}/rankings/clans`, { cache: 'no-store' });
}

export function getClanWarRankings(locationId) {
  return fetchAPI(`/locations/${locationId}/rankings/clanwars`, { cache: 'no-store' });
}

export function getPathOfLegendRankings(locationId) {
  return fetchAPI(`/locations/${locationId}/pathoflegend/players`, { cache: 'no-store' });
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

function adminHeaders(key) {
  return { 'X-Admin-Key': key };
}

// Admin
export function getAdminFeatures(key, params = {}) {
  const query = new URLSearchParams();
  if (params.status) query.append('status', params.status);
  if (params.search) query.append('search', params.search);
  return fetchAPI(`/roadmap/admin/features?${query.toString()}`, {
    headers: adminHeaders(key)
  });
}

export function approveFeature(id, key) {
  return fetchAPI(`/roadmap/admin/features/${id}/approve`, {
    method: 'POST',
    headers: adminHeaders(key)
  });
}

export function rejectFeature(id, key) {
  return fetchAPI(`/roadmap/admin/features/${id}/reject`, {
    method: 'POST',
    headers: adminHeaders(key)
  });
}

export function updateFeatureStatus(id, status, key) {
  return fetchAPI(`/roadmap/admin/features/${id}/status`, {
    method: 'POST',
    headers: adminHeaders(key),
    body: JSON.stringify({ status })
  });
}

export function bulkFeatures(action, ids, key, extra = {}) {
  return fetchAPI(`/roadmap/admin/features/bulk`, {
    method: 'POST',
    headers: adminHeaders(key),
    body: JSON.stringify({ action, ids, ...extra })
  });
}

// ==================== UTILS ====================

// ==================== COMMUNITY TOURNAMENTS ====================

export function getCommunityTournaments() {
  return fetchAPI(`/community-tournaments`);
}

export function getCommunityTournament(id) {
  return fetchAPI(`/community-tournaments/${id}`);
}

export function getTournamentArchive() {
  return fetchAPI(`/community-tournaments/archive`);
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

export function getVapidPublicKey() {
  return fetchAPI('/notifications/vapid-public-key');
}

export function subscribeToPush(tournamentId, subscription) {
  return fetchAPI(`/community-tournaments/${tournamentId}/subscribe`, {
    method: 'POST',
    body: JSON.stringify(subscription)
  });
}

export function unsubscribeFromPush(tournamentId, endpoint) {
  return fetchAPI(`/community-tournaments/${tournamentId}/unsubscribe`, {
    method: 'POST',
    body: JSON.stringify({ endpoint })
  });
}

export function subscribeToSitePush(subscription) {
  return fetchAPI('/notifications/subscribe', {
    method: 'POST',
    body: JSON.stringify(subscription)
  });
}

export function unsubscribeFromSitePush(endpoint) {
  return fetchAPI('/notifications/unsubscribe', {
    method: 'POST',
    body: JSON.stringify({ endpoint })
  });
}

export function getNotifications(endpoint) {
  const qs = endpoint ? `?endpoint=${encodeURIComponent(endpoint)}` : '';
  return fetchAPI(`/notifications${qs}`);
}

export function markNotificationRead(id, endpoint) {
  return fetchAPI(`/notifications/${id}/read`, {
    method: 'POST',
    body: JSON.stringify({ endpoint })
  });
}

export function markAllNotificationsRead(endpoint) {
  return fetchAPI(`/notifications/read-all`, {
    method: 'POST',
    body: JSON.stringify({ endpoint })
  });
}

// Admin Tournament APIs
export function getAdminTournaments(key, params = {}) {
  const query = new URLSearchParams();
  if (params.status) query.append('status', params.status);
  if (params.search) query.append('search', params.search);
  return fetchAPI(`/community-tournaments/admin?${query.toString()}`, {
    headers: adminHeaders(key)
  });
}

export function approveTournament(id, key) {
  return fetchAPI(`/community-tournaments/admin/${id}/approve`, {
    method: 'POST',
    headers: adminHeaders(key)
  });
}

export function rejectTournament(id, key) {
  return fetchAPI(`/community-tournaments/admin/${id}/reject`, {
    method: 'POST',
    headers: adminHeaders(key)
  });
}

export function updateTournamentStatus(id, status, key) {
  return fetchAPI(`/community-tournaments/admin/${id}/status`, {
    method: 'POST',
    headers: adminHeaders(key),
    body: JSON.stringify({ status })
  });
}

export function updateTournamentWinners(id, winners, key) {
  return fetchAPI(`/community-tournaments/admin/${id}/winners`, {
    method: 'POST',
    headers: adminHeaders(key),
    body: JSON.stringify(winners)
  });
}

export function updateTournamentPrizeStatus(id, prizeStatus, key) {
  return fetchAPI(`/community-tournaments/admin/${id}/prize-status`, {
    method: 'POST',
    headers: adminHeaders(key),
    body: JSON.stringify({ prize_status: prizeStatus })
  });
}

export function updateTournament(id, data, key) {
  return fetchAPI(`/community-tournaments/admin/${id}/edit`, {
    method: 'POST',
    headers: adminHeaders(key),
    body: JSON.stringify(data)
  });
}

export function deleteTournament(id, key) {
  return fetchAPI(`/community-tournaments/admin/${id}`, {
    method: 'DELETE',
    headers: adminHeaders(key)
  });
}

export function deleteRegistration(tournamentId, regId, key) {
  return fetchAPI(`/community-tournaments/admin/${tournamentId}/registrations/${regId}`, {
    method: 'DELETE',
    headers: adminHeaders(key)
  });
}

export function updateRegistration(tournamentId, regId, data, key) {
  return fetchAPI(`/community-tournaments/admin/${tournamentId}/registrations/${regId}/edit`, {
    method: 'POST',
    headers: adminHeaders(key),
    body: JSON.stringify(data)
  });
}

export function promoteWaitlist(tournamentId, regId, key) {
  return fetchAPI(`/community-tournaments/admin/${tournamentId}/waitlist/${regId}/promote`, {
    method: 'POST',
    headers: adminHeaders(key)
  });
}

export function bulkTournaments(action, ids, key, extra = {}) {
  return fetchAPI(`/community-tournaments/admin/bulk`, {
    method: 'POST',
    headers: adminHeaders(key),
    body: JSON.stringify({ action, ids, ...extra })
  });
}

export function getAdminTournamentRegistrations(tournamentId, key) {
  return fetchAPI(`/community-tournaments/admin/${tournamentId}/registrations`, {
    headers: adminHeaders(key)
  });
}

export function bulkAddRegistrations(tournamentId, tags, key) {
  return fetchAPI(`/community-tournaments/admin/${tournamentId}/registrations/bulk`, {
    method: 'POST',
    headers: adminHeaders(key),
    body: JSON.stringify({ tags })
  });
}

export function bulkDeleteRegistrations(tournamentId, ids, key) {
  return fetchAPI(`/community-tournaments/admin/${tournamentId}/registrations/bulk-delete`, {
    method: 'POST',
    headers: adminHeaders(key),
    body: JSON.stringify({ ids })
  });
}

export function getTournamentMatches(id) {
  return fetchAPI(`/community-tournaments/${id}/matches`);
}

export function createTournamentMatch(tournamentId, data, key) {
  return fetchAPI(`/community-tournaments/admin/${tournamentId}/matches`, {
    method: 'POST',
    headers: adminHeaders(key),
    body: JSON.stringify(data)
  });
}

export function updateTournamentMatch(tournamentId, matchId, data, key) {
  return fetchAPI(`/community-tournaments/admin/${tournamentId}/matches/${matchId}`, {
    method: 'POST',
    headers: adminHeaders(key),
    body: JSON.stringify(data)
  });
}

export function updateTournamentMatchResult(tournamentId, matchId, data, key) {
  return fetchAPI(`/community-tournaments/admin/${tournamentId}/matches/${matchId}/result`, {
    method: 'POST',
    headers: adminHeaders(key),
    body: JSON.stringify(data)
  });
}

export function deleteTournamentMatch(tournamentId, matchId, key) {
  return fetchAPI(`/community-tournaments/admin/${tournamentId}/matches/${matchId}`, {
    method: 'DELETE',
    headers: adminHeaders(key)
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

export function getAdminClans(key, params = {}) {
  const query = new URLSearchParams();
  if (params.status) query.append('status', params.status);
  if (params.search) query.append('search', params.search);
  return fetchAPI(`/community-clans/admin?${query.toString()}`, {
    headers: adminHeaders(key)
  });
}

export function approveClan(id, key) {
  return fetchAPI(`/community-clans/admin/${id}/approve`, {
    method: 'POST',
    headers: adminHeaders(key)
  });
}

export function rejectClan(id, key) {
  return fetchAPI(`/community-clans/admin/${id}/reject`, {
    method: 'POST',
    headers: adminHeaders(key)
  });
}

export function updateClanStatus(id, status, key) {
  return fetchAPI(`/community-clans/admin/${id}/status`, {
    method: 'POST',
    headers: adminHeaders(key),
    body: JSON.stringify({ status })
  });
}

export function deleteClan(id, key) {
  return fetchAPI(`/community-clans/admin/${id}`, {
    method: 'DELETE',
    headers: adminHeaders(key)
  });
}

export function bulkClans(action, ids, key, extra = {}) {
  return fetchAPI(`/community-clans/admin/bulk`, {
    method: 'POST',
    headers: adminHeaders(key),
    body: JSON.stringify({ action, ids, ...extra })
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

export function getAdminStatePlayers(key, params = {}) {
  const query = new URLSearchParams();
  if (params.status) query.append('status', params.status);
  if (params.search) query.append('search', params.search);
  return fetchAPI(`/state-players/admin?${query.toString()}`, {
    headers: adminHeaders(key)
  });
}

export function approveStatePlayer(id, key) {
  return fetchAPI(`/state-players/admin/${id}/approve`, {
    method: 'POST',
    headers: adminHeaders(key)
  });
}

export function rejectStatePlayer(id, key) {
  return fetchAPI(`/state-players/admin/${id}/reject`, {
    method: 'POST',
    headers: adminHeaders(key)
  });
}

export function updateStatePlayerStatus(id, status, key) {
  return fetchAPI(`/state-players/admin/${id}/status`, {
    method: 'POST',
    headers: adminHeaders(key),
    body: JSON.stringify({ status })
  });
}

export function deleteStatePlayer(id, key) {
  return fetchAPI(`/state-players/admin/${id}`, {
    method: 'DELETE',
    headers: adminHeaders(key)
  });
}

export function bulkStatePlayers(action, ids, key, extra = {}) {
  return fetchAPI(`/state-players/admin/bulk`, {
    method: 'POST',
    headers: adminHeaders(key),
    body: JSON.stringify({ action, ids, ...extra })
  });
}

// ==================== COMMUNITY DECKS ====================

export function getCommunityDecks(sort = 'top') {
  return fetchAPI(`/community-decks?sort=${encodeURIComponent(sort)}`);
}

export function getCommunityDeck(id) {
  return fetchAPI(`/community-decks/${id}`);
}

export function getCommunityDeckShareUrl(id) {
  // Use the current public domain so share links work on Netlify custom domains
  // without requiring a separate env var. Falls back to backend endpoint for local dev.
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  if (origin && !origin.includes('localhost')) {
    return `${origin}/share/deck/${id}`;
  }
  return `${API_BASE}/community-decks/${id}/share`;
}

export function getDeckComments(id) {
  return fetchAPI(`/community-decks/${id}/comments`);
}

export function addDeckComment(id, data) {
  return fetchAPI(`/community-decks/${id}/comments`, {
    method: 'POST',
    body: JSON.stringify(data)
  });
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

export function getAdminCommunityDecks(key, params = {}) {
  const query = new URLSearchParams();
  if (params.status) query.append('status', params.status);
  if (params.search) query.append('search', params.search);
  return fetchAPI(`/community-decks/admin?${query.toString()}`, {
    headers: adminHeaders(key)
  });
}

export function approveCommunityDeck(id, key) {
  return fetchAPI(`/community-decks/admin/${id}/approve`, {
    method: 'POST',
    headers: adminHeaders(key)
  });
}

export function rejectCommunityDeck(id, key) {
  return fetchAPI(`/community-decks/admin/${id}/reject`, {
    method: 'POST',
    headers: adminHeaders(key)
  });
}

export function updateCommunityDeckStatus(id, status, key) {
  return fetchAPI(`/community-decks/admin/${id}/status`, {
    method: 'POST',
    headers: adminHeaders(key),
    body: JSON.stringify({ status })
  });
}

export function deleteCommunityDeck(id, key) {
  return fetchAPI(`/community-decks/admin/${id}`, {
    method: 'DELETE',
    headers: adminHeaders(key)
  });
}

export function bulkDecks(action, ids, key, extra = {}) {
  return fetchAPI(`/community-decks/admin/bulk`, {
    method: 'POST',
    headers: adminHeaders(key),
    body: JSON.stringify({ action, ids, ...extra })
  });
}

export function exportTournamentRegistrations(id, key) {
  const url = `/community-tournaments/admin/${id}/registrations/export?key=${encodeURIComponent(key)}`;
  window.open(`${API_BASE}${url}`, '_blank');
}

export function getAdminDashboard(key) {
  return fetchAPI(`/admin/dashboard`, {
    headers: adminHeaders(key)
  });
}

// ==================== UTILS ====================

export function checkHealth() {
  return fetchAPI('/health');
}

// ==================== ADMIN LOGS ====================

export function getAdminLogs(key, params = {}) {
  const query = new URLSearchParams();
  if (params.level) query.append('level', params.level);
  if (params.search) query.append('search', params.search);
  if (params.limit) query.append('limit', String(params.limit));
  if (params.offset) query.append('offset', String(params.offset));
  return fetchAPI(`/admin/logs?${query.toString()}`, {
    headers: adminHeaders(key)
  });
}

export function getAdminServerInfo(key) {
  return fetchAPI(`/admin/server-info`, {
    headers: adminHeaders(key)
  });
}

export function getAdminAuditTrail(key, params = {}) {
  const query = new URLSearchParams();
  if (params.resource) query.append('resource', params.resource);
  if (params.limit) query.append('limit', String(params.limit));
  if (params.offset) query.append('offset', String(params.offset));
  return fetchAPI(`/admin/audit-trail?${query.toString()}`, {
    headers: adminHeaders(key)
  });
}

export function getAdminRateLimits(key) {
  return fetchAPI(`/admin/rate-limits`, {
    headers: adminHeaders(key)
  });
}

// ==================== ADMIN NOTIFICATIONS ====================

export function getAdminNotifications(key, params = {}) {
  const query = new URLSearchParams();
  if (params.scope) query.append('scope', params.scope);
  if (params.search) query.append('search', params.search);
  if (params.limit) query.append('limit', String(params.limit));
  if (params.offset) query.append('offset', String(params.offset));
  return fetchAPI(`/admin/notifications?${query.toString()}`, {
    headers: adminHeaders(key)
  });
}

export function createAdminNotification(key, data) {
  return fetchAPI('/admin/notifications', {
    method: 'POST',
    headers: adminHeaders(key),
    body: JSON.stringify(data)
  });
}

export function deleteAdminNotification(id, key) {
  return fetchAPI(`/admin/notifications/${id}`, {
    method: 'DELETE',
    headers: adminHeaders(key)
  });
}

export function sendAdminNotificationPush(id, key) {
  return fetchAPI(`/admin/notifications/${id}/send-push`, {
    method: 'POST',
    headers: adminHeaders(key)
  });
}
