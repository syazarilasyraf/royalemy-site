import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  searchClans, getClan, getClanMembers, getClanCurrentRiverRace, getClanRiverRaceLog,
  getCommunityClans, submitCommunityClan, getAdminClans, approveClan, rejectClan, updateClanStatus, deleteClan,
} from '../services/api';

// Top Malaysian clans - featured recommendations
const FEATURED_MALAYSIA_CLANS = [
  { tag: 'GGUJU2RC', name: 'RoyaleMY', description: 'Join, chill and play together. - Powered by RoyaleMY - Built by @wandfk on tt.' },
  // { tag: 'Y9C98GR9', name: 'C.O.M.P.A.S.S.', description: 'You have to go through some bad says to Earn the best day of your life...' },
  // { tag: 'GQV099GG', name: 'BERITA HARIAN', description: 'Yang Tak Masuk Bontot Kau Berduri.. sape tak on 10 hari auto kick' },
  // { tag: '800JJGP8', name: 'perak', description: 'welcome to perak clan. happy clashing everyone and FREE PALESTINE!!' },
];

const CLAN_STATUS_LABELS = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
};

const CLAN_STATUS_BADGES = {
  pending: 'badge-warning',
  approved: 'badge-success',
  rejected: 'badge-danger',
};

// ==================== ADMIN PANEL ====================

