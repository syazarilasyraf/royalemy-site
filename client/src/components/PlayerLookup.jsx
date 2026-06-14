import { useState, useEffect, useMemo, memo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { getPlayer, getPlayerBattleLog } from '../services/api';
import { getCardById } from '../utils/cardMapping';
import { buildDeckLink } from '../utils/deckParser';
import SkeletonLoader from './SkeletonLoader';

const SAMPLE_TAGS = ['L88RC989', '2P0JJQ0Y', '8L9L9GL', '9CQ2U8QJ'];

function PlayerLookup() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [playerTag, setPlayerTag] = useState('');
  const [playerData, setPlayerData] = useState(null);
  const [battleLog, setBattleLog] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Handle tag from URL query params (e.g., from Rankings page)
  useEffect(() => {
    const tagFromUrl = searchParams.get('tag');
    if (tagFromUrl) {
      setPlayerTag(tagFromUrl);
      fetchPlayerData(tagFromUrl);
    }
  }, [searchParams]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!playerTag.trim()) return;
    await fetchPlayerData(playerTag);
  };

  const fetchPlayerData = async (tag) => {
    setLoading(true);
    setError('');
    setPlayerData(null);
    
    try {
      const data = await getPlayer(tag);
      setPlayerData(data);
      
      // Fetch battle log
      fetchBattleLog(tag);
    } catch (err) {
      setError(err.message || 'Player not found. Check the tag and try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchBattleLog = async (tag) => {
    try {
      const data = await getPlayerBattleLog(tag);
      setBattleLog(data || []);
    } catch (err) {
      setBattleLog([]);
    }
  };

  const handleSampleClick = (tag) => {
    setPlayerTag(tag);
    fetchPlayerData(tag);
  };

  const getArenaName = (arena) => {
    if (!arena) return 'Unknown Arena';
    return arena.name?.replace('Arena ', '') || `Arena ${arena.id}`;
  };

  const formatNumber = (num) => {
    if (!num && num !== 0) return '-';
    return num.toLocaleString();
  };

  const recentBattles = useMemo(() => battleLog.slice(0, 10).map((battle, index) => {
    const isWin = battle.team[0]?.crowns > battle.opponent[0]?.crowns;
    const opponent = battle.opponent[0];
    const opponentDeck = opponent?.cards || [];
    const opponentDeckIds = opponentDeck.map(c => c.id);
    const opponentDeckLink = opponentDeckIds.length === 8 ? buildDeckLink(opponentDeckIds) : null;

    return (
      <div key={index} className={`battle-item ${isWin ? 'win' : 'loss'}`}>
        <div className="battle-header">
          <div className="battle-main">
            <div className="battle-result">
              {isWin ? '✅ Victory' : '❌ Defeat'}
            </div>
            <div className="battle-crowns">
              {battle.team[0]?.crowns} - {opponent?.crowns}
            </div>
            <div className="battle-mode">{battle.gameMode?.name || 'Unknown Mode'}</div>
          </div>
          
          {opponent && (
            <div className="battle-opponent-wrapper">
              <div 
                className="battle-opponent" 
                onClick={() => navigate(`/player?tag=${opponent.tag}`)}
              >
                <span className="opponent-label">vs</span>
                <span className="opponent-name">{opponent.name}</span>
                <span className="opponent-tag-inline">#{opponent.tag}</span>
              </div>
              <button 
                className="copy-tag-btn"
                onClick={() => navigator.clipboard.writeText(opponent.tag)}
                title="Copy tag"
              >
                📋
              </button>
            </div>
          )}
        </div>
        
        {/* Opponent Deck */}
        {opponentDeck.length > 0 && (
          <div className="battle-deck">
            <span className="deck-label">Opponent's Deck:</span>
            <div className="battle-deck-grid">
              {opponentDeck.map((card, cardIndex) => (
                <div key={cardIndex} className="battle-deck-card">
                  <img 
                    src={card.iconUrls?.medium || `/cards/${card.id}.webp`}
                    alt={card.name}
                    onError={(e) => { e.target.src = '/cards/placeholder.webp'; }}
                  />
                </div>
              ))}
            </div>
            {opponentDeckLink && (
              <button 
                className="open-deck-cr-btn"
                onClick={() => window.open(opponentDeckLink, '_blank')}
              >
                <span>🎮</span>
                <span>Open in CR</span>
              </button>
            )}
          </div>
        )}
      </div>
    );
  }), [battleLog]);

  return (
    <div className="player-lookup">
      {/* Search Section */}
      <div className="lookup-header">
        <h2 className="section-title">Player Lookup</h2>
        <p className="section-desc">Search for any Clash Royale player by tag</p>
        
        <form onSubmit={handleSearch} className="search-form">
          <div className="input-group">
            <span className="input-prefix">#</span>
            <input
              type="text"
              value={playerTag}
              onChange={(e) => setPlayerTag(e.target.value.replace('#', '').toUpperCase())}
              placeholder="Player Tag (e.g., 2P0JJQ0Y)"
              className="input tag-input"
            />
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>
          {error && (
            <div className="error-box">
              <span className="error-icon">⚠️</span>
              <span>{error}</span>
            </div>
          )}
        </form>

        {/* Sample Tags */}
        <div className="sample-tags">
          <span className="sample-label">Try:</span>
          {SAMPLE_TAGS.map((tag) => (
            <button
              key={tag}
              onClick={() => handleSampleClick(tag)}
              className="sample-tag"
              disabled={loading}
            >
              #{tag}
            </button>
          ))}
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div className="loading-container">
          <SkeletonLoader type="player" />
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && !playerData && (
        <div className="empty-state">
          <div className="empty-icon">👤</div>
          <h3>Search for a Player</h3>
          <p>Enter a player tag above or click one of the sample tags to see player profiles and battle logs.</p>
        </div>
      )}

      {/* Player Data */}
      {playerData && !loading && (
        <div className="player-data animate-fadeIn">
          {/* Profile Card */}
          <div className="profile-card">
            <div className="profile-header">
              <div className="profile-avatar">
                <span>👑</span>
              </div>
              <div className="profile-info">
                <h3 className="player-name">{playerData.name || 'Unknown'}</h3>
                <span className="player-tag">#{playerData.tag}</span>
                {playerData.clan && (
                  <span className="player-clan">🏰 {playerData.clan.name}</span>
                )}
              </div>
            </div>

            <div className="profile-stats">
              <div className="stat-box">
                <span className="stat-value">{formatNumber(playerData.trophies)}</span>
                <span className="stat-label">🏆 Trophies</span>
              </div>
              <div className="stat-box">
                <span className="stat-value">{formatNumber(playerData.bestTrophies)}</span>
                <span className="stat-label">⭐ Best</span>
              </div>
              <div className="stat-box">
                <span className="stat-value">{playerData.expLevel || '-'}</span>
                <span className="stat-label">📊 King Level</span>
              </div>
              <div className="stat-box">
                <span className="stat-value">{getArenaName(playerData.arena)}</span>
                <span className="stat-label">⚔️ Arena</span>
              </div>
            </div>

            {/* Current Deck */}
            {playerData.currentDeck && playerData.currentDeck.length > 0 && (
              <div className="current-deck">
                <div className="deck-header">
                  <h4>Current Deck</h4>
                  <button 
                    className="open-deck-btn"
                    onClick={() => {
                      const cardIds = playerData.currentDeck.map(c => c.id);
                      const deckLink = buildDeckLink(cardIds);
                      window.open(deckLink, '_blank');
                    }}
                  >
                    <span>🎮</span>
                    <span>Open in CR</span>
                  </button>
                </div>
                <div className="deck-grid-small">
                  {playerData.currentDeck.map((card, index) => {
                    const cardId = card.id;
                    return (
                      <div key={index} className="deck-card-small">
                        <img 
                          src={card.iconUrls?.medium || `/cards/${cardId}.webp`}
                          alt={card.name}
                          onError={(e) => { e.target.src = '/cards/placeholder.webp'; }}
                        />
                        <span className="card-level">Lvl {card.level}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="tabs">
            <button 
              className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              Overview
            </button>
            <button 
              className={`tab ${activeTab === 'battles' ? 'active' : ''}`}
              onClick={() => setActiveTab('battles')}
            >
              Recent Battles ({battleLog.length})
            </button>
          </div>

          {/* Tab Content */}
          <div className="tab-content">
            {activeTab === 'overview' && (
              <div className="overview-tab">
                <div className="stats-grid">
                  <div className="stat-row">
                    <span className="stat-label">Wins</span>
                    <span className="stat-value wins">{formatNumber(playerData.wins)}</span>
                  </div>
                  <div className="stat-row">
                    <span className="stat-label">Losses</span>
                    <span className="stat-value losses">{formatNumber(playerData.losses)}</span>
                  </div>
                  <div className="stat-row">
                    <span className="stat-label">Three Crown Wins</span>
                    <span className="stat-value">{formatNumber(playerData.threeCrownWins)}</span>
                  </div>
                  <div className="stat-row">
                    <span className="stat-label">Total Donations</span>
                    <span className="stat-value">{formatNumber(playerData.totalDonations)}</span>
                  </div>
                  <div className="stat-row">
                    <span className="stat-label">Cards Found</span>
                    <span className="stat-value">{playerData.cards?.length || '-'}</span>
                  </div>
                  <div className="stat-row">
                    <span className="stat-label">Star Points</span>
                    <span className="stat-value">{formatNumber(playerData.starPoints)}</span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'battles' && (
              <div className="battles-tab">
                {battleLog.length === 0 ? (
                  <div className="empty-tab">
                    <span className="empty-icon">⚔️</span>
                    <p>No recent battles found</p>
                  </div>
                ) : (
                  <div className="battle-list">
                    {recentBattles}
                  </div>
                )}
              </div>
            )}


          </div>
        </div>
      )}

      <style>{`
        .player-lookup {
          max-width: 900px;
          margin: 0 auto;
        }

        .lookup-header {
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
          margin: 0 auto var(--spacing-md);
        }

        .input-group {
          display: flex;
          align-items: center;
          background: var(--bg-secondary);
          border-radius: var(--radius-md);
          border: 2px solid var(--bg-tertiary);
          padding: 0 var(--spacing-sm);
          transition: border-color var(--transition-fast);
        }

        .input-group:focus-within {
          border-color: var(--accent-primary);
        }

        .input-prefix {
          color: var(--text-muted);
          font-weight: 700;
          padding-right: var(--spacing-xs);
        }

        .tag-input {
          flex: 1;
          background: transparent;
          border: none;
          padding: var(--spacing-sm) 0;
          font-size: 1rem;
          letter-spacing: 0.05em;
        }

        .tag-input:focus {
          outline: none;
          box-shadow: none;
        }

        .error-box {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
          margin-top: var(--spacing-md);
          padding: var(--spacing-md);
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: var(--radius-md);
          color: #fca5a5;
          font-size: 0.875rem;
        }

        .sample-tags {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--spacing-sm);
          flex-wrap: wrap;
        }

        .sample-label {
          font-size: 0.875rem;
          color: var(--text-muted);
        }

        .sample-tag {
          padding: var(--spacing-xs) var(--spacing-sm);
          background: var(--bg-secondary);
          border: 1px solid var(--bg-tertiary);
          border-radius: var(--radius-md);
          color: var(--accent-primary);
          font-size: 0.875rem;
          font-family: monospace;
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .sample-tag:hover:not(:disabled) {
          background: var(--accent-primary);
          border-color: var(--accent-primary);
          color: white;
        }

        .sample-tag:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* Loading & Empty States */
        .loading-container {
          margin: var(--spacing-xl) 0;
        }

        .empty-state {
          text-align: center;
          padding: var(--spacing-xl);
          background: var(--bg-secondary);
          border-radius: var(--radius-xl);
          border: 1px dashed var(--bg-tertiary);
        }

        .empty-state .empty-icon {
          font-size: 4rem;
          margin-bottom: var(--spacing-md);
          opacity: 0.5;
        }

        .empty-state h3 {
          font-size: 1.25rem;
          color: var(--text-primary);
          margin-bottom: var(--spacing-sm);
        }

        .empty-state p {
          color: var(--text-secondary);
          max-width: 400px;
          margin: 0 auto;
          line-height: 1.6;
        }

        .empty-tab {
          text-align: center;
          padding: var(--spacing-xl);
          color: var(--text-muted);
        }

        .empty-tab .empty-icon {
          font-size: 3rem;
          margin-bottom: var(--spacing-md);
          opacity: 0.5;
        }

        /* Player Data */
        .player-data {
          padding: var(--spacing-lg) 0;
        }

        .profile-card {
          background: var(--bg-secondary);
          border-radius: var(--radius-xl);
          padding: var(--spacing-lg);
          border: 1px solid var(--bg-tertiary);
          margin-bottom: var(--spacing-lg);
        }

        .profile-header {
          display: flex;
          align-items: center;
          gap: var(--spacing-md);
          margin-bottom: var(--spacing-lg);
          padding-bottom: var(--spacing-lg);
          border-bottom: 1px solid var(--bg-tertiary);
        }

        .profile-avatar {
          width: 64px;
          height: 64px;
          border-radius: var(--radius-lg);
          background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2rem;
        }

        .profile-info {
          flex: 1;
        }

        .player-name {
          font-size: 1.5rem;
          font-weight: 800;
          margin: 0 0 var(--spacing-xs);
          color: var(--text-primary);
        }

        .player-tag {
          display: block;
          font-size: 0.875rem;
          color: var(--text-muted);
          font-family: monospace;
          margin-bottom: var(--spacing-xs);
        }

        .player-clan {
          font-size: 0.875rem;
          color: var(--accent-primary);
        }

        .profile-stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: var(--spacing-md);
          margin-bottom: var(--spacing-lg);
        }

        .stat-box {
          text-align: center;
          padding: var(--spacing-md);
          background: var(--bg-primary);
          border-radius: var(--radius-md);
        }

        .stat-box .stat-value {
          font-size: 1.5rem;
          font-weight: 800;
          color: var(--text-primary);
          display: block;
        }

        .stat-box .stat-label {
          font-size: 0.6875rem;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        /* Current Deck */
        .current-deck {
          padding-top: var(--spacing-lg);
          border-top: 1px solid var(--bg-tertiary);
        }

        .deck-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--spacing-md);
        }

        .current-deck h4 {
          margin: 0;
          font-size: 1rem;
          color: var(--text-primary);
        }

        .open-deck-btn {
          display: flex;
          align-items: center;
          gap: var(--spacing-xs);
          padding: var(--spacing-xs) var(--spacing-sm);
          background: var(--accent-primary);
          color: white;
          border: none;
          border-radius: var(--radius-md);
          font-size: 0.75rem;
          font-weight: 600;
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .open-deck-btn:hover {
          background: var(--accent-secondary);
          transform: translateY(-1px);
        }

        .open-deck-btn span:first-child {
          font-size: 0.875rem;
        }

        .deck-grid-small {
          display: grid;
          grid-template-columns: repeat(8, 1fr);
          gap: var(--spacing-xs);
        }

        .deck-card-small {
          position: relative;
          aspect-ratio: 1;
          border-radius: var(--radius-sm);
          overflow: hidden;
          background: var(--bg-tertiary);
        }

        .deck-card-small img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .deck-card-small .card-level {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          background: rgba(0, 0, 0, 0.8);
          color: white;
          font-size: 0.625rem;
          text-align: center;
          padding: 2px;
        }

        /* Tabs */
        .tabs {
          display: flex;
          gap: var(--spacing-xs);
          margin-bottom: var(--spacing-md);
          border-bottom: 2px solid var(--bg-tertiary);
          padding-bottom: var(--spacing-xs);
          overflow-x: auto;
        }

        .tab {
          flex-shrink: 0;
          padding: var(--spacing-sm) var(--spacing-md);
          background: transparent;
          border: none;
          color: var(--text-secondary);
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          border-radius: var(--radius-md);
          transition: all var(--transition-fast);
        }

        .tab:hover {
          background: var(--bg-hover);
          color: var(--text-primary);
        }

        .tab.active {
          background: var(--accent-primary);
          color: white;
        }

        /* Tab Content */
        .tab-content {
          background: var(--bg-secondary);
          border-radius: var(--radius-xl);
          padding: var(--spacing-lg);
          border: 1px solid var(--bg-tertiary);
        }

        .stats-grid {
          display: grid;
          gap: var(--spacing-sm);
        }

        .stat-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: var(--spacing-sm) 0;
          border-bottom: 1px solid var(--bg-tertiary);
        }

        .stat-row:last-child {
          border-bottom: none;
        }

        .stat-row .stat-label {
          color: var(--text-secondary);
        }

        .stat-row .stat-value {
          font-weight: 700;
          color: var(--text-primary);
        }

        .stat-row .stat-value.wins {
          color: #22c55e;
        }

        .stat-row .stat-value.losses {
          color: #ef4444;
        }

        /* Battles */
        .battle-list {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-sm);
        }

        .battle-item {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-sm);
          padding: var(--spacing-md);
          background: var(--bg-primary);
          border-radius: var(--radius-md);
          border-left: 4px solid;
        }

        .battle-item.win {
          border-left-color: #22c55e;
        }

        .battle-item.loss {
          border-left-color: #ef4444;
        }

        .battle-header {
          display: flex;
          align-items: center;
          gap: var(--spacing-md);
          flex-wrap: wrap;
        }

        .battle-main {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 2px;
        }

        .battle-result {
          font-weight: 700;
          font-size: 0.875rem;
        }

        .battle-crowns {
          font-weight: 800;
          font-size: 1.125rem;
        }

        .battle-opponent-wrapper {
          display: flex;
          align-items: center;
          gap: var(--spacing-xs);
          margin-left: auto;
        }

        .battle-opponent {
          display: flex;
          align-items: center;
          gap: var(--spacing-xs);
          padding: 4px 10px;
          background: var(--bg-secondary);
          border-radius: var(--radius-full);
          cursor: pointer;
          transition: all 0.2s;
        }

        .battle-opponent:hover {
          background: var(--accent-primary);
        }

        .battle-opponent:hover .opponent-name,
        .battle-opponent:hover .opponent-tag-inline {
          color: white;
        }

        .opponent-label {
          font-size: 0.75rem;
          color: var(--text-muted);
          text-transform: lowercase;
        }

        .opponent-name {
          font-weight: 600;
          font-size: 0.875rem;
          color: var(--text-primary);
          max-width: 100px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .opponent-tag-inline {
          font-size: 0.7rem;
          color: var(--text-muted);
          font-family: monospace;
          background: var(--bg-tertiary);
          padding: 1px 6px;
          border-radius: var(--radius-sm);
        }

        .copy-tag-btn {
          background: transparent;
          border: none;
          font-size: 0.875rem;
          cursor: pointer;
          padding: 4px;
          opacity: 0.6;
          transition: opacity 0.2s;
          flex-shrink: 0;
        }

        .copy-tag-btn:hover {
          opacity: 1;
        }

        .battle-mode {
          font-size: 0.75rem;
          color: var(--text-muted);
        }

        /* Battle Deck */
        .battle-deck {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-xs);
          padding-top: var(--spacing-sm);
          border-top: 1px solid var(--bg-tertiary);
        }

        .deck-label {
          font-size: 0.7rem;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 2px;
        }

        .open-deck-cr-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 8px 16px;
          background: linear-gradient(135deg, #22c55e, #16a34a);
          color: white;
          border: none;
          border-radius: var(--radius-md);
          font-size: 0.8rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
          margin-top: var(--spacing-xs);
          width: 100%;
        }

        .open-deck-cr-btn:hover {
          filter: brightness(1.1);
          transform: translateY(-1px);
        }

        .open-deck-cr-btn span:first-child {
          font-size: 0.9rem;
        }

        .battle-deck-grid {
          display: grid;
          grid-template-columns: repeat(8, 1fr);
          gap: 4px;
        }

        .battle-deck-card {
          aspect-ratio: 1;
          background: var(--bg-secondary);
          border-radius: var(--radius-sm);
          overflow: hidden;
        }

        .battle-deck-card img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        @media (max-width: 640px) {
          .profile-stats {
            grid-template-columns: repeat(2, 1fr);
          }

          .deck-grid-small {
            grid-template-columns: repeat(4, 1fr);
          }

          .battle-header {
            flex-wrap: wrap;
            gap: var(--spacing-xs);
          }

          .battle-main {
            width: auto;
          }

          .battle-opponent {
            margin-left: auto;
            max-width: 150px;
          }

          .opponent-name {
            max-width: 80px;
          }

          .battle-deck-grid {
            grid-template-columns: repeat(4, 1fr);
            gap: 3px;
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.3s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

export default memo(PlayerLookup);
