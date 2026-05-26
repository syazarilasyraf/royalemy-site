import { useState, useEffect } from 'react';
import { searchClans, getClan, getClanMembers, getClanCurrentRiverRace, getClanRiverRaceLog } from '../services/api';

// Top Malaysian clans - featured recommendations
const FEATURED_MALAYSIA_CLANS = [
  { tag: 'GGUJU2RC', name: 'RoyaleMY', description: 'Join, chill and play together. - Powered by RoyaleMY - Built by @wandfk on tt.' },
  // { tag: 'Y9C98GR9', name: 'C.O.M.P.A.S.S.', description: 'You have to go through some bad says to Earn the best day of your life...' },
  // { tag: 'GQV099GG', name: 'BERITA HARIAN', description: 'Yang Tak Masuk Bontot Kau Berduri.. sape tak on 10 hari auto kick' },
  // { tag: '800JJGP8', name: 'perak', description: 'welcome to perak clan. happy clashing everyone and FREE PALESTINE!!' },
];

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
    if (!num && num !== 0) return '-';
    return num.toLocaleString();
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Load featured Malaysian clans on mount
  useEffect(() => {
    const loadFeaturedClans = async () => {
      setLoadingFeatured(true);
      try {
        const clanData = await Promise.all(
          FEATURED_MALAYSIA_CLANS.map(async (featured) => {
            try {
              const clan = await getClan(featured.tag);
              return { ...clan, description: featured.description };
            } catch {
              return null;
            }
          })
        );
        setFeaturedClans(clanData.filter(Boolean));
      } catch {
        setFeaturedClans([]);
      } finally {
        setLoadingFeatured(false);
      }
    };
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

              {/* Promotion Banner */}
              <div className="promo-banner">
                <div className="promo-icon">📢</div>
                <div className="promo-content">
                  <h4>Want your clan featured here?</h4>
                  <p>We're opening clan promotion slots soon! Malaysian clans can request to be featured on this page.</p>
                  <span className="promo-soon">Coming Soon</span>
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
                          {riverRaceData.clan.participantsList && riverRaceData.clan.participantsList.length > 0 && (
                            <div className="war-participants">
                              <h5 className="war-subtitle">Top Participants</h5>
                              {riverRaceData.clan.participantsList
                                .sort((a, b) => (b.fame || 0) - (a.fame || 0))
                                .slice(0, 10)
                                .map((p, i) => (
                                  <div key={p.tag || i} className="war-participant-row">
                                    <span className="war-participant-name">{p.name}</span>
                                    <span className="war-participant-score">⭐ {formatNumber(p.fame)}</span>
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
                                  <span className="war-log-season">Season {entry.seasonId}</span>
                                </div>
                                {entry.standings && entry.standings.map((standing, sIdx) => (
                                  <div key={sIdx} className="war-standing-row">
                                    <span className="war-standing-rank">#{standing.rank}</span>
                                    <span className="war-standing-name">{standing.clan.name}</span>
                                    <span className="war-standing-score">{formatNumber(standing.clan.fame)} fame</span>
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

        @media (max-width: 640px) {
          .promo-banner {
            flex-direction: column;
            text-align: center;
          }

          .war-stats-row {
            grid-template-columns: repeat(2, 1fr);
          }

          .war-log-header {
            flex-direction: column;
            align-items: flex-start;
            gap: var(--spacing-xs);
          }
        }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

export default ClanFinder;
