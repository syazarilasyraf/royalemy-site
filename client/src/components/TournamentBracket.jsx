import { useState, useEffect, memo } from 'react';
import { getTournamentMatches, createTournamentMatch, updateTournamentMatch, updateTournamentMatchResult, deleteTournamentMatch } from '../services/api';

function validatePlayerTag(tag) {
  if (!tag) return '';
  return tag.replace('#', '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
}

function TournamentBracket({ tournament, adminKey }) {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editingMatch, setEditingMatch] = useState(null);
  const [resultMatch, setResultMatch] = useState(null);
  const [form, setForm] = useState({
    round: 1,
    match_number: '',
    player1_tag: '',
    player2_tag: '',
    player1_name: '',
    player2_name: ''
  });
  const [resultForm, setResultForm] = useState({
    winner_tag: '',
    player1_score: '',
    player2_score: ''
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadMatches();
  }, [tournament.id]);

  const loadMatches = async () => {
    setLoading(true);
    try {
      const data = await getTournamentMatches(tournament.id);
      setMatches(data.matches || []);
    } catch (err) {
      console.error('Failed to load matches:', err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({
      round: 1,
      match_number: '',
      player1_tag: '',
      player2_tag: '',
      player1_name: '',
      player2_name: ''
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!adminKey) return;
    setSubmitting(true);
    try {
      if (editingMatch) {
        await updateTournamentMatch(tournament.id, editingMatch.id, form, adminKey);
      } else {
        await createTournamentMatch(tournament.id, form, adminKey);
      }
      resetForm();
      setShowAdd(false);
      setEditingMatch(null);
      loadMatches();
    } catch (err) {
      alert(err.message || 'Failed to save match');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResultSubmit = async (e) => {
    e.preventDefault();
    if (!adminKey || !resultMatch) return;
    setSubmitting(true);
    try {
      await updateTournamentMatchResult(tournament.id, resultMatch.id, {
        winner_tag: resultForm.winner_tag,
        player1_score: resultForm.player1_score,
        player2_score: resultForm.player2_score
      }, adminKey);
      setResultMatch(null);
      setResultForm({ winner_tag: '', player1_score: '', player2_score: '' });
      loadMatches();
    } catch (err) {
      alert(err.message || 'Failed to save result');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (matchId) => {
    if (!adminKey) return;
    if (!confirm('Delete this match?')) return;
    try {
      await deleteTournamentMatch(tournament.id, matchId, adminKey);
      loadMatches();
    } catch (err) {
      alert(err.message || 'Failed to delete match');
    }
  };

  const startEdit = (match) => {
    setEditingMatch(match);
    setForm({
      round: match.round,
      match_number: match.match_number,
      player1_tag: match.player1_tag,
      player2_tag: match.player2_tag,
      player1_name: match.player1_name || '',
      player2_name: match.player2_name || ''
    });
    setShowAdd(true);
    setResultMatch(null);
  };

  const startResult = (match) => {
    setResultMatch(match);
    setResultForm({
      winner_tag: match.winner_tag || '',
      player1_score: match.player1_score !== null ? String(match.player1_score) : '',
      player2_score: match.player2_score !== null ? String(match.player2_score) : ''
    });
    setEditingMatch(null);
    setShowAdd(false);
  };

  const grouped = matches.reduce((acc, match) => {
    acc[match.round] = acc[match.round] || [];
    acc[match.round].push(match);
    return acc;
  }, {});

  const rounds = Object.keys(grouped).map(Number).sort((a, b) => a - b);

  return (
    <div className="tournament-bracket">
      <div className="bracket-header">
        <h3>🏆 Match Tracker</h3>
        {adminKey && (
          <button
            className="add-match-btn"
            onClick={() => {
              setShowAdd(!showAdd);
              setEditingMatch(null);
              setResultMatch(null);
              resetForm();
            }}
          >
            {showAdd ? 'Cancel' : '+ Add Match'}
          </button>
        )}
      </div>

      {showAdd && (
        <form className="match-form" onSubmit={handleSubmit}>
          <h4>{editingMatch ? 'Edit Match' : 'Add Match'}</h4>
          <div className="form-row">
            <input
              type="number"
              placeholder="Round"
              value={form.round}
              onChange={(e) => setForm({ ...form, round: parseInt(e.target.value) || 1 })}
              min="1"
              required
            />
            <input
              type="number"
              placeholder="Match # (auto)"
              value={form.match_number}
              onChange={(e) => setForm({ ...form, match_number: e.target.value })}
              min="1"
            />
          </div>
          <div className="form-row">
            <input
              type="text"
              placeholder="Player 1 Tag"
              value={form.player1_tag}
              onChange={(e) => setForm({ ...form, player1_tag: e.target.value })}
              required
            />
            <input
              type="text"
              placeholder="Player 1 Name (optional)"
              value={form.player1_name}
              onChange={(e) => setForm({ ...form, player1_name: e.target.value })}
            />
          </div>
          <div className="form-row">
            <input
              type="text"
              placeholder="Player 2 Tag"
              value={form.player2_tag}
              onChange={(e) => setForm({ ...form, player2_tag: e.target.value })}
              required
            />
            <input
              type="text"
              placeholder="Player 2 Name (optional)"
              value={form.player2_name}
              onChange={(e) => setForm({ ...form, player2_name: e.target.value })}
            />
          </div>
          <button type="submit" disabled={submitting}>
            {submitting ? 'Saving...' : (editingMatch ? 'Update Match' : 'Add Match')}
          </button>
        </form>
      )}

      {resultMatch && (
        <form className="match-form" onSubmit={handleResultSubmit}>
          <h4>Record Result</h4>
          <p className="match-players">{resultMatch.player1_name || resultMatch.player1_tag} vs {resultMatch.player2_name || resultMatch.player2_tag}</p>
          <div className="form-row">
            <input
              type="text"
              placeholder="Winner Tag"
              value={resultForm.winner_tag}
              onChange={(e) => setResultForm({ ...resultForm, winner_tag: e.target.value })}
              required
            />
          </div>
          <div className="form-row">
            <input
              type="number"
              placeholder={`${resultMatch.player1_name || resultMatch.player1_tag} Score`}
              value={resultForm.player1_score}
              onChange={(e) => setResultForm({ ...resultForm, player1_score: e.target.value })}
              min="0"
            />
            <input
              type="number"
              placeholder={`${resultMatch.player2_name || resultMatch.player2_tag} Score`}
              value={resultForm.player2_score}
              onChange={(e) => setResultForm({ ...resultForm, player2_score: e.target.value })}
              min="0"
            />
          </div>
          <button type="submit" disabled={submitting}>
            {submitting ? 'Saving...' : 'Save Result'}
          </button>
        </form>
      )}

      {loading ? (
        <p className="bracket-empty">Loading matches...</p>
      ) : matches.length === 0 ? (
        <p className="bracket-empty">No matches recorded yet.</p>
      ) : (
        <div className="bracket-rounds">
          {rounds.map(round => (
            <div key={round} className="bracket-round">
              <h4>Round {round}</h4>
              <div className="round-matches">
                {grouped[round].map(match => (
                  <div key={match.id} className={`bracket-match ${match.status === 'completed' ? 'completed' : ''}`}>
                    <div className="match-players-row">
                      <div className={`match-player ${match.winner_tag === match.player1_tag ? 'winner' : ''}`}>
                        <span className="player-name">{match.player1_name || match.player1_tag}</span>
                        {match.status === 'completed' && (
                          <span className="player-score">{match.player1_score ?? '-'}</span>
                        )}
                      </div>
                      <div className="match-vs">VS</div>
                      <div className={`match-player ${match.winner_tag === match.player2_tag ? 'winner' : ''}`}>
                        <span className="player-name">{match.player2_name || match.player2_tag}</span>
                        {match.status === 'completed' && (
                          <span className="player-score">{match.player2_score ?? '-'}</span>
                        )}
                      </div>
                    </div>
                    {adminKey && (
                      <div className="match-admin-actions">
                        <button onClick={() => startResult(match)}>Result</button>
                        <button onClick={() => startEdit(match)}>Edit</button>
                        <button onClick={() => handleDelete(match.id)}>Delete</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`
        .tournament-bracket {
          margin-top: var(--spacing-lg);
          padding: var(--spacing-lg);
          background: var(--bg-secondary);
          border-radius: var(--radius-xl);
          border: 1px solid var(--bg-tertiary);
        }
        .bracket-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--spacing-md);
        }
        .bracket-header h3 {
          margin: 0;
          font-size: 1.125rem;
          color: var(--text-primary);
        }
        .add-match-btn {
          padding: 6px 12px;
          background: var(--accent-primary);
          color: white;
          border: none;
          border-radius: var(--radius-md);
          font-size: 0.8125rem;
          font-weight: 600;
          cursor: pointer;
        }
        .match-form {
          background: var(--bg-primary);
          padding: var(--spacing-md);
          border-radius: var(--radius-md);
          margin-bottom: var(--spacing-md);
          display: flex;
          flex-direction: column;
          gap: var(--spacing-sm);
        }
        .match-form h4 {
          margin: 0 0 var(--spacing-xs);
          font-size: 0.9375rem;
          color: var(--text-primary);
        }
        .match-form .match-players {
          margin: 0;
          font-size: 0.8125rem;
          color: var(--text-secondary);
        }
        .form-row {
          display: flex;
          gap: var(--spacing-sm);
          flex-wrap: wrap;
        }
        .form-row input {
          flex: 1;
          min-width: 120px;
          padding: 8px 12px;
          border-radius: var(--radius-md);
          border: 1px solid var(--bg-tertiary);
          background: var(--bg-secondary);
          color: var(--text-primary);
          font-size: 0.8125rem;
        }
        .match-form button {
          padding: 8px 16px;
          background: var(--accent-success);
          color: white;
          border: none;
          border-radius: var(--radius-md);
          font-size: 0.8125rem;
          font-weight: 600;
          cursor: pointer;
          align-self: flex-start;
        }
        .match-form button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .bracket-empty {
          color: var(--text-muted);
          font-size: 0.875rem;
          margin: 0;
        }
        .bracket-rounds {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-md);
        }
        .bracket-round h4 {
          margin: 0 0 var(--spacing-sm);
          font-size: 0.9375rem;
          color: var(--text-primary);
        }
        .round-matches {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-sm);
        }
        .bracket-match {
          background: var(--bg-primary);
          border-radius: var(--radius-md);
          padding: var(--spacing-sm);
          border: 1px solid var(--bg-tertiary);
        }
        .bracket-match.completed {
          border-color: var(--accent-success);
        }
        .match-players-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--spacing-sm);
        }
        .match-player {
          flex: 1;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 6px 10px;
          background: var(--bg-secondary);
          border-radius: var(--radius-sm);
          font-size: 0.8125rem;
          color: var(--text-secondary);
        }
        .match-player.winner {
          background: rgba(34, 197, 94, 0.15);
          color: var(--accent-success);
          font-weight: 700;
        }
        .match-vs {
          font-size: 0.6875rem;
          font-weight: 700;
          color: var(--text-muted);
        }
        .player-score {
          font-weight: 700;
          margin-left: var(--spacing-sm);
        }
        .match-admin-actions {
          display: flex;
          gap: var(--spacing-sm);
          margin-top: var(--spacing-sm);
        }
        .match-admin-actions button {
          padding: 4px 10px;
          background: var(--bg-tertiary);
          color: var(--text-secondary);
          border: none;
          border-radius: var(--radius-sm);
          font-size: 0.6875rem;
          cursor: pointer;
        }
        .match-admin-actions button:hover {
          background: var(--accent-primary);
          color: white;
        }
        @media (max-width: 640px) {
          .match-players-row {
            flex-direction: column;
            align-items: stretch;
          }
          .match-vs {
            text-align: center;
          }
        }
      `}</style>
    </div>
  );
}

export default memo(TournamentBracket);
