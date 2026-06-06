import { useState, useEffect } from 'react';
import { isValidDeckLink, extractCardIds } from '../utils/deckParser';
import { getCardById } from '../utils/cardMapping';
import { getCommunityDecks, submitCommunityDeck, voteCommunityDeck } from '../services/api';
import { isChampionCard } from '../data/deckSources';
import DeckPreview from './DeckPreview';

function calculateDynamicAvgElixir(cardIds) {
  if (!cardIds || cardIds.length === 0) return '0.0';
  const total = cardIds.reduce((sum, id) => sum + (getCardById(id)?.elixir || 0), 0);
  return (total / cardIds.length).toFixed(1);
}

function generateDeckTags(cardIds) {
  const names = cardIds.map(id => getCardById(id)?.name?.toLowerCase()).filter(Boolean);
  const tags = [];

  const has = (n) => names.includes(n.toLowerCase());

  const elixir = cardIds.reduce((sum, id) => sum + (getCardById(id)?.elixir || 0), 0) / (cardIds.length || 1);
  if (elixir <= 2.9) tags.push('Fast Cycle');
  else if (elixir >= 4.0) tags.push('Heavy');
  else tags.push('Balanced');

  if (has('hog rider') || has('miner') || has('goblin barrel')) tags.push('Win Condition');
  if (has('golem') || has('giant') || has('royal giant') || has('electro giant')) tags.push('Beatdown');
  if (has('x-bow') || has('mortar')) tags.push('Siege');
  if (has('pekka') || has('mega knight') || has('skeleton king')) tags.push('Tank');
  if (has('tornado') || has('ice wizard') || has('executioner')) tags.push('Control');
  if (cardIds.some(id => isChampionCard(id))) tags.push('Champion');

  return tags.slice(0, 3);
}

