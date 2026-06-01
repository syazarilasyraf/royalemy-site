import { useState, useEffect } from 'react';
import {
  searchTournaments,
  getTournament,
  getGlobalTournaments,
  getCommunityTournaments,
  submitCommunityTournament,
  subscribeToPush,
  unsubscribeFromPush,
} from '../services/api';

function TournamentFinder() {
  const [searchName, setSearchName] = useState('');
  const [tournaments, setTournaments] = useState([]);
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [view, setView] = useState('search');
  const [globalTournaments, setGlobalTournaments] = useState([]);
  const [loadingGlobal, setLoadingGlobal] = useState(false);
  
  // Tournament tag checker
  const [tagInput, setTagInput] = useState('');
  const [tagResult, setTagResult] = useState(null);
  const [tagLoading, setTagLoading] = useState(false);
  const [tagError, setTagError] = useState('');

  // Community tournaments
  const [communityTournaments, setCommunityTournaments] = useState([]);
  const [loadingCommunity, setLoadingCommunity] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState('');
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [notifyLoading, setNotifyLoading] = useState(false);
  const [submitForm, setSubmitForm] = useState({
    name: '',
    host_name: '',
    description: '',
    tournament_tag: '',
    start_date: '',
    end_date: '',
    format: '1v1',
    max_players: '',
    prize: '',
    discord_link: '',
    contact_info: '',
  });

  // Load global tournaments
  const loadGlobalTournaments = async () => {
    setLoadingGlobal(true);
    try {
      const data = await getGlobalTournaments();
      setGlobalTournaments(data.items || []);
    } catch (err) {
      console.error('Failed to load global tournaments:', err);
      setGlobalTournaments([]);
    } finally {
      setLoadingGlobal(false);
    }
  };

  useEffect(() => {
    loadGlobalTournaments();
    loadCommunityTournaments();
    checkPushSubscription();
  }, []);

  const loadCommunityTournaments = async () => {
    setLoadingCommunity(true);
    try {
      const data = await getCommunityTournaments();
      setCommunityTournaments(data.tournaments || []);
    } catch (err) {
      console.error('Failed to load community tournaments:', err);
      setCommunityTournaments([]);
    } finally {
      setLoadingCommunity(false);
    }
  };

  const checkPushSubscription = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      setPushSubscribed(!!sub);
    } catch (e) {
      // ignore
    }
  };

  const handleNotifyMe = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      alert('Push notifications are not supported in your browser.');
      return;
    }

    setNotifyLoading(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        alert('Notification permission denied.');
        setNotifyLoading(false);
        return;
      }

      const reg = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      const vapidPublicKey = 'BEA0HRFKiWyh0_PWXjqLEBDY_L3jOSTNRNRpVhFx-5mfYyGvBf6Quu0c8t-Oyn0K0bMaknRqWioTsg-omNPgVoA';
      const convertedKey = urlBase64ToUint8Array(vapidPublicKey);

      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedKey,
      });

      await subscribeToPush(subscription);
      setPushSubscribed(true);
    } catch (err) {
      console.error('Failed to subscribe:', err);
      alert('Failed to enable notifications. Please try again.');
    } finally {
      setNotifyLoading(false);
    }
  };

  const handleUnsubscribe = async () => {
    setNotifyLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await unsubscribeFromPush(sub.endpoint);
        await sub.unsubscribe();
      }
      setPushSubscribed(false);
    } catch (err) {
      console.error('Failed to unsubscribe:', err);
    } finally {
      setNotifyLoading(false);
    }
  };

  function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  const handleSubmitFormChange = (field, value) => {
    setSubmitForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmitTournament = async (e) => {
    e.preventDefault();
    if (!submitForm.name || !submitForm.host_name || !submitForm.start_date) {
      alert('Please fill in all required fields.');
      return;
    }

    setSubmitLoading(true);
    try {
      await submitCommunityTournament(submitForm);
      setSubmitSuccess('Tournament submitted for review!');
      setSubmitForm({
        name: '',
        host_name: '',
        description: '',
        tournament_tag: '',
        start_date: '',
        end_date: '',
        format: '1v1',
        max_players: '',
        prize: '',
        discord_link: '',
        contact_info: '',
      });
      setTimeout(() => {
        setSubmitSuccess('');
        setShowSubmitModal(false);
      }, 2000);
    } catch (err) {
      alert('Failed to submit tournament. Please try again.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const getTournamentBadge = (startDate) => {
    const now = new Date();
    const start = new Date(startDate);
    const diff = start - now;

    if (diff <= 0) return { label: 'Live', color: '#22c55e', bg: 'rgba(34,197,94,0.15)' };
    if (diff < 3600000) return { label: '< 1 hour', color: '#ef4444', bg: 'rgba(239,68,68,0.15)' };
    if (diff < 86400000) return { label: '< 24 hours', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' };
    const days = Math.ceil(diff / 86400000);
    return { label: `In ${days} days`, color: '#3b82f6', bg: 'rgba(59,130,246,0.15)' };
  };

  const handleRefresh = () => {
    loadGlobalTournaments();
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchName.trim()) return;

    setLoading(true);
    setError('');
    setView('search');

    try {
      const data = await searchTournaments(searchName);
      setTournaments(data.items || []);
    } catch (err) {
      setError('Failed to search tournaments. Please try again.');
      setTournaments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleTagCheck = async (e) => {
    e.preventDefault();
    if (!tagInput.trim()) return;

    setTagLoading(true);
    setTagError('');
    setTagResult(null);

    try {
      const data = await getTournament(tagInput.trim());
      setTagResult(data);
    } catch (err) {
      setTagError('Tournament not found.');
    } finally {
      setTagLoading(false);
    }
  };

  const viewTournamentDetails = async (tournament) => {
    setLoading(true);
    try {
      const details = await getTournament(tournament.tag);
      setSelectedTournament(details);
      setView('details');
    } catch (err) {
      console.error('Failed to load tournament details:', err);
      setSelectedTournament(tournament);
      setView('details');
    } finally {
      setLoading(false);
    }
  };

  const getStatusConfig = (status) => {
    switch (status?.toLowerCase()) {
      case 'inprogress': 
        return { color: '#22c55e', bg: 'rgba(34, 197, 94, 0.15)', label: 'Active', dot: '🟢' };
      case 'upcoming': 
        return { color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)', label: 'Upcoming', dot: '🔵' };
      case 'ended': 
        return { color: '#6b7280', bg: 'rgba(107, 114, 128, 0.15)', label: 'Finished', dot: '⚪' };
      default: 
        return { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)', label: 'Unknown', dot: '🟡' };
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatTimeRemaining = (endTime) => {
    if (!endTime) return '-';
    const end = new Date(endTime);
    const now = new Date();
    const diff = end - now;
    
    if (diff <= 0) return 'Ended';
    
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    
    if (hours > 24) return `${Math.floor(hours / 24)}d ${hours % 24}h left`;
    if (hours > 0) return `${hours}h ${minutes}m left`;
    return `${minutes}m left`;
  };

  // Coming Soon feature cards
  const ComingSoonCard = ({ icon, title, description }) => (
    <div className="coming-soon-card">
      <div className="cs-icon">{icon}</div>
      <h4>{title}</h4>
      <p>{description}</p>
      <span className="cs-badge">🔒 Coming Soon</span>
    </div>
  );

  return (
    <div className="tournament-finder">
      {view === 'search' ? (
        <>
          {/* Header */}
          <div className="finder-header">
            <h2 className="section-title">🏆 Tournament Finder</h2>
            <p className="section-desc">Find and join tournaments in Clash Royale</p>
          </div>

          {/* Official Global Tournaments */}
          <section className="global-section">
            <div className="section-header">
              <div>
                <h3>🌍 Official Global Tournaments</h3>
                <p className="section-subtitle">Ongoing official tournaments from Supercell</p>
              </div>
              <button className="refresh-btn" onClick={handleRefresh} disabled={loadingGlobal}>
                {loadingGlobal ? '⟳' : '🔄'} Refresh
              </button>
            </div>
            
            {loadingGlobal ? (
              <div className="loading-state">
                <div className="loading-spinner"></div>
                <p>Loading tournaments...</p>
              </div>
            ) : globalTournaments.length > 0 ? (
              <div className="global-cards">
                {globalTournaments.map((tournament) => {
                  const status = getStatusConfig(tournament.status);
                  const isFull = tournament.capacity >= tournament.maxCapacity;
                  return (
                    <div 
                      key={tournament.tag} 
                      className="global-card"
                      onClick={() => viewTournamentDetails(tournament)}
                    >
                      <div className="card-header">
                        <span 
                          className="status-badge"
                          style={{ 
                            color: status.color, 
                            background: status.bg 
                          }}
                        >
                          {status.dot} {status.label}
                        </span>
                        {isFull && <span className="full-badge">FULL</span>}
                      </div>
                      
                      <h4 className="tournament-name">{tournament.name}</h4>
                      
                      <div className="player-count">
                        <div className="progress-bar">
                          <div 
                            className="progress-fill"
                            style={{ 
                              width: `${(tournament.capacity / tournament.maxCapacity) * 100}%`,
                              background: isFull ? '#ef4444' : '#22c55e'
                            }}
                          />
                        </div>
                        <span className="count-text">
                          {tournament.capacity} / {tournament.maxCapacity} players
                        </span>
                      </div>

                      <div className="tournament-meta">
                        <div className="meta-item">
                          <span className="meta-label">Started</span>
                          <span className="meta-value">{formatDate(tournament.startTime)}</span>
                        </div>
                        <div className="meta-item">
                          <span className="meta-label">Ends</span>
                          <span className="meta-value">{formatDate(tournament.endTime)}</span>
                        </div>
                        {tournament.prizes && tournament.prizes.length > 0 && (
                          <div className="meta-item prize">
                            <span className="meta-label">Prize</span>
                            <span className="meta-value">{tournament.prizes[0].amount} {tournament.prizes[0].type}</span>
                          </div>
                        )}
                      </div>

                      {tournament.status === 'inProgress' && (
                        <div className="time-remaining" style={{ color: status.color }}>
                          ⏱️ {formatTimeRemaining(tournament.endTime)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="empty-state-box">
                <div className="empty-icon">🏆</div>
                <h4>No official global tournaments are available right now.</h4>
                <p className="empty-helper">Global tournaments appear periodically in Clash Royale. Check back later!</p>
              </div>
            )}
          </section>

          {/* Community Tournaments */}
          <section className="community-section">
            <div className="section-header">
              <div>
                <h3>👥 Community Tournaments</h3>
                <p className="section-subtitle">Upcoming tournaments submitted by the community</p>
              </div>
              <div className="community-actions">
                <button
                  className="notify-btn"
                  onClick={pushSubscribed ? handleUnsubscribe : handleNotifyMe}
                  disabled={notifyLoading}
                >
                  {notifyLoading ? '⟳' : pushSubscribed ? '🔕 Unsubscribe' : '🔔 Notify Me'}
                </button>
                <button
                  className="submit-tournament-btn"
                  onClick={() => setShowSubmitModal(true)}
                >
                  ➕ Submit Tournament
                </button>
              </div>
            </div>

            {loadingCommunity ? (
              <div className="loading-state">
                <div className="loading-spinner"></div>
                <p>Loading community tournaments...</p>
              </div>
            ) : communityTournaments.length > 0 ? (
              <div className="community-tournament-list">
                {communityTournaments.map((t) => {
                  const badge = getTournamentBadge(t.start_date);
                  return (
                    <div key={t.id} className="community-tournament-card">
                      <div className="ct-card-header">
                        <span className="ct-badge" style={{ color: badge.color, background: badge.bg }}>
                          {badge.label}
                        </span>
                        <span className="ct-format">{t.format}</span>
                      </div>
                      <h4 className="ct-name">{t.name}</h4>
                      <p className="ct-host">Hosted by {t.host_name}</p>
                      {t.description && <p className="ct-desc">{t.description}</p>}
                      <div className="ct-meta">
                        <span>📅 {formatDate(t.start_date)}</span>
                        {t.max_players && <span>👥 {t.max_players} players</span>}
                        {t.prize && <span>🏆 {t.prize}</span>}
                      </div>
                      <div className="ct-links">
                        {t.discord_link && (
                          <a href={t.discord_link} target="_blank" rel="noopener noreferrer" className="ct-discord">
                            💬 Discord
                          </a>
                        )}
                        {t.tournament_tag && (
                          <span className="ct-tag">#{t.tournament_tag}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="empty-state-box">
                <div className="empty-icon">🏆</div>
                <h4>No community tournaments yet</h4>
                <p className="empty-helper">Be the first to submit a tournament!</p>
              </div>
            )}
          </section>

          {/* Check Tournament by Tag */}
          <section className="tag-checker-section">
            <h3>🔎 Check Tournament by Tag</h3>
            <p className="section-subtitle">Enter a tournament tag to view details</p>
            
            <form onSubmit={handleTagCheck} className="tag-form">
              <div className="tag-input-wrapper">
                <span className="tag-prefix">#</span>
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value.replace('#', ''))}
                  placeholder="Enter tournament tag"
                  className="tag-input"
                />
                <button 
                  type="submit" 
                  className="tag-submit-btn"
                  disabled={tagLoading || !tagInput.trim()}
                >
                  {tagLoading ? 'Checking...' : 'Check Tournament'}
                </button>
              </div>
            </form>

            {tagError && (
              <div className="tag-error">
                <span>❌</span> {tagError}
              </div>
            )}

            {tagResult && (
              <div className="tag-result" onClick={() => viewTournamentDetails(tagResult)}>
                <div className="tr-header">
                  <span 
                    className="tr-status"
                    style={{ color: getStatusConfig(tagResult.status).color }}
                  >
                    {getStatusConfig(tagResult.status).dot} {getStatusConfig(tagResult.status).label}
                  </span>
                </div>
                <h4>{tagResult.name}</h4>
                <p>👥 {tagResult.capacity}/{tagResult.maxCapacity} players</p>
                <span className="tr-click">Click to view details →</span>
              </div>
            )}
          </section>

          {/* Submit Tournament Modal */}
          {showSubmitModal && (
            <div className="modal-overlay" onClick={() => setShowSubmitModal(false)}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h3>➕ Submit Tournament</h3>
                  <button className="modal-close" onClick={() => setShowSubmitModal(false)}>✕</button>
                </div>
                <form onSubmit={handleSubmitTournament} className="submit-form">
                  {submitSuccess && <div className="submit-success">{submitSuccess}</div>}
                  <div className="form-grid">
                    <div className="form-field">
                      <label>Tournament Name *</label>
                      <input
                        type="text"
                        value={submitForm.name}
                        onChange={(e) => handleSubmitFormChange('name', e.target.value)}
                        placeholder="e.g. RoyaleMY Weekly Cup"
                        required
                      />
                    </div>
                    <div className="form-field">
                      <label>Host Name *</label>
                      <input
                        type="text"
                        value={submitForm.host_name}
                        onChange={(e) => handleSubmitFormChange('host_name', e.target.value)}
                        placeholder="Your name or clan"
                        required
                      />
                    </div>
                    <div className="form-field">
                      <label>Start Date & Time *</label>
                      <input
                        type="datetime-local"
                        value={submitForm.start_date}
                        onChange={(e) => handleSubmitFormChange('start_date', e.target.value)}
                        required
                      />
                    </div>
                    <div className="form-field">
                      <label>End Date & Time (optional)</label>
                      <input
                        type="datetime-local"
                        value={submitForm.end_date}
                        onChange={(e) => handleSubmitFormChange('end_date', e.target.value)}
                      />
                    </div>
                    <div className="form-field">
                      <label>Format</label>
                      <select
                        value={submitForm.format}
                        onChange={(e) => handleSubmitFormChange('format', e.target.value)}
                      >
                        <option value="1v1">1v1</option>
                        <option value="2v2">2v2</option>
                        <option value="Draft">Draft</option>
                        <option value="Triple Elixir">Triple Elixir</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div className="form-field">
                      <label>Max Players</label>
                      <input
                        type="number"
                        value={submitForm.max_players}
                        onChange={(e) => handleSubmitFormChange('max_players', e.target.value)}
                        placeholder="e.g. 50"
                      />
                    </div>
                    <div className="form-field full-width">
                      <label>Tournament Tag (optional)</label>
                      <input
                        type="text"
                        value={submitForm.tournament_tag}
                        onChange={(e) => handleSubmitFormChange('tournament_tag', e.target.value)}
                        placeholder="Clash Royale tournament tag"
                      />
                    </div>
                    <div className="form-field full-width">
                      <label>Prize (optional)</label>
                      <input
                        type="text"
                        value={submitForm.prize}
                        onChange={(e) => handleSubmitFormChange('prize', e.target.value)}
                        placeholder="e.g. 1000 Gems"
                      />
                    </div>
                    <div className="form-field full-width">
                      <label>Discord Link (optional)</label>
                      <input
                        type="url"
                        value={submitForm.discord_link}
                        onChange={(e) => handleSubmitFormChange('discord_link', e.target.value)}
                        placeholder="https://discord.gg/..."
                      />
                    </div>
                    <div className="form-field full-width">
                      <label>Contact Info (optional)</label>
                      <input
                        type="text"
                        value={submitForm.contact_info}
                        onChange={(e) => handleSubmitFormChange('contact_info', e.target.value)}
                        placeholder="Discord username, email, etc."
                      />
                    </div>
                    <div className="form-field full-width">
                      <label>Description (optional)</label>
                      <textarea
                        value={submitForm.description}
                        onChange={(e) => handleSubmitFormChange('description', e.target.value)}
                        placeholder="Rules, requirements, additional info..."
                        rows={3}
                      />
                    </div>
                  </div>
                  <button type="submit" className="submit-btn" disabled={submitLoading}>
                    {submitLoading ? 'Submitting...' : 'Submit for Review'}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Search Results (if any) */}
          {tournaments.length > 0 && (
            <section className="search-results">
              <h3>Search Results</h3>
              <div className="tournament-list">
                {tournaments.map((tournament) => (
                  <div 
                    key={tournament.tag} 
                    className="tournament-card"
                    onClick={() => viewTournamentDetails(tournament)}
                  >
                    <div className="tc-header">
                      <span 
                        className="tc-status"
                        style={{ color: getStatusConfig(tournament.status).color }}
                      >
                        {getStatusConfig(tournament.status).dot} {getStatusConfig(tournament.status).label}
                      </span>
                    </div>
                    <h4>{tournament.name}</h4>
                    <p>#{tournament.tag}</p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      ) : (
        /* Tournament Details View */
        <div className="tournament-details">
          <button className="back-btn" onClick={() => setView('search')}>
            ← Back
          </button>

          {selectedTournament && (
            <div className="details-card">
              <div 
                className="details-status"
                style={{ 
                  color: getStatusConfig(selectedTournament.status).color,
                  background: getStatusConfig(selectedTournament.status).bg
                }}
              >
                {getStatusConfig(selectedTournament.status).dot} {getStatusConfig(selectedTournament.status).label}
              </div>
              
              <h2>{selectedTournament.name}</h2>
              <p className="details-tag">#{selectedTournament.tag}</p>
              
              <div className="details-stats">
                <div className="ds-item">
                  <span className="ds-value">{selectedTournament.capacity}/{selectedTournament.maxCapacity}</span>
                  <span className="ds-label">Players</span>
                </div>
                <div className="ds-item">
                  <span className="ds-value">{formatDate(selectedTournament.startTime)}</span>
                  <span className="ds-label">Started</span>
                </div>
                <div className="ds-item">
                  <span className="ds-value">{formatDate(selectedTournament.endTime)}</span>
                  <span className="ds-label">Ends</span>
                </div>
              </div>

              <div className="join-box">
                <h4>How to Join</h4>
                <ol>
                  <li>Open Clash Royale app</li>
                  <li>Go to Tournament tab</li>
                  <li>Search tag: <strong>#{selectedTournament.tag}</strong></li>
                </ol>
                <button 
                  className="copy-btn"
                  onClick={() => navigator.clipboard.writeText(selectedTournament.tag)}
                >
                  📋 Copy Tag
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <style>{`
        .tournament-finder {
          max-width: 900px;
          margin: 0 auto;
          padding-bottom: var(--spacing-xl);
        }

        .finder-header {
          text-align: center;
          padding: var(--spacing-xl) 0;
        }

        .section-title {
          font-size: 2rem;
          font-weight: 800;
          margin-bottom: var(--spacing-sm);
          background: linear-gradient(135deg, #f59e0b 0%, #f97316 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .section-desc {
          color: var(--text-secondary);
        }

        /* Section Styling */
        section {
          margin-bottom: var(--spacing-xl);
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: var(--spacing-md);
          flex-wrap: wrap;
          gap: var(--spacing-sm);
        }

        section h3 {
          font-size: 1.25rem;
          color: var(--text-primary);
          margin-bottom: var(--spacing-xs);
        }

        .section-subtitle {
          font-size: 0.875rem;
          color: var(--text-muted);
        }

        .refresh-btn {
          padding: var(--spacing-xs) var(--spacing-md);
          background: var(--bg-secondary);
          border: 1px solid var(--bg-tertiary);
          border-radius: var(--radius-md);
          color: var(--text-primary);
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .refresh-btn:hover {
          background: var(--accent-primary);
          color: white;
          border-color: var(--accent-primary);
        }

        /* Loading State */
        .loading-state {
          text-align: center;
          padding: var(--spacing-xl);
          color: var(--text-muted);
        }

        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid var(--bg-tertiary);
          border-top-color: var(--accent-primary);
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto var(--spacing-md);
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Global Tournament Cards */
        .global-cards {
          display: grid;
          gap: var(--spacing-md);
        }

        .global-card {
          background: var(--bg-secondary);
          border: 1px solid var(--bg-tertiary);
          border-radius: var(--radius-xl);
          padding: var(--spacing-lg);
          cursor: pointer;
          transition: all 0.2s;
        }

        .global-card:hover {
          border-color: var(--accent-primary);
          transform: translateY(-2px);
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--spacing-sm);
        }

        .status-badge {
          padding: 4px 12px;
          border-radius: var(--radius-full);
          font-size: 0.8rem;
          font-weight: 700;
        }

        .full-badge {
          background: #ef4444;
          color: white;
          padding: 2px 8px;
          border-radius: var(--radius-sm);
          font-size: 0.7rem;
          font-weight: 700;
        }

        .tournament-name {
          font-size: 1.2rem;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: var(--spacing-md);
        }

        .player-count {
          margin-bottom: var(--spacing-md);
        }

        .progress-bar {
          height: 8px;
          background: var(--bg-tertiary);
          border-radius: var(--radius-full);
          overflow: hidden;
          margin-bottom: var(--spacing-xs);
        }

        .progress-fill {
          height: 100%;
          border-radius: var(--radius-full);
          transition: width 0.3s ease;
        }

        .count-text {
          font-size: 0.875rem;
          color: var(--text-secondary);
        }

        .tournament-meta {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: var(--spacing-sm);
          margin-bottom: var(--spacing-md);
        }

        .meta-item {
          display: flex;
          flex-direction: column;
          background: var(--bg-primary);
          padding: var(--spacing-sm);
          border-radius: var(--radius-md);
        }

        .meta-item.prize .meta-value {
          color: #f59e0b;
          font-weight: 700;
        }

        .meta-label {
          font-size: 0.7rem;
          color: var(--text-muted);
          text-transform: uppercase;
        }

        .meta-value {
          font-size: 0.875rem;
          color: var(--text-primary);
          font-weight: 600;
        }

        .time-remaining {
          font-size: 0.9rem;
          font-weight: 700;
          text-align: center;
          padding: var(--spacing-sm);
          background: var(--bg-primary);
          border-radius: var(--radius-md);
        }

        /* Empty State */
        .empty-state-box {
          text-align: center;
          padding: var(--spacing-xl);
          background: var(--bg-secondary);
          border-radius: var(--radius-xl);
          border: 2px dashed var(--bg-tertiary);
        }

        .empty-state-box .empty-icon {
          font-size: 3rem;
          margin-bottom: var(--spacing-md);
          opacity: 0.5;
        }

        .empty-state-box h4 {
          color: var(--text-primary);
          margin-bottom: var(--spacing-sm);
        }

        .empty-helper {
          font-size: 0.875rem;
          color: var(--text-muted);
        }

        /* Coming Soon Section */
        .coming-soon-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: var(--spacing-md);
        }

        .coming-soon-card {
          background: var(--bg-secondary);
          border: 1px solid var(--bg-tertiary);
          border-radius: var(--radius-xl);
          padding: var(--spacing-lg);
          text-align: center;
          opacity: 0.7;
          position: relative;
          overflow: hidden;
        }

        .coming-soon-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(135deg, transparent 0%, rgba(255,255,255,0.03) 100%);
          pointer-events: none;
        }

        .cs-icon {
          font-size: 2rem;
          margin-bottom: var(--spacing-sm);
          opacity: 0.6;
        }

        .coming-soon-card h4 {
          font-size: 1rem;
          color: var(--text-primary);
          margin-bottom: var(--spacing-xs);
        }

        .coming-soon-card p {
          font-size: 0.8rem;
          color: var(--text-muted);
          margin-bottom: var(--spacing-sm);
        }

        .cs-badge {
          display: inline-block;
          padding: 4px 10px;
          background: var(--bg-tertiary);
          color: var(--text-muted);
          font-size: 0.7rem;
          border-radius: var(--radius-full);
          font-weight: 600;
        }

        /* Tag Checker */
        .tag-form {
          margin-bottom: var(--spacing-md);
        }

        .tag-input-wrapper {
          display: flex;
          gap: var(--spacing-sm);
          background: var(--bg-secondary);
          padding: var(--spacing-sm);
          border-radius: var(--radius-lg);
          border: 1px solid var(--bg-tertiary);
        }

        .tag-prefix {
          font-size: 1.25rem;
          color: var(--text-muted);
          font-weight: 700;
          padding: var(--spacing-sm);
        }

        .tag-input {
          flex: 1;
          background: transparent;
          border: none;
          color: var(--text-primary);
          font-size: 1rem;
          outline: none;
        }

        .tag-input::placeholder {
          color: var(--text-muted);
        }

        .tag-submit-btn {
          padding: var(--spacing-sm) var(--spacing-md);
          background: var(--accent-primary);
          color: white;
          border: none;
          border-radius: var(--radius-md);
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .tag-submit-btn:hover:not(:disabled) {
          filter: brightness(1.1);
        }

        .tag-submit-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .tag-error {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
          padding: var(--spacing-md);
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: var(--radius-md);
          color: #ef4444;
        }

        .tag-result {
          background: var(--bg-secondary);
          border: 1px solid var(--bg-tertiary);
          border-radius: var(--radius-lg);
          padding: var(--spacing-md);
          cursor: pointer;
          transition: all 0.2s;
        }

        .tag-result:hover {
          border-color: var(--accent-primary);
        }

        .tr-header {
          margin-bottom: var(--spacing-xs);
        }

        .tr-status {
          font-size: 0.8rem;
          font-weight: 700;
        }

        .tag-result h4 {
          color: var(--text-primary);
          margin: 0 0 var(--spacing-xs);
        }

        .tag-result p {
          color: var(--text-secondary);
          font-size: 0.875rem;
          margin: 0 0 var(--spacing-xs);
        }

        .tr-click {
          font-size: 0.8rem;
          color: var(--accent-primary);
        }

        /* Malaysia Section */
        .malaysia-card {
          display: flex;
          align-items: center;
          gap: var(--spacing-md);
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), var(--bg-secondary));
          border: 1px solid rgba(59, 130, 246, 0.3);
          border-radius: var(--radius-xl);
          padding: var(--spacing-lg);
          opacity: 0.8;
        }

        .mc-icon {
          font-size: 2.5rem;
        }

        .mc-content {
          flex: 1;
        }

        .mc-content h4 {
          color: var(--text-primary);
          margin: 0 0 var(--spacing-xs);
        }

        .mc-content p {
          color: var(--text-secondary);
          font-size: 0.875rem;
          margin: 0;
        }

        .mc-badge {
          padding: 4px 12px;
          background: var(--bg-tertiary);
          color: var(--text-muted);
          font-size: 0.75rem;
          border-radius: var(--radius-full);
          font-weight: 600;
        }

        /* Search Results */
        .tournament-list {
          display: grid;
          gap: var(--spacing-md);
        }

        .tournament-card {
          background: var(--bg-secondary);
          border: 1px solid var(--bg-tertiary);
          border-radius: var(--radius-lg);
          padding: var(--spacing-md);
          cursor: pointer;
          transition: all 0.2s;
        }

        .tournament-card:hover {
          border-color: var(--accent-primary);
        }

        .tc-header {
          margin-bottom: var(--spacing-xs);
        }

        .tc-status {
          font-size: 0.8rem;
          font-weight: 700;
        }

        /* Details View */
        .tournament-details {
          animation: fadeIn 0.3s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .back-btn {
          background: var(--bg-secondary);
          border: 1px solid var(--bg-tertiary);
          color: var(--text-primary);
          padding: var(--spacing-sm) var(--spacing-md);
          border-radius: var(--radius-md);
          cursor: pointer;
          margin-bottom: var(--spacing-lg);
          font-size: 0.9rem;
        }

        .back-btn:hover {
          background: var(--bg-tertiary);
        }

        .details-card {
          background: var(--bg-secondary);
          border-radius: var(--radius-xl);
          padding: var(--spacing-xl);
          border: 1px solid var(--bg-tertiary);
          text-align: center;
        }

        .details-status {
          display: inline-block;
          padding: 6px 16px;
          border-radius: var(--radius-full);
          font-size: 0.875rem;
          font-weight: 700;
          margin-bottom: var(--spacing-md);
        }

        .details-card h2 {
          color: var(--text-primary);
          margin: 0 0 var(--spacing-xs);
        }

        .details-tag {
          color: var(--text-muted);
          font-family: monospace;
          margin-bottom: var(--spacing-lg);
        }

        .details-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: var(--spacing-md);
          margin-bottom: var(--spacing-lg);
        }

        .ds-item {
          background: var(--bg-primary);
          padding: var(--spacing-md);
          border-radius: var(--radius-lg);
        }

        .ds-value {
          display: block;
          font-size: 1rem;
          font-weight: 700;
          color: var(--accent-primary);
        }

        .ds-label {
          font-size: 0.7rem;
          color: var(--text-muted);
          text-transform: uppercase;
        }

        .join-box {
          background: var(--bg-primary);
          border-radius: var(--radius-lg);
          padding: var(--spacing-lg);
          text-align: left;
        }

        .join-box h4 {
          margin: 0 0 var(--spacing-md);
          color: var(--text-primary);
        }

        .join-box ol {
          margin: 0 0 var(--spacing-md);
          padding-left: var(--spacing-lg);
          color: var(--text-secondary);
        }

        .join-box li {
          margin-bottom: var(--spacing-xs);
        }

        .copy-btn {
          width: 100%;
          padding: var(--spacing-md);
          background: linear-gradient(135deg, #22c55e, #16a34a);
          color: white;
          border: none;
          border-radius: var(--radius-lg);
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
        }

        .copy-btn:hover {
          filter: brightness(1.1);
        }

        /* Mobile Responsive */
        /* Community Tournament Cards */
        .community-actions {
          display: flex;
          gap: var(--spacing-sm);
          flex-wrap: wrap;
        }

        .notify-btn {
          padding: var(--spacing-xs) var(--spacing-md);
          background: var(--bg-secondary);
          border: 1px solid var(--bg-tertiary);
          border-radius: var(--radius-md);
          color: var(--text-primary);
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .notify-btn:hover {
          background: var(--accent-primary);
          color: white;
          border-color: var(--accent-primary);
        }

        .submit-tournament-btn {
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

        .submit-tournament-btn:hover {
          filter: brightness(1.1);
        }

        .community-tournament-list {
          display: grid;
          gap: var(--spacing-md);
        }

        .community-tournament-card {
          background: var(--bg-secondary);
          border: 1px solid var(--bg-tertiary);
          border-radius: var(--radius-xl);
          padding: var(--spacing-lg);
          transition: all 0.2s;
        }

        .community-tournament-card:hover {
          border-color: var(--accent-primary);
          transform: translateY(-2px);
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
        }

        .ct-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--spacing-sm);
        }

        .ct-badge {
          padding: 4px 12px;
          border-radius: var(--radius-full);
          font-size: 0.75rem;
          font-weight: 700;
        }

        .ct-format {
          font-size: 0.75rem;
          color: var(--text-muted);
          background: var(--bg-tertiary);
          padding: 4px 10px;
          border-radius: var(--radius-full);
          font-weight: 600;
        }

        .ct-name {
          font-size: 1.15rem;
          font-weight: 700;
          color: var(--text-primary);
          margin: 0 0 var(--spacing-xs);
        }

        .ct-host {
          font-size: 0.875rem;
          color: var(--text-secondary);
          margin: 0 0 var(--spacing-sm);
        }

        .ct-desc {
          font-size: 0.875rem;
          color: var(--text-secondary);
          margin: 0 0 var(--spacing-sm);
          line-height: 1.5;
        }

        .ct-meta {
          display: flex;
          flex-wrap: wrap;
          gap: var(--spacing-sm);
          margin-bottom: var(--spacing-sm);
        }

        .ct-meta span {
          font-size: 0.8125rem;
          color: var(--text-muted);
          background: var(--bg-primary);
          padding: 4px 10px;
          border-radius: var(--radius-md);
        }

        .ct-links {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
        }

        .ct-discord {
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

        .ct-discord:hover {
          background: #4752c4;
        }

        .ct-tag {
          font-size: 0.8125rem;
          color: var(--text-muted);
          font-family: monospace;
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
          .section-header {
            flex-direction: column;
          }

          .tournament-meta {
            grid-template-columns: 1fr;
          }

          .details-stats {
            grid-template-columns: 1fr;
          }

          .tag-input-wrapper {
            flex-direction: column;
          }

          .tag-prefix {
            display: none;
          }

          .form-grid {
            grid-template-columns: 1fr;
          }

          .community-actions {
            width: 100%;
            justify-content: stretch;
          }

          .community-actions button {
            flex: 1;
          }
        }
      `}</style>
    </div>
  );
}

export default TournamentFinder;