function ClanAdminPanel({ adminKey, onRefresh }) {
  const [allClans, setAllClans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const fetchAdminData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getAdminClans(adminKey);
      setAllClans(data.clans || []);
    } catch (err) {
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  }, [adminKey]);

  useEffect(() => {
    fetchAdminData();
  }, [fetchAdminData]);

  const handleApprove = async (id) => {
    try {
      await approveClan(id, adminKey);
      setMessage('Clan approved');
      fetchAdminData();
      onRefresh();
    } catch (err) {
      setMessage(err.message);
    }
  };

  const handleReject = async (id) => {
    try {
      await rejectClan(id, adminKey);
      setMessage('Clan rejected');
      fetchAdminData();
      onRefresh();
    } catch (err) {
      setMessage(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this clan?')) return;
    try {
      await deleteClan(id, adminKey);
      setMessage('Clan deleted');
      fetchAdminData();
      onRefresh();
    } catch (err) {
      setMessage(err.message);
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      await updateClanStatus(id, status, adminKey);
      setMessage(`Status updated to ${CLAN_STATUS_LABELS[status]}`);
      fetchAdminData();
      onRefresh();
    } catch (err) {
      setMessage(err.message);
    }
  };

  const pending = allClans.filter((c) => c.status === 'pending');

  return (
    <div className="clan-admin">
      <h2 className="clan-admin-title">🛡️ Admin Panel</h2>
      {message && (
        <div className="alert alert-success" style={{ marginBottom: '1rem' }}>
          {message}
        </div>
      )}

      {pending.length > 0 && (
        <div className="clan-admin-section">
          <h3>Pending Review ({pending.length})</h3>
          <div className="clan-admin-list">
            {pending.map((c) => (
              <div key={c.id} className="clan-admin-item">
                <div>
                  <strong>{c.name}</strong>
                  <p style={{ margin: '4px 0 0', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                    #{c.clan_tag} — {c.leader_name}
                  </p>
                </div>
                <div className="clan-admin-actions">
                  <button className="btn btn-success btn-sm" onClick={() => handleApprove(c.id)}>
                    Approve
                  </button>
                  <button className="btn btn-danger btn-sm" onClick={() => handleReject(c.id)}>
                    Reject
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={() => handleDelete(c.id)}>
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="clan-admin-section">
        <h3>All Clans</h3>
        <div className="clan-admin-list">
          {allClans.map((c) => (
            <div key={c.id} className="clan-admin-item">
              <div>
                <strong>{c.name}</strong>
                <span
                  className={`badge ${CLAN_STATUS_BADGES[c.status] || 'badge-secondary'}`}
                  style={{ marginLeft: '8px' }}
                >
                  {CLAN_STATUS_LABELS[c.status]}
                </span>
                <p style={{ margin: '4px 0 0', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                  #{c.clan_tag} — {c.leader_name}
                </p>
              </div>
              <div className="clan-admin-actions">
                <select
                  className="input"
                  style={{ width: 'auto', fontSize: '0.8125rem', padding: '4px 8px' }}
                  value={c.status}
                  onChange={(e) => handleStatusChange(c.id, e.target.value)}
                >
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
                <button className="btn btn-secondary btn-sm" onClick={() => handleDelete(c.id)}>
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ==================== MAIN COMPONENT ====================

function ClanFinder() {
  const [searchParams, setSearchParams] = useState({
    name: '',
    minTrophies: '',
    minMembers: ''
  });
  const [clans, setClans] = useState([]);
  const [selectedClan, setSelectedClan] = useState(null);
  const [clanMembers, setClanMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [view, setView] = useState('search'); // 'search' or 'details'
  const [featuredClans, setFeaturedClans] = useState([]);
  const [loadingFeatured, setLoadingFeatured] = useState(false);
  const [activeDetailTab, setActiveDetailTab] = useState('members');
  const [riverRaceData, setRiverRaceData] = useState(null);
  const [riverRaceLog, setRiverRaceLog] = useState([]);
  const [warLoading, setWarLoading] = useState(false);

  // Community clans
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState('');
  const [submitForm, setSubmitForm] = useState({
    name: '',
    clan_tag: '',
    description: '',
    leader_name: '',
    discord_link: '',
    trophy_requirement: '',
    members_count: '',
    location: '',
  });

  const [urlSearchParams] = useSearchParams();
  const adminKey = urlSearchParams.get('admin');

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchParams.name.trim()) return;

    setLoading(true);
    setError('');
    setView('search');

    try {
      const data = await searchClans({
        name: searchParams.name,
        minTrophies: searchParams.minTrophies || undefined,
        minMembers: searchParams.minMembers || undefined
      });
      setClans(data.items || []);
    } catch (err) {
      setError('Failed to search clans. Please try again.');
      setClans([]);
    } finally {
      setLoading(false);
    }
  };

  const viewClanDetails = async (clan) => {
    setLoading(true);
    setWarLoading(true);
    setActiveDetailTab('members');
    setRiverRaceData(null);
    setRiverRaceLog([]);

    try {
      // Fetch full clan details and members
      const [clanDetails, members] = await Promise.all([
        getClan(clan.tag),
        getClanMembers(clan.tag)
      ]);
      setSelectedClan(clanDetails);
      setClanMembers(members.items || []);
      setView('details');
    } catch (err) {
      console.error('Failed to load clan details:', err);
      setSelectedClan(clan);
      setClanMembers([]);
      setView('details');
    } finally {
      setLoading(false);
    }

    // Fetch war data in parallel (non-blocking for main view)
    try {
      const [riverRace, riverRaceLog] = await Promise.all([
        getClanCurrentRiverRace(clan.tag).catch(() => null),
        getClanRiverRaceLog(clan.tag).catch(() => ({ items: [] }))
      ]);
      setRiverRaceData(riverRace);
      setRiverRaceLog(riverRaceLog?.items || []);
    } catch (err) {
      console.error('Failed to load war data:', err);
    } finally {
      setWarLoading(false);
    }
  };

  const formatNumber = (num) => {
    if (num === null || num === undefined) return '-';
    if (typeof num === 'object') return '-';
    const n = Number(num);
    if (Number.isNaN(n)) return '-';
    return n.toLocaleString();
  };

  const safeString = (val, fallback = '-') => {
    if (typeof val === 'string') return val;
    if (typeof val === 'number') return String(val);
    return fallback;
  };

  const safeNumber = (val) => {
    if (val === null || val === undefined) return 0;
    if (typeof val === 'object') return 0;
    const n = Number(val);
    return Number.isNaN(n) ? 0 : n;
  };

  const handleSubmitFormChange = (field, value) => {
    setSubmitForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmitClan = async (e) => {
    e.preventDefault();
    if (!submitForm.name || !submitForm.clan_tag || !submitForm.leader_name) {
      alert('Please fill in all required fields.');
      return;
    }

    setSubmitLoading(true);
    try {
      await submitCommunityClan(submitForm);
      setSubmitSuccess('Clan submitted for review! It will appear after admin approval.');
      setSubmitForm({
        name: '', clan_tag: '', description: '', leader_name: '',
        discord_link: '', trophy_requirement: '', members_count: '', location: ''
      });
      setTimeout(() => {
        setSubmitSuccess('');
        setShowSubmitModal(false);
        loadFeaturedClans();
      }, 1500);
    } catch (err) {
      alert('Failed to submit clan. Please try again.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const formatDate = (raw) => {
    const dateStr = safeString(raw, '');
    if (!dateStr) return '-';

    // Supercell API dates come as 20231015T143000.000Z — convert to ISO 8601
    let iso = dateStr;
    if (/^\d{8}T\d{6}/.test(dateStr)) {
      iso = dateStr.replace(
        /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(\.\d+)?Z?$/,
        '$1-$2-$3T$4:$5:$6$7Z'
      );
    }

    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return dateStr; // fallback: show raw string
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const loadFeaturedClans = async () => {
    setLoadingFeatured(true);
    try {
      // Load hardcoded featured clans
      const featuredData = await Promise.all(
        FEATURED_MALAYSIA_CLANS.map(async (featured) => {
          try {
            const clan = await getClan(featured.tag);
            return { ...clan, description: featured.description };
          } catch {
            return null;
          }
        })
      );

      // Load approved community clans and fetch their live data
      let communityData = [];
      try {
        const resp = await getCommunityClans();
        const approvedClans = resp.clans || [];
        communityData = await Promise.all(
          approvedClans.map(async (c) => {
            try {
              const clan = await getClan(c.clan_tag);
              return { ...clan, description: c.description || clan.description };
            } catch {
              return null;
            }
          })
        );
      } catch {
        // ignore
      }

      setFeaturedClans([...featuredData.filter(Boolean), ...communityData.filter(Boolean)]);
    } catch {
      setFeaturedClans([]);
    } finally {
      setLoadingFeatured(false);
    }
  };

  useEffect(() => {
    loadFeaturedClans();
  }, []);

  return (
    <div className="clan-finder">
      {view === 'search' ? (
        <>
          {/* Search Section */}
          <div className="finder-header">
            <h2 className="section-title">Clan Finder</h2>
            <p className="section-desc">Search for Malaysian clans to join</p>

            <form onSubmit={handleSearch} className="search-form">
              <div className="form-row">
                <input
                  type="text"
                  value={searchParams.name}
                  onChange={(e) => setSearchParams({ ...searchParams, name: e.target.value })}
                  placeholder="Clan name..."
                  className="input"
                />
              </div>
              <div className="form-row filters">
                <input
                  type="number"
                  value={searchParams.minTrophies}
                  onChange={(e) => setSearchParams({ ...searchParams, minTrophies: e.target.value })}
                  placeholder="Min trophies"
                  className="input"
                />
                <input
                  type="number"
                  value={searchParams.minMembers}
                  onChange={(e) => setSearchParams({ ...searchParams, minMembers: e.target.value })}
                  placeholder="Min members"
                  className="input"
                />
              </div>
              <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
                {loading ? 'Searching...' : '🔍 Search Clans'}
              </button>
              {error && <span className="error-text">{error}</span>}
            </form>
          </div>

          {/* Results */}
          {clans.length > 0 && (
            <div className="results-section">
              <h3 className="results-title">Found {clans.length} clans</h3>
              <div className="clan-list">
                {clans.map((clan) => (
                  <div key={clan.tag} className="clan-card" onClick={() => viewClanDetails(clan)}>
                    <div className="clan-header">
                      <div className="clan-badge">
                        {clan.badgeUrls?.small ? (
                          <img src={clan.badgeUrls.small} alt="" />
                        ) : (
                          <span>🏰</span>
                        )}
                      </div>
                      <div className="clan-info">
                        <h4 className="clan-name">{clan.name}</h4>
                        <span className="clan-tag">#{clan.tag}</span>
                      </div>
                    </div>
                    <div className="clan-stats">
                      <div className="clan-stat">
                        <span className="stat-value">{clan.members}</span>
                        <span className="stat-label">Members</span>
                      </div>
                      <div className="clan-stat">
                        <span className="stat-value">{formatNumber(clan.clanScore)}</span>
                        <span className="stat-label">Trophies</span>
                      </div>
                      <div className="clan-stat">
                        <span className="stat-value">{formatNumber(clan.requiredTrophies)}</span>
                        <span className="stat-label">Required</span>
                      </div>
                    </div>
                    <div className="clan-location">
                      {clan.location?.name && (
                        <span>📍 {clan.location.name}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {clans.length === 0 && !loading && searchParams.name && (
            <div className="empty-state">
              <p>No clans found. Try a different search.</p>
            </div>
          )}

          {/* Featured Malaysian Clans */}
          {clans.length === 0 && !loading && !searchParams.name && (
            <div className="featured-section">
              <h3 className="featured-title">🇲🇾 Featured Malaysian Clans</h3>
              <p className="featured-desc">Top recommended clans from Malaysia</p>
              
              {loadingFeatured ? (
                <div className="featured-loading">Loading featured clans...</div>
              ) : (
                <div className="featured-list">
                  {featuredClans.map((clan, index) => (
                    <div key={clan.tag} className="featured-card" onClick={() => viewClanDetails(clan)}>
                      <div className="featured-rank">#{index + 1}</div>
                      <div className="featured-badge">
                        {clan.badgeUrls?.small ? (
                          <img src={clan.badgeUrls.small} alt="" />
                        ) : (
                          <span>🏰</span>
                        )}
                      </div>
                      <div className="featured-info">
                        <h4 className="featured-name">{clan.name}</h4>
                        <span className="featured-tag">#{clan.tag}</span>
                        <span className="featured-meta">
                          🏆 {formatNumber(clan.clanScore)} • 👥 {clan.members}/50
                        </span>
                      </div>
                      <div className="featured-arrow">→</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Submit Clan Banner */}
              <div className="promo-banner clickable" onClick={() => setShowSubmitModal(true)}>
                <div className="promo-icon">➕</div>
                <div className="promo-content">
                  <h4>Promote Your Clan</h4>
                  <p>Submit your clan to be featured on this page. Approved clans will be visible to all visitors.</p>
                  <span className="promo-soon" style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)', color: 'white' }}>Submit Clan</span>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        /* Clan Details View */
        <div className="clan-details animate-fadeIn">
          <button className="back-btn" onClick={() => setView('search')}>
            ← Back to Search
          </button>

          {selectedClan && (
            <>
              <div className="clan-profile">
                <div className="clan-profile-header">
                  <div className="clan-badge-large">
                    {selectedClan.badgeUrls?.large ? (
                      <img src={selectedClan.badgeUrls.large} alt="" />
                    ) : (
                      <span>🏰</span>
                    )}
                  </div>
                  <div className="clan-profile-info">
                    <h2 className="clan-profile-name">{selectedClan.name}</h2>
                    <span className="clan-profile-tag">#{selectedClan.tag}</span>
                    {selectedClan.description && (
                      <p className="clan-description">{selectedClan.description}</p>
                    )}
                  </div>
                </div>

                <div className="clan-stats-grid">
                  <div className="stat-box">
                    <span className="stat-value">{selectedClan.members}/50</span>
                    <span className="stat-label">Members</span>
                  </div>
                  <div className="stat-box">
                    <span className="stat-value">{formatNumber(selectedClan.clanScore)}</span>
                    <span className="stat-label">Clan Trophies</span>
                  </div>
                  <div className="stat-box">
                    <span className="stat-value">{formatNumber(selectedClan.requiredTrophies)}</span>
                    <span className="stat-label">Required</span>
                  </div>
                  {selectedClan.clanWarTrophies && (
                    <div className="stat-box">
                      <span className="stat-value">{formatNumber(selectedClan.clanWarTrophies)}</span>
                      <span className="stat-label">War Trophies</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="detail-tabs">
                <button
                  className={`detail-tab ${activeDetailTab === 'members' ? 'active' : ''}`}
                  onClick={() => setActiveDetailTab('members')}
                >
                  👥 Members ({clanMembers.length})
                </button>
                <button
                  className={`detail-tab ${activeDetailTab === 'war' ? 'active' : ''}`}
                  onClick={() => setActiveDetailTab('war')}
                >
                  ⚔️ Clan Wars
                </button>
              </div>

              {activeDetailTab === 'members' && (
                <div className="members-section">
                  <div className="member-list">
                    {clanMembers.map((member, index) => (
                      <div key={member.tag || index} className="member-item">
                        <span className="member-rank">#{index + 1}</span>
                        <span className="member-name">{member.name}</span>
                        <span className="member-role">{member.role}</span>
                        <span className="member-trophies">🏆 {formatNumber(member.trophies)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeDetailTab === 'war' && (
                <div className="war-section">
                  {warLoading && (
                    <div className="war-loading">
                      <div className="spinner-small"></div>
                      <p>Loading war data...</p>
                    </div>
                  )}

                  {!warLoading && (
                    <>
                      {/* Current River Race */}
                      {riverRaceData && riverRaceData.clan && (
                        <div className="war-card">
                          <h4 className="war-card-title">🌊 Current River Race</h4>
                          <div className="war-stats-row">
                            <div className="war-stat">
                              <span className="war-stat-value">{formatNumber(riverRaceData.clan.fame)}</span>
                              <span className="war-stat-label">Fame</span>
                            </div>
                            <div className="war-stat">
                              <span className="war-stat-value">{formatNumber(riverRaceData.clan.repairPoints)}</span>
                              <span className="war-stat-label">Repair</span>
                            </div>
                            <div className="war-stat">
                              <span className="war-stat-value">{formatNumber(riverRaceData.clan.participants)}</span>
                              <span className="war-stat-label">Participants</span>
                            </div>
                            <div className="war-stat">
                              <span className="war-stat-value">#{formatNumber(riverRaceData.clan.rank)}</span>
                              <span className="war-stat-label">Rank</span>
                            </div>
                          </div>

                          {Array.isArray(riverRaceData.clan.participantsList) && riverRaceData.clan.participantsList.length > 0 && (
                            <div className="war-participants-table">
                              <h5 className="war-subtitle">Top Participants</h5>
                              <div className="war-table-header">
                                <span className="war-table-cell name">Player</span>
                                <span className="war-table-cell score">Fame</span>
                                <span className="war-table-cell score">Repair</span>
                                <span className="war-table-cell score">Decks</span>
                              </div>
                              {riverRaceData.clan.participantsList
                                .slice()
                                .sort((a, b) => safeNumber(b.fame) - safeNumber(a.fame))
                                .slice(0, 15)
                                .map((p, i) => (
                                  <div key={safeString(p.tag, i)} className="war-table-row">
                                    <span className="war-table-cell name">{safeString(p.name)}</span>
                                    <span className="war-table-cell score">{formatNumber(p.fame)}</span>
                                    <span className="war-table-cell score">{formatNumber(p.repairPoints)}</span>
                                    <span className="war-table-cell score">{formatNumber(p.decksUsed)}</span>
                                  </div>
                                ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* River Race Log */}
                      {riverRaceLog.length > 0 && (
                        <div className="war-card">
                          <h4 className="war-card-title">📜 Recent River Races</h4>
                          <div className="war-log-list">
                            {riverRaceLog.slice(0, 5).map((entry, index) => (
                              <div key={index} className="war-log-item">
                                <div className="war-log-header">
                                  <span className="war-log-date">{formatDate(entry.createdDate)}</span>
                                  <span className="war-log-season">Season {safeNumber(entry.seasonId)}</span>
                                </div>
                                {Array.isArray(entry.standings) && entry.standings.slice(0, 4).map((standing, sIdx) => (
                                  <div key={sIdx} className="war-standing-row">
                                    <span className="war-standing-rank">#{safeNumber(standing.rank)}</span>
                                    <span className="war-standing-name">{safeString(standing.clan?.name)}</span>
                                    <span className="war-standing-score">{formatNumber(standing.clan?.fame)} fame</span>
                                  </div>
                                ))}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Empty state */}
                      {!riverRaceData && riverRaceLog.length === 0 && (
                        <div className="war-empty">
                          <span className="war-empty-icon">⚔️</span>
                          <p>No war data available for this clan.</p>
                          <p className="war-empty-hint">War information appears once a clan participates in Clan Wars.</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

      <style>{`
        .clan-finder {
          max-width: 900px;
          margin: 0 auto;
        }

        .finder-header {
          text-align: center;
          padding: var(--spacing-xl) 0;
        }

        .section-title {
          font-size: 2rem;
          font-weight: 800;
          margin-bottom: var(--spacing-sm);
          background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .section-desc {
          color: var(--text-secondary);
          margin-bottom: var(--spacing-lg);
        }

        .search-form {
          max-width: 500px;
          margin: 0 auto;
        }

        .form-row {
          margin-bottom: var(--spacing-sm);
        }

        .form-row.filters {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--spacing-sm);
        }

        .error-text {
          display: block;
          color: var(--accent-danger);
          font-size: 0.875rem;
          margin-top: var(--spacing-sm);
        }

        /* Results */
        .results-section {
          padding: var(--spacing-lg) 0;
        }

        .results-title {
          font-size: 1.125rem;
          color: var(--text-secondary);
          margin-bottom: var(--spacing-md);
        }

        .clan-list {
          display: grid;
          gap: var(--spacing-md);
        }

        .clan-card {
          background: var(--bg-secondary);
          border-radius: var(--radius-xl);
          padding: var(--spacing-lg);
          border: 1px solid var(--bg-tertiary);
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .clan-card:hover {
          border-color: var(--accent-primary);
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
        }

        .clan-header {
          display: flex;
          align-items: center;
          gap: var(--spacing-md);
          margin-bottom: var(--spacing-md);
        }

        .clan-badge {
          width: 48px;
          height: 48px;
          border-radius: var(--radius-md);
          background: var(--bg-primary);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          overflow: hidden;
        }

        .clan-badge img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .clan-info {
          flex: 1;
        }

        .clan-name {
          font-size: 1.125rem;
          font-weight: 700;
          margin: 0 0 var(--spacing-xs);
          color: var(--text-primary);
        }

        .clan-tag {
          font-size: 0.75rem;
          color: var(--text-muted);
          font-family: monospace;
        }

        .clan-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: var(--spacing-md);
          padding: var(--spacing-md) 0;
          border-top: 1px solid var(--bg-tertiary);
          border-bottom: 1px solid var(--bg-tertiary);
          margin-bottom: var(--spacing-sm);
        }

        .clan-stat {
          text-align: center;
        }

        .clan-stat .stat-value {
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--text-primary);
          display: block;
        }

        .clan-stat .stat-label {
          font-size: 0.6875rem;
          color: var(--text-muted);
          text-transform: uppercase;
        }

        .clan-location {
          font-size: 0.875rem;
          color: var(--text-secondary);
        }

        /* Clan Details */
        .back-btn {
          margin-bottom: var(--spacing-lg);
          padding: var(--spacing-sm) var(--spacing-md);
          background: var(--bg-secondary);
          border: 1px solid var(--bg-tertiary);
          border-radius: var(--radius-md);
          color: var(--text-secondary);
          font-size: 0.875rem;
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .back-btn:hover {
          background: var(--bg-hover);
          color: var(--text-primary);
        }

        .clan-profile {
          background: var(--bg-secondary);
          border-radius: var(--radius-xl);
          padding: var(--spacing-xl);
          border: 1px solid var(--bg-tertiary);
          margin-bottom: var(--spacing-lg);
        }

        .clan-profile-header {
          display: flex;
          align-items: center;
          gap: var(--spacing-lg);
          margin-bottom: var(--spacing-lg);
        }

        .clan-badge-large {
          width: 80px;
          height: 80px;
          border-radius: var(--radius-lg);
          background: var(--bg-primary);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 3rem;
          overflow: hidden;
        }

        .clan-badge-large img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .clan-profile-info {
          flex: 1;
        }

        .clan-profile-name {
          font-size: 1.75rem;
          font-weight: 800;
          margin: 0 0 var(--spacing-xs);
          color: var(--text-primary);
        }

        .clan-profile-tag {
          font-size: 0.875rem;
          color: var(--text-muted);
          font-family: monospace;
        }

        .clan-description {
          margin-top: var(--spacing-sm);
          color: var(--text-secondary);
          font-size: 0.9375rem;
          line-height: 1.5;
        }

        .clan-stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          gap: var(--spacing-md);
        }

        .clan-stats-grid .stat-box {
          background: var(--bg-primary);
          border-radius: var(--radius-md);
          padding: var(--spacing-md);
          text-align: center;
        }

        .clan-stats-grid .stat-value {
          font-size: 1.5rem;
          font-weight: 800;
          color: var(--text-primary);
          display: block;
        }

        .clan-stats-grid .stat-label {
          font-size: 0.6875rem;
          color: var(--text-muted);
          text-transform: uppercase;
        }

        /* Members */
        .members-section {
          background: var(--bg-secondary);
          border-radius: var(--radius-xl);
          padding: var(--spacing-lg);
          border: 1px solid var(--bg-tertiary);
        }

        .section-subtitle {
          font-size: 1.125rem;
          margin: 0 0 var(--spacing-md);
          color: var(--text-primary);
        }

        .member-list {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-xs);
          max-height: 500px;
          overflow-y: auto;
        }

        .member-item {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
          padding: var(--spacing-sm) var(--spacing-md);
          background: var(--bg-primary);
          border-radius: var(--radius-md);
        }

        .member-rank {
          width: 32px;
          font-size: 0.875rem;
          font-weight: 700;
          color: var(--text-muted);
        }

        .member-name {
          flex: 1;
          font-weight: 600;
          color: var(--text-primary);
        }

        .member-role {
          font-size: 0.75rem;
          color: var(--text-muted);
          text-transform: capitalize;
          background: var(--bg-secondary);
          padding: 2px 8px;
          border-radius: var(--radius-full);
        }

        .member-trophies {
          font-size: 0.875rem;
          font-weight: 600;
          color: #f59e0b;
        }

        .empty-state {
          text-align: center;
          padding: var(--spacing-xl);
          color: var(--text-muted);
        }

        @media (max-width: 640px) {
          .form-row.filters {
            grid-template-columns: 1fr;
          }

          .clan-stats {
            grid-template-columns: 1fr;
            gap: var(--spacing-sm);
          }

          .clan-profile-header {
            flex-direction: column;
            text-align: center;
          }

          .member-item {
            flex-wrap: wrap;
          }

          .member-role {
            order: 3;
            width: 100%;
            margin-top: var(--spacing-xs);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.3s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* Featured Malaysian Clans */
        .featured-section {
          padding: var(--spacing-lg) 0;
        }

        .featured-title {
          text-align: center;
          font-size: 1.25rem;
          color: var(--text-primary);
          margin-bottom: var(--spacing-xs);
        }

        .featured-desc {
          text-align: center;
          font-size: 0.875rem;
          color: var(--text-muted);
          margin-bottom: var(--spacing-lg);
        }

        .featured-loading {
          text-align: center;
          color: var(--text-muted);
          padding: var(--spacing-lg);
        }

        .featured-list {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-md);
          margin-bottom: var(--spacing-xl);
        }

        .featured-card {
          display: flex;
          align-items: center;
          gap: var(--spacing-md);
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), var(--bg-secondary));
          border: 1px solid rgba(59, 130, 246, 0.3);
          border-radius: var(--radius-xl);
          padding: var(--spacing-md);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .featured-card:hover {
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.2), var(--bg-secondary));
          border-color: rgba(59, 130, 246, 0.5);
          transform: translateX(4px);
        }

        .featured-rank {
          font-size: 1.5rem;
          font-weight: 800;
          color: var(--accent-primary);
          min-width: 40px;
          text-align: center;
        }

        .featured-badge {
          width: 48px;
          height: 48px;
          background: var(--bg-tertiary);
          border-radius: var(--radius-lg);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
        }

        .featured-badge img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .featured-info {
          flex: 1;
          min-width: 0;
        }

        .featured-name {
          font-size: 1rem;
          font-weight: 700;
          color: var(--text-primary);
          margin: 0 0 2px;
        }

        .featured-tag {
          display: block;
          font-size: 0.75rem;
          color: var(--text-muted);
          margin-bottom: 2px;
        }

        .featured-meta {
          display: block;
          font-size: 0.75rem;
          color: var(--text-secondary);
        }

        .featured-arrow {
          font-size: 1.25rem;
          color: var(--accent-primary);
          opacity: 0.5;
        }

        .featured-card:hover .featured-arrow {
          opacity: 1;
        }

        /* Community Clans */
        .community-clans-section {
          margin-bottom: var(--spacing-xl);
        }

        .submit-clan-btn {
          padding: var(--spacing-xs) var(--spacing-md);
          background: linear-gradient(135deg, #22c55e, #16a34a);
          border: none;
          border-radius: var(--radius-md);
          color: white;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .submit-clan-btn:hover {
          filter: brightness(1.1);
        }

        .community-clan-list {
          display: grid;
          gap: var(--spacing-md);
        }

        .community-clan-card {
          background: var(--bg-secondary);
          border: 1px solid var(--bg-tertiary);
          border-radius: var(--radius-xl);
          padding: var(--spacing-lg);
          transition: all 0.2s;
        }

        .community-clan-card:hover {
          border-color: var(--accent-primary);
          transform: translateY(-2px);
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
        }

        .cc-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--spacing-sm);
        }

        .cc-badge {
          font-size: 1.15rem;
          font-weight: 700;
          color: var(--text-primary);
        }

        .cc-tag {
          font-size: 0.875rem;
          color: var(--text-muted);
          font-family: monospace;
        }

        .cc-desc {
          font-size: 0.875rem;
          color: var(--text-secondary);
          margin: 0 0 var(--spacing-sm);
          line-height: 1.5;
        }

        .cc-meta {
          display: flex;
          flex-wrap: wrap;
          gap: var(--spacing-sm);
          margin-bottom: var(--spacing-sm);
        }

        .cc-meta span {
          font-size: 0.8125rem;
          color: var(--text-muted);
          background: var(--bg-primary);
          padding: 4px 10px;
          border-radius: var(--radius-md);
        }

        .cc-actions {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: var(--spacing-sm);
        }

        .cc-discord {
          display: inline-flex;
          align-items: center;
          gap: var(--spacing-xs);
          padding: var(--spacing-xs) var(--spacing-sm);
          background: #5865f2;
          color: white;
          text-decoration: none;
          border-radius: var(--radius-md);
          font-size: 0.8125rem;
          font-weight: 600;
          transition: all 0.2s;
        }

        .cc-discord:hover {
          background: #4752c4;
        }

        .cc-share {
          display: inline-flex;
          align-items: center;
          gap: var(--spacing-xs);
          padding: var(--spacing-xs) var(--spacing-sm);
          background: var(--bg-primary);
          border: 1px solid var(--bg-tertiary);
          color: var(--text-secondary);
          border-radius: var(--radius-md);
          font-size: 0.8125rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .cc-share:hover {
          background: var(--accent-primary);
          color: white;
          border-color: var(--accent-primary);
        }

        .promo-banner.clickable {
          cursor: pointer;
          transition: all 0.2s;
        }

        .promo-banner.clickable:hover {
          border-color: var(--accent-primary);
          transform: translateY(-2px);
        }

        /* Promotion Banner */
        .promo-banner {
          display: flex;
          gap: var(--spacing-md);
          background: linear-gradient(135deg, rgba(245, 158, 11, 0.1), var(--bg-secondary));
          border: 1px dashed rgba(245, 158, 11, 0.4);
          border-radius: var(--radius-xl);
          padding: var(--spacing-lg);
          margin-top: var(--spacing-xl);
        }

        .promo-icon {
          font-size: 2rem;
          flex-shrink: 0;
        }

        .promo-content h4 {
          font-size: 1rem;
          color: var(--text-primary);
          margin: 0 0 var(--spacing-xs);
        }

        .promo-content p {
          font-size: 0.875rem;
          color: var(--text-secondary);
          margin: 0 0 var(--spacing-sm);
          line-height: 1.4;
        }

        .promo-soon {
          display: inline-block;
          padding: 4px 12px;
          background: rgba(245, 158, 11, 0.2);
          color: #f59e0b;
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          border-radius: var(--radius-full);
        }

        /* Detail Tabs */
        .detail-tabs {
          display: flex;
          gap: var(--spacing-sm);
          margin-bottom: var(--spacing-lg);
        }

        .detail-tab {
          flex: 1;
          padding: var(--spacing-sm) var(--spacing-md);
          background: var(--bg-secondary);
          border: 1px solid var(--bg-tertiary);
          border-radius: var(--radius-lg);
          color: var(--text-secondary);
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          text-align: center;
        }

        .detail-tab:hover {
          background: var(--bg-hover);
          color: var(--text-primary);
        }

        .detail-tab.active {
          background: var(--accent-primary);
          border-color: var(--accent-primary);
          color: white;
        }

        /* War Section */
        .war-section {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-lg);
        }

        .war-loading {
          text-align: center;
          padding: var(--spacing-xl);
          color: var(--text-muted);
        }

        .spinner-small {
          width: 28px;
          height: 28px;
          border: 3px solid var(--bg-tertiary);
          border-top-color: var(--accent-primary);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin: 0 auto var(--spacing-sm);
        }

        .war-card {
          background: var(--bg-secondary);
          border-radius: var(--radius-xl);
          padding: var(--spacing-lg);
          border: 1px solid var(--bg-tertiary);
        }

        .war-card-title {
          font-size: 1.125rem;
          font-weight: 700;
          margin: 0 0 var(--spacing-md);
          color: var(--text-primary);
        }

        .war-stats-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
          gap: var(--spacing-md);
          margin-bottom: var(--spacing-md);
        }

        .war-stat {
          background: var(--bg-primary);
          border-radius: var(--radius-md);
          padding: var(--spacing-md);
          text-align: center;
        }

        .war-stat-value {
          font-size: 1.25rem;
          font-weight: 800;
          color: var(--text-primary);
          display: block;
        }

        .war-stat-label {
          font-size: 0.6875rem;
          color: var(--text-muted);
          text-transform: uppercase;
        }

        .war-status {
          margin-bottom: var(--spacing-md);
        }

        .war-state-badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: var(--radius-full);
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
        }

        .war-state-badge.warDay {
          background: rgba(239, 68, 68, 0.2);
          color: #ef4444;
        }

        .war-state-badge.collectionDay {
          background: rgba(245, 158, 11, 0.2);
          color: #f59e0b;
        }

        .war-state-badge.notInWar {
          background: var(--bg-tertiary);
          color: var(--text-muted);
        }

        .war-subtitle {
          font-size: 0.9375rem;
          font-weight: 600;
          color: var(--text-secondary);
          margin: var(--spacing-md) 0 var(--spacing-sm);
        }

        .war-participants {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-xs);
        }

        .war-participant-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: var(--spacing-sm) var(--spacing-md);
          background: var(--bg-primary);
          border-radius: var(--radius-md);
        }

        .war-participant-name {
          font-weight: 600;
          color: var(--text-primary);
        }

        .war-participant-score {
          font-size: 0.875rem;
          font-weight: 700;
          color: #f59e0b;
        }

        .war-participants-table {
          margin-top: var(--spacing-md);
        }

        .war-table-header,
        .war-table-row {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr 1fr;
          gap: var(--spacing-sm);
          align-items: center;
          padding: var(--spacing-sm) var(--spacing-md);
        }

        .war-table-header {
          font-size: 0.6875rem;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          border-bottom: 1px solid var(--bg-tertiary);
          padding-bottom: var(--spacing-sm);
          margin-bottom: var(--spacing-xs);
        }

        .war-table-row {
          font-size: 0.875rem;
          border-bottom: 1px solid var(--bg-tertiary);
        }

        .war-table-row:last-child {
          border-bottom: none;
        }

        .war-table-row:nth-child(even) {
          background: rgba(255, 255, 255, 0.03);
          border-radius: var(--radius-sm);
        }

        .war-table-cell.name {
          color: var(--text-primary);
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .war-table-cell.score {
          color: var(--text-secondary);
          text-align: right;
          font-variant-numeric: tabular-nums;
        }

        .war-log-list {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-md);
        }

        .war-log-item {
          background: var(--bg-primary);
          border-radius: var(--radius-md);
          padding: var(--spacing-md);
        }

        .war-log-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: var(--spacing-sm);
        }

        .war-log-date {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--text-primary);
        }

        .war-log-season {
          font-size: 0.75rem;
          color: var(--text-muted);
          background: var(--bg-secondary);
          padding: 2px 8px;
          border-radius: var(--radius-full);
        }

        .war-standing-row {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
          padding: var(--spacing-xs) 0;
          border-bottom: 1px solid var(--bg-tertiary);
        }

        .war-standing-row:last-child {
          border-bottom: none;
        }

        .war-standing-rank {
          width: 28px;
          font-weight: 700;
          color: var(--text-muted);
          font-size: 0.875rem;
        }

        .war-standing-name {
          flex: 1;
          font-size: 0.875rem;
          color: var(--text-primary);
        }

        .war-standing-score {
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--text-secondary);
          white-space: nowrap;
        }

        .war-empty {
          text-align: center;
          padding: var(--spacing-xl);
          background: var(--bg-secondary);
          border-radius: var(--radius-xl);
          border: 1px solid var(--bg-tertiary);
        }

        .war-empty-icon {
          font-size: 3rem;
          display: block;
          margin-bottom: var(--spacing-md);
        }

        .war-empty p {
          color: var(--text-secondary);
          margin: 0 0 var(--spacing-xs);
        }

        .war-empty-hint {
          font-size: 0.8125rem;
          color: var(--text-muted);
        }

        /* Admin Panel */
        .clan-admin {
          margin-top: var(--spacing-xl);
          padding-top: var(--spacing-xl);
          border-top: 2px solid var(--bg-tertiary);
        }

        .clan-admin-title {
          font-size: 1.25rem;
          margin-bottom: var(--spacing-lg);
          color: var(--text-primary);
        }

        .clan-admin-section {
          margin-bottom: var(--spacing-lg);
        }

        .clan-admin-section h3 {
          font-size: 0.875rem;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: var(--spacing-md);
        }

        .clan-admin-list {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-sm);
        }

        .clan-admin-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--spacing-md);
          padding: var(--spacing-md);
          background: var(--bg-secondary);
          border: 1px solid var(--bg-tertiary);
          border-radius: var(--radius-lg);
        }

        .clan-admin-actions {
          display: flex;
          gap: var(--spacing-sm);
          flex-shrink: 0;
          align-items: center;
        }

        /* Modal */
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 200;
          padding: var(--spacing-md);
          backdrop-filter: blur(4px);
        }

        .modal-content {
          background: var(--bg-secondary);
          border: 1px solid var(--bg-tertiary);
          border-radius: var(--radius-xl);
          width: 100%;
          max-width: 560px;
          max-height: 90vh;
          overflow-y: auto;
          animation: modalIn 0.2s ease;
        }

        @keyframes modalIn {
          from { opacity: 0; transform: translateY(20px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: var(--spacing-lg);
          border-bottom: 1px solid var(--bg-tertiary);
        }

        .modal-header h3 {
          margin: 0;
          font-size: 1.25rem;
          color: var(--text-primary);
        }

        .modal-close {
          background: none;
          border: none;
          color: var(--text-muted);
          font-size: 1.25rem;
          cursor: pointer;
          padding: var(--spacing-xs);
        }

        .modal-close:hover {
          color: var(--text-primary);
        }

        .submit-form {
          padding: var(--spacing-lg);
        }

        .submit-success {
          background: rgba(34, 197, 94, 0.15);
          border: 1px solid rgba(34, 197, 94, 0.3);
          color: #22c55e;
          padding: var(--spacing-md);
          border-radius: var(--radius-lg);
          margin-bottom: var(--spacing-md);
          font-weight: 600;
        }

        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--spacing-md);
          margin-bottom: var(--spacing-lg);
        }

        .form-field {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-xs);
        }

        .form-field.full-width {
          grid-column: 1 / -1;
        }

        .form-field label {
          font-size: 0.8125rem;
          font-weight: 600;
          color: var(--text-secondary);
        }

        .form-field input,
        .form-field select,
        .form-field textarea {
          padding: var(--spacing-sm) var(--spacing-md);
          background: var(--bg-primary);
          border: 1px solid var(--bg-tertiary);
          border-radius: var(--radius-md);
          color: var(--text-primary);
          font-size: 0.9375rem;
          outline: none;
          transition: border-color 0.2s;
        }

        .form-field input:focus,
        .form-field select:focus,
        .form-field textarea:focus {
          border-color: var(--accent-primary);
        }

        .form-field input::placeholder,
        .form-field textarea::placeholder {
          color: var(--text-muted);
        }

        .form-field textarea {
          resize: vertical;
          font-family: inherit;
        }

        .submit-btn {
          width: 100%;
          padding: var(--spacing-md);
          background: linear-gradient(135deg, #22c55e, #16a34a);
          color: white;
          border: none;
          border-radius: var(--radius-lg);
          font-weight: 700;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .submit-btn:hover:not(:disabled) {
          filter: brightness(1.1);
        }

        .submit-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        @media (max-width: 640px) {
          .promo-banner {
            flex-direction: column;
            text-align: center;
          }

          .war-stats-row {
            grid-template-columns: repeat(2, 1fr);
          }

          .war-table-header,
          .war-table-row {
            grid-template-columns: 2fr 1fr 1fr 1fr;
            padding: var(--spacing-xs) var(--spacing-sm);
            gap: var(--spacing-xs);
          }

          .war-table-header {
            font-size: 0.625rem;
          }

          .war-table-row {
            font-size: 0.8125rem;
          }

          .war-log-header {
            flex-direction: column;
            align-items: flex-start;
            gap: var(--spacing-xs);
          }

          .clan-admin-item {
            flex-direction: column;
            align-items: flex-start;
          }

          .clan-admin-actions {
            width: 100%;
          }

          .clan-admin-actions .btn {
            flex: 1;
          }

          .form-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      {/* Submit Clan Modal */}
      {showSubmitModal && (
        <div className="modal-overlay" onClick={() => setShowSubmitModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>➕ Submit Clan</h3>
              <button className="modal-close" onClick={() => setShowSubmitModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmitClan} className="submit-form">
              {submitSuccess && <div className="submit-success">{submitSuccess}</div>}
              <div className="form-grid">
                <div className="form-field">
                  <label>Clan Name *</label>
                  <input type="text" value={submitForm.name} onChange={(e) => handleSubmitFormChange('name', e.target.value)} placeholder="Your clan name" required />
                </div>
                <div className="form-field">
                  <label>Clan Tag *</label>
                  <input type="text" value={submitForm.clan_tag} onChange={(e) => handleSubmitFormChange('clan_tag', e.target.value)} placeholder="e.g. GGUJU2RC" required />
                </div>
                <div className="form-field">
                  <label>Leader Name *</label>
                  <input type="text" value={submitForm.leader_name} onChange={(e) => handleSubmitFormChange('leader_name', e.target.value)} placeholder="Your name" required />
                </div>
                <div className="form-field">
                  <label>Location</label>
                  <input type="text" value={submitForm.location} onChange={(e) => handleSubmitFormChange('location', e.target.value)} placeholder="e.g. Malaysia" />
                </div>
                <div className="form-field">
                  <label>Trophy Requirement</label>
                  <input type="number" value={submitForm.trophy_requirement} onChange={(e) => handleSubmitFormChange('trophy_requirement', e.target.value)} placeholder="e.g. 5000" />
                </div>
                <div className="form-field">
                  <label>Members Count</label>
                  <input type="number" value={submitForm.members_count} onChange={(e) => handleSubmitFormChange('members_count', e.target.value)} placeholder="e.g. 25" />
                </div>
                <div className="form-field full-width">
                  <label>Discord Link (optional)</label>
                  <input type="url" value={submitForm.discord_link} onChange={(e) => handleSubmitFormChange('discord_link', e.target.value)} placeholder="https://discord.gg/..." />
                </div>
                <div className="form-field full-width">
                  <label>Description (optional)</label>
                  <textarea value={submitForm.description} onChange={(e) => handleSubmitFormChange('description', e.target.value)} placeholder="Tell us about your clan..." rows={3} />
                </div>
              </div>
              <button type="submit" className="submit-btn" disabled={submitLoading}>
                {submitLoading ? 'Submitting...' : 'Submit for Review'}
              </button>
            </form>
          </div>
        </div>
      )}

      {adminKey && <ClanAdminPanel adminKey={adminKey} onRefresh={loadFeaturedClans} />}
    </div>
  );
}

export default ClanFinder;
