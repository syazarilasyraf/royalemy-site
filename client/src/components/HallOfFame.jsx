import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getHallOfFame, getPlayer } from '../services/api';

async function fetchPlayerNames(stats, onNameFound) {
  const tags = [...new Set(stats.map((s) => s.player_tag).filter(Boolean))];
  const concurrency = 5;

  async function fetchOne(tag) {
    try {
      const data = await getPlayer(tag);
      if (data?.name) {
        onNameFound(tag, data.name);
      }
    } catch (err) {
      // Ignore individual failures; fall back to stored name/tag.
    }
  }

  for (let i = 0; i < tags.length; i += concurrency) {
    const batch = tags.slice(i, i + concurrency);
    await Promise.all(batch.map(fetchOne));
  }
}

export default function HallOfFame() {
  const navigate = useNavigate();
  const [stats, setStats] = useState([]);
  const [playerNames, setPlayerNames] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    try {
      const data = await getHallOfFame(50);
      const loadedStats = data.stats || [];
      setStats(loadedStats);
      fetchPlayerNames(loadedStats, (tag, name) => {
        setPlayerNames((prev) => ({ ...prev, [tag]: name }));
      });
    } catch (err) {
      console.error('Failed to load hall of fame:', err);
    } finally {
      setLoading(false);
    }
  };

  const getDisplayName = (stat) => {
    return playerNames[stat.player_tag] || stat.player_name || stat.player_tag;
  };

  return (
    <div className="page-container hall-of-fame-page">
      <button className="back-btn" onClick={() => navigate('/rankings')}>
        ← Back to Rankings
      </button>

      <div className="rankings-header">
        <h2 className="section-title">🏆 Hall of Fame</h2>
        <p className="section-desc">Top tournament performers</p>
      </div>

      <div className="info-box">
        <p>
          🏆 <strong>Hall of Fame</strong> — This list features the top-performing players from past RoyaleMY community tournaments.
        </p>
      </div>

      {loading ? (
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading rankings...</p>
        </div>
      ) : stats.length > 0 ? (
        <div className="rankings-content">
          <div className="hof-header-row">
            <span className="hof-header-rank">Rank</span>
            <span className="hof-header-player">Player</span>
            <span className="hof-header-stat">Wins</span>
            <span className="hof-header-stat">Top 3</span>
            <span className="hof-header-stat">Joined</span>
          </div>
          <div className="hof-list">
            {stats.map((s, idx) => {
              const rank = idx + 1;
              const rankClass =
                rank === 1 ? 'hof-rank-1' : rank === 2 ? 'hof-rank-2' : rank === 3 ? 'hof-rank-3' : 'hof-rank-other';
              const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null;
              const displayName = getDisplayName(s);
              const showTag = displayName !== s.player_tag;

              return (
                <div key={s.id} className={`hof-card ${rank <= 3 ? 'hof-card-top' : ''}`}>
                  <div className={`hof-rank-badge ${rankClass}`}>{medal || rank}</div>
                  <div className="hof-player-info">
                    <span className="hof-player-name">{displayName}</span>
                    {showTag && <span className="hof-player-tag">#{s.player_tag}</span>}
                  </div>
                  <div className="hof-stat hof-stat-wins">
                    <span className="hof-stat-value">{s.tournament_wins}</span>
                    <span className="hof-stat-label">Wins</span>
                  </div>
                  <div className="hof-stat hof-stat-top3">
                    <span className="hof-stat-value">{s.top_3_finishes}</span>
                    <span className="hof-stat-label">Top 3</span>
                  </div>
                  <div className="hof-stat hof-stat-part">
                    <span className="hof-stat-value">{s.total_participations}</span>
                    <span className="hof-stat-label">Joined</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="empty-state-box">
          <div className="empty-icon">🏆</div>
          <h4>No rankings yet</h4>
          <p className="empty-helper">Complete tournaments to build the Hall of Fame!</p>
        </div>
      )}

      <style>{`
        .hall-of-fame-page {
          animation: fadeIn 0.3s ease;
          max-width: 900px;
          margin: 0 auto;
          padding: var(--spacing-lg);
        }

        .back-btn {
          display: inline-flex;
          align-items: center;
          gap: var(--spacing-sm);
          padding: var(--spacing-sm) var(--spacing-md);
          background: var(--bg-secondary);
          border: 1px solid var(--bg-tertiary);
          border-radius: var(--radius-lg);
          color: var(--text-secondary);
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          margin-bottom: var(--spacing-md);
        }

        .back-btn:hover {
          background: var(--bg-hover);
          color: var(--text-primary);
          border-color: var(--accent-primary);
        }

        .rankings-header {
          text-align: center;
          margin-bottom: var(--spacing-lg);
        }

        .section-title {
          font-size: 2rem;
          font-weight: 800;
          background: linear-gradient(135deg, #f59e0b 0%, #ef4444 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin: 0 0 var(--spacing-sm);
        }

        .section-desc {
          color: var(--text-secondary);
          margin: 0;
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

        .loading-spinner {
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

        .rankings-content {
          background: var(--bg-secondary);
          border-radius: var(--radius-xl);
          border: 1px solid var(--bg-tertiary);
          overflow: hidden;
        }

        .hof-header-row {
          display: grid;
          grid-template-columns: 56px 1fr 56px 56px 56px;
          align-items: center;
          gap: var(--spacing-md);
          padding: 12px var(--spacing-lg);
          font-size: 0.6875rem;
          color: var(--text-muted);
          text-transform: uppercase;
          font-weight: 700;
          letter-spacing: 0.05em;
          border-bottom: 1px solid var(--bg-tertiary);
        }

        .hof-header-rank { text-align: center; }
        .hof-header-player { padding-left: 4px; }
        .hof-header-stat { text-align: center; }

        .hof-list {
          display: flex;
          flex-direction: column;
        }

        .hof-card {
          display: grid;
          grid-template-columns: 56px 1fr 56px 56px 56px;
          align-items: center;
          gap: var(--spacing-md);
          padding: var(--spacing-md) var(--spacing-lg);
          border-bottom: 1px solid var(--bg-tertiary);
          transition: background 0.2s;
        }

        .hof-card:last-child {
          border-bottom: none;
        }

        .hof-card-top {
          background: linear-gradient(90deg, rgba(255,215,0,0.06) 0%, transparent 100%);
        }

        .hof-card:hover {
          background: var(--bg-hover);
        }

        .hof-rank-badge {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          font-weight: 800;
          font-size: 1rem;
          flex-shrink: 0;
          margin: 0 auto;
        }

        .hof-rank-1 {
          background: linear-gradient(135deg, #fbbf24, #f59e0b);
          color: #1a1a1a;
          box-shadow: 0 0 16px rgba(251, 191, 36, 0.45);
          font-size: 1.25rem;
        }

        .hof-rank-2 {
          background: linear-gradient(135deg, #e5e7eb, #9ca3af);
          color: #1a1a1a;
          font-size: 1.25rem;
        }

        .hof-rank-3 {
          background: linear-gradient(135deg, #fdba74, #ea580c);
          color: #1a1a1a;
          font-size: 1.25rem;
        }

        .hof-rank-other {
          background: var(--bg-primary);
          color: var(--text-muted);
          border: 1px solid var(--bg-tertiary);
          font-size: 0.875rem;
        }

        .hof-player-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }

        .hof-player-name {
          font-weight: 700;
          font-size: 1.0625rem;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .hof-player-tag {
          font-family: monospace;
          color: var(--text-secondary);
          font-size: 0.8125rem;
          letter-spacing: 0.02em;
        }

        .hof-stat {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          min-width: 56px;
        }

        .hof-stat-value {
          font-weight: 800;
          font-size: 1.125rem;
        }

        .hof-stat-label {
          font-size: 0.6875rem;
          color: var(--text-muted);
          text-transform: uppercase;
          font-weight: 600;
          letter-spacing: 0.03em;
        }

        .hof-stat-wins .hof-stat-value {
          color: #fbbf24;
        }

        .hof-stat-top3 .hof-stat-value {
          color: #f97316;
        }

        .empty-state-box {
          text-align: center;
          padding: var(--spacing-xl);
          background: var(--bg-secondary);
          border-radius: var(--radius-xl);
          border: 1px solid var(--bg-tertiary);
        }

        .empty-icon {
          font-size: 3rem;
          margin-bottom: var(--spacing-md);
        }

        .empty-state-box h4 {
          margin: 0 0 var(--spacing-sm);
          color: var(--text-primary);
        }

        .empty-helper {
          color: var(--text-secondary);
          margin: 0;
        }

        @media (max-width: 600px) {
          .rankings-header {
            margin-bottom: var(--spacing-md);
          }

          .section-title {
            font-size: 1.75rem;
          }

          .info-box {
            margin-bottom: var(--spacing-md);
          }

          .hof-header-row,
          .hof-card {
            grid-template-columns: 44px 1fr 48px 48px 48px;
            gap: 8px;
            padding: var(--spacing-sm) var(--spacing-md);
          }

          .hof-rank-badge {
            width: 34px;
            height: 34px;
            font-size: 0.875rem;
          }

          .hof-rank-1,
          .hof-rank-2,
          .hof-rank-3 {
            font-size: 1rem;
          }

          .hof-player-name {
            font-size: 0.9375rem;
          }

          .hof-stat-value {
            font-size: 0.9375rem;
          }
        }
      `}</style>
    </div>
  );
}