function CommunityDeckFeed() {
  const [decks, setDecks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showSubmitForm, setShowSubmitForm] = useState(false);
  const [deckLink, setDeckLink] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [description, setDescription] = useState('');
  const [previewCards, setPreviewCards] = useState(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');
  const [votedDecks, setVotedDecks] = useState(() => {
    try { return JSON.parse(localStorage.getItem('cr_voted_decks') || '[]'); }
    catch { return []; }
  });

  useEffect(() => {
    loadDecks();
  }, []);

  useEffect(() => {
    if (!deckLink.trim()) {
      setPreviewCards(null);
      return;
    }
    if (isValidDeckLink(deckLink)) {
      setPreviewCards(extractCardIds(deckLink));
    } else {
      setPreviewCards(null);
    }
  }, [deckLink]);

  const loadDecks = async () => {
    setLoading(true);
    try {
      const data = await getCommunityDecks();
      setDecks(data.decks || []);
    } catch (err) {
      setError('Failed to load community decks');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitMessage('');
    if (!isValidDeckLink(deckLink)) {
      setSubmitMessage('Please enter a valid deck link');
      return;
    }
    const cardIds = extractCardIds(deckLink);
    if (!cardIds || cardIds.length !== 8) {
      setSubmitMessage('Deck must contain exactly 8 cards');
      return;
    }
    setSubmitLoading(true);
    try {
      await submitCommunityDeck({
        deck_link: deckLink.trim(),
        card_ids: cardIds,
        author_name: authorName.trim(),
        description: description.trim(),
        avg_elixir: calculateDynamicAvgElixir(cardIds),
        tags: generateDeckTags(cardIds)
      });
      setSubmitMessage('✅ Deck submitted for review! It will appear after approval.');
      setDeckLink('');
      setAuthorName('');
      setDescription('');
      setPreviewCards(null);
      loadDecks();
    } catch (err) {
      setSubmitMessage(`❌ ${err.message || 'Failed to submit deck'}`);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleVote = async (id) => {
    if (votedDecks.includes(id)) return;
    try {
      await voteCommunityDeck(id);
      const updated = [...votedDecks, id];
      setVotedDecks(updated);
      localStorage.setItem('cr_voted_decks', JSON.stringify(updated));
      setDecks(prev => prev.map(d => d.id === id ? { ...d, votes: d.votes + 1 } : d));
    } catch (err) {
      console.error('Vote failed:', err);
    }
  };

  return (
    <div className="community-deck-feed-page">
      <div className="feed-header">
        <div>
          <h1>🌟 Community Decks</h1>
          <p className="feed-subtitle">Decks shared by the community. Vote for your favorites!</p>
        </div>
        <button className="submit-deck-toggle" onClick={() => setShowSubmitForm(!showSubmitForm)}>
          {showSubmitForm ? 'Cancel' : '+ Share Your Deck'}
        </button>
      </div>

      {showSubmitForm && (
        <form className="deck-submit-form" onSubmit={handleSubmit}>
          <h4>Share Your Deck</h4>
          <input
            type="text"
            placeholder="Deck Link from Clash Royale (e.g. https://link.clashroyale.com/deck?...)"
            value={deckLink}
            onChange={(e) => setDeckLink(e.target.value)}
            required
          />
          {previewCards && (
            <div className="deck-submit-preview">
              <DeckPreview cardIds={previewCards} compact />
            </div>
          )}
          <div className="form-row">
            <input
              type="text"
              placeholder="Your Name (Optional)"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
            />
          </div>
          <textarea
            placeholder="Deck description, strategy, or tips..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
          <button type="submit" disabled={submitLoading}>
            {submitLoading ? 'Submitting...' : 'Submit Deck'}
          </button>
          {submitMessage && <p className="submit-message">{submitMessage}</p>}
        </form>
      )}

      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading community decks...</p>
        </div>
      ) : error ? (
        <div className="error-state">{error}</div>
      ) : decks.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🃏</div>
          <h3>No community decks yet</h3>
          <p>Be the first to share your deck with the community!</p>
        </div>
      ) : (
        <div className="community-decks-grid">
          {decks.map((deck) => (
            <div key={deck.id} className="community-deck-card">
              <div className="community-deck-header">
                <div className="community-deck-meta">
                  <span className="community-deck-author">{deck.author_name || 'Anonymous'}</span>
                  <span className="community-deck-date">{new Date(deck.created_at).toLocaleDateString()}</span>
                </div>
                <button
                  className={`vote-btn ${votedDecks.includes(deck.id) ? 'voted' : ''}`}
                  onClick={() => handleVote(deck.id)}
                  disabled={votedDecks.includes(deck.id)}
                >
                  ▲ {deck.votes || 0}
                </button>
              </div>
              {deck.description && <p className="community-deck-desc">{deck.description}</p>}
              <DeckPreview cardIds={deck.cardIds} compact />
              <div className="community-deck-footer">
                <span className="avg-elixir">💧 Avg: {deck.avg_elixir || calculateDynamicAvgElixir(deck.cardIds)}</span>
                <a href={deck.deck_link} target="_blank" rel="noopener noreferrer" className="open-deck-btn">Open in CR</a>
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`
        .community-deck-feed-page {
          max-width: 900px;
          margin: 0 auto;
          padding: var(--spacing-xl) 0;
          display: flex;
          flex-direction: column;
          gap: var(--spacing-lg);
        }
        .feed-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          flex-wrap: wrap;
          gap: var(--spacing-md);
        }
        .feed-header h1 {
          margin: 0 0 4px;
          font-size: 1.75rem;
          color: var(--text-primary);
        }
        .feed-subtitle {
          margin: 0;
          color: var(--text-secondary);
          font-size: 0.9375rem;
        }
        .submit-deck-toggle {
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
        .submit-deck-toggle:hover {
          opacity: 0.9;
        }
        .deck-submit-form {
          background: var(--bg-secondary);
          border: 1px solid var(--bg-tertiary);
          border-radius: var(--radius-xl);
          padding: var(--spacing-lg);
          display: flex;
          flex-direction: column;
          gap: var(--spacing-md);
        }
        .deck-submit-form h4 {
          margin: 0;
          color: var(--text-primary);
        }
        .deck-submit-form input,
        .deck-submit-form textarea {
          padding: 10px 14px;
          border-radius: var(--radius-md);
          border: 1px solid var(--bg-tertiary);
          background: var(--bg-primary);
          color: var(--text-primary);
          font-size: 0.875rem;
          width: 100%;
        }
        .deck-submit-form textarea {
          resize: vertical;
        }
        .deck-submit-form button {
          padding: 10px 20px;
          background: var(--accent-success);
          color: white;
          border: none;
          border-radius: var(--radius-md);
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          align-self: flex-start;
        }
        .deck-submit-form button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .deck-submit-preview {
          max-width: 300px;
        }
        .submit-message {
          margin: 0;
          font-size: 0.875rem;
          color: var(--text-secondary);
        }
        .community-decks-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: var(--spacing-lg);
        }
        .community-deck-card {
          background: var(--bg-secondary);
          border: 1px solid var(--bg-tertiary);
          border-radius: var(--radius-xl);
          padding: var(--spacing-md);
          display: flex;
          flex-direction: column;
          gap: var(--spacing-sm);
        }
        .community-deck-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .community-deck-meta {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .community-deck-author {
          font-weight: 700;
          font-size: 0.875rem;
          color: var(--text-primary);
        }
        .community-deck-date {
          font-size: 0.75rem;
          color: var(--text-muted);
        }
        .vote-btn {
          background: var(--bg-tertiary);
          border: none;
          color: var(--text-secondary);
          padding: 6px 12px;
          border-radius: var(--radius-md);
          font-size: 0.875rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
        }
        .vote-btn:hover:not(:disabled) {
          background: var(--accent-primary);
          color: white;
        }
        .vote-btn.voted {
          background: var(--accent-primary);
          color: white;
          cursor: default;
        }
        .community-deck-desc {
          margin: 0;
          font-size: 0.875rem;
          color: var(--text-secondary);
          line-height: 1.4;
        }
        .community-deck-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: var(--spacing-xs);
        }
        .open-deck-btn {
          padding: 6px 12px;
          background: var(--accent-primary);
          color: white;
          border-radius: var(--radius-md);
          font-size: 0.75rem;
          font-weight: 600;
          text-decoration: none;
        }
        .empty-state {
          text-align: center;
          padding: var(--spacing-xl);
          color: var(--text-muted);
        }
        .empty-icon {
          font-size: 3rem;
          margin-bottom: var(--spacing-md);
        }
        .loading-state {
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
          text-align: center;
          padding: var(--spacing-xl);
          color: var(--accent-danger);
        }
        @media (max-width: 640px) {
          .community-deck-feed-page {
            padding: var(--spacing-md);
          }
          .feed-header h1 {
            font-size: 1.5rem;
          }
        }
      `}</style>
    </div>
  );
}

export default CommunityDeckFeed;
