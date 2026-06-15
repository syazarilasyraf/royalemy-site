import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getHallOfFame } from '../services/api';

export default function HallOfFame() {
  const navigate = useNavigate();
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    try {
      const data = await getHallOfFame(50);
      setStats(data.stats || []);
    } catch (err) {
      console.error('Failed to load hall of fame:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container hall-of-fame-page">
      <button className="back-btn" onClick={() => navigate('/rankings')}>
        ← Back to Rankings
      </button>
      <h2 className="section-title">🏆 Hall of Fame</h2>
      <p className="section-desc">Top tournament performers</p>

      {loading ? (
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading rankings...</p>
        </div>
      ) : stats.length > 0 ? (
        <>
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
              const showName = s.player_name && s.player_name !== s.player_tag;
              return (
                <div key={s.id} className={`hof-card ${rank <= 3 ? 'hof-card-top' : ''}`}>
                  <div className={`hof-rank-badge ${rankClass}`}>{medal || rank}</div>
                  <div className="hof-player-info">
                    <span className="hof-player-name">{s.player_tag}</span>
                    {showName && <span className="hof-player-tag">{s.player_name}</span>}
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
        </>
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

        .hall-of-fame-page .back-btn {
          margin-bottom: var(--spacing-md);
        }

        .hof-header-row {
          display: grid;
          grid-template-columns: 56px 1fr 56px 56px 56px;
          align-items: center;
          gap: var(--spacing-md);
          padding: 8px var(--spacing-lg);
          margin-bottom: 8px;
          font-size: 0.6875rem;
          color: var(--text-muted);
          text-transform: uppercase;
          font-weight: 700;
          letter-spacing: 0.05em;
        }

        .hof-header-rank { text-align: center; }
        .hof-header-player { padding-left: 4px; }
        .hof-header-stat { text-align: center; }

        .hof-list {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-md);
        }

        .hof-card {
          display: grid;
          grid-template-columns: 56px 1fr 56px 56px 56px;
          align-items: center;
          gap: var(--spacing-md);
          background: var(--bg-secondary);
          border: 1px solid var(--bg-tertiary);
          border-radius: var(--radius-xl);
          padding: var(--spacing-md) var(--spacing-lg);
          transition: transform 0.15s, box-shadow 0.2s, border-color 0.2s;
        }

        .hof-card-top {
          border-color: rgba(255, 215, 0, 0.25);
          background: linear-gradient(90deg, rgba(255,215,0,0.06) 0%, var(--bg-secondary) 100%);
        }

        .hof-card:hover {
          transform: translateX(4px);
          border-color: rgba(255,255,255,0.12);
          box-shadow: 0 6px 20px rgba(0,0,0,0.2);
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
          font-family: monospace;
          letter-spacing: 0.02em;
        }

        .hof-player-tag {
          font-family: inherit;
          color: var(--text-secondary);
          font-size: 0.8125rem;
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

        @media (max-width: 600px) {
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
