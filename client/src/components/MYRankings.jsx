import { useState, useEffect, memo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  getLocations, getClanRankings, getClanWarRankings, getPathOfLegendRankings, getPlayerRankings
} from '../services/api';

const MALAYSIAN_STATES = [
  'Johor', 'Kedah', 'Kelantan', 'Kuala Lumpur', 'Labuan', 'Melaka',
  'Negeri Sembilan', 'Pahang', 'Penang', 'Perak', 'Perlis', 'Putrajaya',
  'Sabah', 'Sarawak', 'Selangor', 'Terengganu'
];

function MYRankings() {
  const navigate = useNavigate();
  const [malaysiaId, setMalaysiaId] = useState(null);
  const [activeTab, setActiveTab] = useState('pol');
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // State rankings - in progress
  const [stateLoading] = useState(false);

  useEffect(() => {
    const findMalaysia = async () => {
      try {
        const data = await getLocations();
        const locations = data.items || [];
        
        const malaysia = locations.find(loc => 
          loc.name?.toLowerCase().includes('malaysia') || 
          loc.countryCode === 'MY'
        );
        
        if (malaysia) {
          setMalaysiaId(malaysia.id);
        }
      } catch (err) {
        console.error('Failed to fetch locations:', err);
        setError('Failed to load location data');
      } finally {
        setLoading(false);
      }
    };

    findMalaysia();
  }, []);

  useEffect(() => {
    if (!malaysiaId) return;

    const loadRankings = async () => {
      setLoading(true);
      setError('');

      try {
        let data;
        switch (activeTab) {
          case 'clans':
            data = await getClanRankings(malaysiaId);
            break;
          case 'clanwars':
            data = await getClanWarRankings(malaysiaId);
            break;
          case 'pol': {
            try {
              data = await getPathOfLegendRankings(malaysiaId);
            } catch (polErr) {
              // Fallback to regular player rankings if Path of Legend fails
              console.warn('Path of Legend failed, falling back to player rankings:', polErr.message);
              data = await getPlayerRankings(malaysiaId);
            }
            break;
          }
          default:
            data = { items: [] };
        }
        setRankings(data.items || []);
      } catch (err) {
        console.error('Failed to load rankings:', err);
        setError('Failed to load rankings data');
        setRankings([]);
      } finally {
        setLoading(false);
      }
    };

    loadRankings();
  }, [malaysiaId, activeTab]);

  const handlePlayerClick = (playerTag) => {
    navigate(`/player?tag=${encodeURIComponent(playerTag)}`);
  };

  const handleClanClick = (clanTag) => {
    navigate(`/clan?tag=${encodeURIComponent(clanTag)}`);
  };

  if (!loading && !malaysiaId && activeTab !== 'states') {
    return (
      <div className="my-rankings">
        <div className="rankings-header">
          <h2 className="section-title">🇲🇾 Malaysia Rankings</h2>
          <p className="section-desc">Competitive leaderboards for Malaysian players</p>
        </div>
        <div className="not-available">
          <div className="na-icon">🇲🇾</div>
          <h3>Malaysia Rankings Not Available</h3>
          <p>
            Supercell does not provide Malaysia-specific rankings in the API.
            <br />
            Try using <strong>Player Lookup</strong> to find Malaysian players!
          </p>
        </div>

        <style>{`
          .my-rankings {
            max-width: 900px;
            margin: 0 auto;
            padding: var(--spacing-xl) 0;
          }

          .rankings-header {
            text-align: center;
            margin-bottom: var(--spacing-lg);
          }

          .section-title {
            font-size: 2rem;
            font-weight: 800;
            background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            margin: 0 0 var(--spacing-sm);
          }

          .section-desc {
            color: var(--text-secondary);
            margin: 0;
          }

          .not-available {
            text-align: center;
            padding: var(--spacing-xl);
            background: var(--bg-secondary);
            border-radius: var(--radius-xl);
            border: 1px solid var(--bg-tertiary);
          }

          .na-icon {
            font-size: 4rem;
            margin-bottom: var(--spacing-md);
          }

          .not-available h3 {
            margin: 0 0 var(--spacing-sm);
            color: var(--text-primary);
          }

          .not-available p {
            color: var(--text-secondary);
            margin: 0;
            line-height: 1.6;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="my-rankings">
      <div className="rankings-header">
        <h2 className="section-title">🇲🇾 Malaysia Rankings</h2>
        <p className="section-desc">Top Malaysian clans and ranked players</p>
        <Link className="hof-link" to="/tournaments/hall-of-fame">
          🏆 Hall of Fame
        </Link>
      </div>

      <div className="rankings-tabs">
        <button 
          className={`tab ${activeTab === 'pol' ? 'active' : ''}`}
          onClick={() => setActiveTab('pol')}
        >
          🏆 Ranked Mode
        </button>
        <button 
          className={`tab ${activeTab === 'clans' ? 'active' : ''}`}
          onClick={() => setActiveTab('clans')}
        >
          🏰 Top Clans
        </button>
        <button 
          className={`tab ${activeTab === 'clanwars' ? 'active' : ''}`}
          onClick={() => setActiveTab('clanwars')}
        >
          ⚔️ Clan Wars
        </button>
        <button 
          className={`tab ${activeTab === 'states' ? 'active' : ''}`}
          onClick={() => setActiveTab('states')}
        >
          🗺️ By State
        </button>
      </div>

      <div className="info-box">
        {activeTab === 'pol' && (
          <p>🏆 <strong>Ranked Mode</strong> — Click any player to view their profile. Falls back to trophy rankings when Path of Legend is unavailable.</p>
        )}
        {activeTab === 'clans' && (
          <p>🏰 <strong>Top Clans</strong> — Click any clan to view details</p>
        )}
        {activeTab === 'clanwars' && (
          <p>⚔️ <strong>Clan Wars</strong> — Click any clan to view details</p>
        )}
        {activeTab === 'states' && (
          <p>🗺️ <strong>State Rankings</strong> — In progress. State leaderboards coming soon!</p>
        )}
      </div>

      {loading && (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading rankings...</p>
        </div>
      )}

      {error && (
        <div className="error-state">
          <p>{error}</p>
        </div>
      )}

      {!loading && !error && activeTab !== 'states' && (
        <div className="rankings-content">
          {rankings.length === 0 ? (
            <div className="empty-state">
              <p>No rankings data available for Malaysia</p>
              <p className="empty-hint">
                Rankings may reset when a new season starts, or Supercell may have deprecated this endpoint. Please check back again later!
              </p>
            </div>
          ) : (
            <div className="rankings-list">
              {activeTab === 'pol' && rankings.map((player, index) => (
                <div 
                  key={player.tag || index} 
                  className="ranking-item pol clickable"
                  onClick={() => handlePlayerClick(player.tag)}
                >
                  <span className={`rank-number ${index < 3 ? 'top' : ''}`}>
                    {index + 1}
                  </span>
                  <div className="rank-info">
                    <span className="rank-name">{player.name}</span>
                    <span className="rank-tag">#{player.tag}</span>
                  </div>
                  <span className="rank-league">🏆 {player.trophies?.toLocaleString() || 'N/A'}</span>
                  <span className="click-hint">→</span>
                </div>
              ))}

              {activeTab === 'clans' && rankings.map((clan, index) => (
                <div 
                  key={clan.tag || index} 
                  className="ranking-item clan clickable"
                  onClick={() => handleClanClick(clan.tag)}
                >
                  <span className={`rank-number ${index < 3 ? 'top' : ''}`}>
                    {index + 1}
                  </span>
                  <div className="rank-badge">
                    {clan.badgeUrls?.small ? (
                      <img src={clan.badgeUrls.small} alt="" />
                    ) : (
                      <span>🏰</span>
                    )}
                  </div>
                  <div className="rank-info">
                    <span className="rank-name">{clan.name}</span>
                    <span className="rank-tag">#{clan.tag}</span>
                  </div>
                  <span className="rank-score">🏆 {clan.clanScore?.toLocaleString()}</span>
                  <span className="click-hint">→</span>
                </div>
              ))}

              {activeTab === 'clanwars' && rankings.map((clan, index) => (
                <div 
                  key={clan.tag || index} 
                  className="ranking-item clanwar clickable"
                  onClick={() => handleClanClick(clan.tag)}
                >
                  <span className={`rank-number ${index < 3 ? 'top' : ''}`}>
                    {index + 1}
                  </span>
                  <div className="rank-badge">
                    {clan.badgeUrls?.small ? (
                      <img src={clan.badgeUrls.small} alt="" />
                    ) : (
                      <span>🏰</span>
                    )}
                  </div>
                  <div className="rank-info">
                    <span className="rank-name">{clan.name}</span>
                    <span className="rank-tag">#{clan.tag}</span>
                  </div>
                  <span className="rank-score">⚔️ {clan.clanWarTrophies?.toLocaleString()}</span>
                  <span className="click-hint">→</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'states' && (
        <div className="rankings-content">
          <div className="in-progress-state">
            <div className="in-progress-icon">🚧</div>
            <h3>In Progress</h3>
            <p>State leaderboards are currently being developed.</p>
            <p className="empty-hint">Check back soon for updates!</p>
          </div>
        </div>
      )}

      <style>{`
        .my-rankings {
          max-width: 900px;
          margin: 0 auto;
          padding: var(--spacing-xl) 0;
        }

        .rankings-header {
          text-align: center;
          margin-bottom: var(--spacing-lg);
        }

        .section-title {
          font-size: 2rem;
          font-weight: 800;
          background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin: 0 0 var(--spacing-sm);
        }

        .section-desc {
          color: var(--text-secondary);
          margin: 0;
        }

        .hof-link {
          display: inline-flex;
          align-items: center;
          gap: var(--spacing-sm);
          margin-top: var(--spacing-md);
          padding: var(--spacing-sm) var(--spacing-md);
          background: linear-gradient(135deg, #f59e0b 0%, #ef4444 100%);
          color: white;
          font-size: 0.875rem;
          font-weight: 700;
          border-radius: var(--radius-lg);
          text-decoration: none;
          transition: all 0.2s ease;
        }

        .hof-link:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
        }

        .rankings-tabs {
          display: flex;
          gap: var(--spacing-xs);
          margin-bottom: var(--spacing-md);
          overflow-x: auto;
          padding-bottom: var(--spacing-xs);
        }

        .tab {
          flex-shrink: 0;
          padding: var(--spacing-sm) var(--spacing-md);
          background: var(--bg-secondary);
          border: 1px solid var(--bg-tertiary);
          border-radius: var(--radius-full);
          color: var(--text-secondary);
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .tab:hover {
          background: var(--bg-hover);
          color: var(--text-primary);
        }

        .tab.active {
          background: var(--accent-primary);
          border-color: var(--accent-primary);
          color: white;
        }

        .info-box {
          background: linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(239, 68, 68, 0.05));
          border: 1px solid rgba(245, 158, 11, 0.3);
          border-radius: var(--radius-lg);
          padding: var(--spacing-md);
          margin-bottom: var(--spacing-lg);
        }

        .info-box p {
          margin: 0;
          font-size: 0.875rem;
          color: var(--text-secondary);
        }

        .loading-state,
        .error-state {
          text-align: center;
          padding: var(--spacing-xl);
        }

        .spinner {
          width: 40px;
          height: 40px;
          border: 3px solid var(--bg-tertiary);
          border-top-color: var(--accent-primary);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin: 0 auto var(--spacing-md);
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .error-state {
          color: var(--accent-danger);
        }

        .rankings-content {
          background: var(--bg-secondary);
          border-radius: var(--radius-xl);
          border: 1px solid var(--bg-tertiary);
          overflow: hidden;
        }

        .rankings-list {
          display: flex;
          flex-direction: column;
        }

        .ranking-item {
          display: flex;
          align-items: center;
          gap: var(--spacing-md);
          padding: var(--spacing-md) var(--spacing-lg);
          border-bottom: 1px solid var(--bg-tertiary);
          transition: background 0.2s;
        }

        .ranking-item:hover {
          background: var(--bg-hover);
        }

        .ranking-item:last-child {
          border-bottom: none;
        }

        .ranking-item.clickable {
          cursor: pointer;
        }

        .ranking-item.clickable:hover {
          background: rgba(59, 130, 246, 0.1);
        }

        .rank-number {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-tertiary);
          border-radius: var(--radius-md);
          font-weight: 800;
          font-size: 0.875rem;
          color: var(--text-muted);
          flex-shrink: 0;
        }

        .rank-number.top {
          background: linear-gradient(135deg, #f59e0b 0%, #ef4444 100%);
          color: white;
        }

        .rank-badge {
          width: 40px;
          height: 40px;
          border-radius: var(--radius-md);
          background: var(--bg-primary);
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          flex-shrink: 0;
        }

        .rank-badge img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .rank-info {
          flex: 1;
          min-width: 0;
        }

        .rank-name {
          display: block;
          font-weight: 700;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .rank-tag {
          font-size: 0.75rem;
          color: var(--text-muted);
          font-family: monospace;
        }

        .rank-score {
          font-weight: 700;
          color: #f59e0b;
          white-space: nowrap;
          flex-shrink: 0;
        }

        .rank-league {
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--accent-primary);
          background: rgba(59, 130, 246, 0.1);
          padding: 4px 12px;
          border-radius: var(--radius-full);
          flex-shrink: 0;
        }

        .click-hint {
          color: var(--text-muted);
          opacity: 0;
          transition: opacity 0.2s;
        }

        .ranking-item.clickable:hover .click-hint {
          opacity: 1;
        }

        .empty-state {
          text-align: center;
          padding: var(--spacing-xl);
          color: var(--text-muted);
        }

        .empty-hint {
          font-size: 0.875rem;
          margin-top: var(--spacing-sm);
        }

        /* State Rankings */
        .state-filter-bar {
          display: flex;
          gap: var(--spacing-md);
          padding: var(--spacing-md) var(--spacing-lg);
          border-bottom: 1px solid var(--bg-tertiary);
          align-items: center;
          flex-wrap: wrap;
        }

        .state-select {
          flex: 1;
          min-width: 150px;
          padding: 8px 12px;
          border-radius: var(--radius-md);
          border: 1px solid var(--bg-tertiary);
          background: var(--bg-primary);
          color: var(--text-primary);
          font-size: 0.875rem;
        }

        .submit-state-btn {
          padding: 8px 16px;
          background: var(--accent-primary);
          color: white;
          border: none;
          border-radius: var(--radius-md);
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: opacity 0.2s;
        }

        .submit-state-btn:hover {
          opacity: 0.9;
        }

        .state-submit-form {
          padding: var(--spacing-lg);
          border-bottom: 1px solid var(--bg-tertiary);
          background: var(--bg-primary);
        }

        .state-submit-form h4 {
          margin: 0 0 var(--spacing-md);
          color: var(--text-primary);
        }

        .state-submit-form .form-row {
          display: flex;
          gap: var(--spacing-md);
          margin-bottom: var(--spacing-md);
          flex-wrap: wrap;
        }

        .state-submit-form input,
        .state-submit-form select {
          flex: 1;
          min-width: 150px;
          padding: 8px 12px;
          border-radius: var(--radius-md);
          border: 1px solid var(--bg-tertiary);
          background: var(--bg-secondary);
          color: var(--text-primary);
          font-size: 0.875rem;
        }

        .state-submit-form button {
          padding: 8px 20px;
          background: var(--accent-success);
          color: white;
          border: none;
          border-radius: var(--radius-md);
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          margin-top: var(--spacing-sm);
        }

        .state-submit-form button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .submit-message {
          margin-top: var(--spacing-sm);
          font-size: 0.875rem;
          color: var(--text-secondary);
        }

        .state-rankings {
          display: flex;
          flex-direction: column;
        }

        .state-group {
          border-bottom: 1px solid var(--bg-tertiary);
        }

        .state-group:last-child {
          border-bottom: none;
        }

        .state-group-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: var(--spacing-md) var(--spacing-lg);
          background: var(--bg-primary);
        }

        .state-group-header h4 {
          margin: 0;
          color: var(--text-primary);
          font-size: 1rem;
        }

        .state-count {
          font-size: 0.75rem;
          color: var(--text-muted);
          background: var(--bg-tertiary);
          padding: 2px 10px;
          border-radius: var(--radius-full);
        }

        .state-players-list {
          display: flex;
          flex-direction: column;
        }

        .in-progress-state {
          text-align: center;
          padding: var(--spacing-xl);
          color: var(--text-muted);
        }

        .in-progress-icon {
          font-size: 3rem;
          margin-bottom: var(--spacing-md);
        }

        .in-progress-state h3 {
          margin: 0 0 var(--spacing-sm);
          color: var(--text-primary);
        }

        @media (max-width: 640px) {
          .rankings-tabs {
            justify-content: flex-start;
          }

          .ranking-item {
            gap: var(--spacing-sm);
            padding: var(--spacing-sm) var(--spacing-md);
          }

          .rank-number {
            width: 32px;
            height: 32px;
            font-size: 0.75rem;
          }

          .rank-badge {
            width: 32px;
            height: 32px;
          }

          .rank-score {
            font-size: 0.875rem;
          }

          .rank-league {
            font-size: 0.625rem;
            padding: 2px 8px;
          }

          .click-hint {
            display: none;
          }

          .state-filter-bar {
            flex-direction: column;
            align-items: stretch;
          }

          .state-submit-form .form-row {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
}

export default memo(MYRankings);
