import { useState, useEffect } from 'react';
import { searchTournaments, getTournament, getGlobalTournaments } from '../services/api';

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
  }, []);

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

          {/* Community Section - Coming Soon */}
          <section className="community-section">
            <h3>👥 Community Tournaments</h3>
            <p className="section-subtitle">Discover player-created tournaments</p>
            
            <div className="coming-soon-grid">
              <ComingSoonCard 
                icon="🔍"
                title="Tournament Search"
                description="Search for player-created tournaments by name or keyword"
              />
              <ComingSoonCard 
                icon="🇲🇾"
                title="Malaysian Tournaments"
                description="Discover tournaments hosted by Malaysian players"
              />
              <ComingSoonCard 
                icon="✨"
                title="Tournament Discovery"
                description="Browse trending and recommended tournaments"
              />
            </div>
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

          {/* Malaysian Tournament Card */}
          <section className="malaysia-section">
            <div className="malaysia-card">
              <div className="mc-icon">🇲🇾</div>
              <div className="mc-content">
                <h4>Malaysian Tournaments</h4>
                <p>Discover tournaments hosted by Malaysian players</p>
              </div>
              <span className="mc-badge">Coming Soon</span>
            </div>
          </section>

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

          .coming-soon-grid {
            grid-template-columns: 1fr;
          }

          .tag-input-wrapper {
            flex-direction: column;
          }

          .tag-prefix {
            display: none;
          }

          .malaysia-card {
            flex-direction: column;
            text-align: center;
          }
        }
      `}</style>
    </div>
  );
}

export default TournamentFinder;
