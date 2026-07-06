import { useState, useEffect, memo } from 'react';
import { isValidDeckLink, extractCardIds } from '../utils/deckParser';
import { getCardById } from '../utils/cardMapping';
import { getCommunityDecks, submitCommunityDeck, voteCommunityDeck, getCommunityDeckShareUrl, getDeckComments, addDeckComment } from '../services/api';
import { isChampionCard } from '../data/deckSources';
import { generateDeckTitle } from '../utils/deckTitleGenerator';
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
  const [deckTitle, setDeckTitle] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [description, setDescription] = useState('');
  const [previewCards, setPreviewCards] = useState(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');
  const [votedDecks, setVotedDecks] = useState(() => {
    try { return JSON.parse(localStorage.getItem('cr_voted_decks') || '[]'); }
    catch { return []; }
  });
  const [sortBy, setSortBy] = useState(() => {
    try { return localStorage.getItem('cr_deck_sort') || 'top'; }
    catch { return 'top'; }
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [adminPostFilter, setAdminPostFilter] = useState('all');
  const [expandedDecks, setExpandedDecks] = useState({});
  const [deckComments, setDeckComments] = useState({});
  const [commentInputs, setCommentInputs] = useState({});
  const [commentLoading, setCommentLoading] = useState({});

  useEffect(() => {
    loadDecks();
  }, [sortBy]);

  // Highlight a specific deck from ?deck=ID
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const deckId = params.get('deck');
    if (!deckId) return;

    const timer = setInterval(() => {
      const el = document.getElementById(`deck-${deckId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('deck-highlight');
        setTimeout(() => el.classList.remove('deck-highlight'), 2500);
        clearInterval(timer);
      }
    }, 100);

    const timeout = setTimeout(() => clearInterval(timer), 5000);
    return () => { clearInterval(timer); clearTimeout(timeout); };
  }, [decks]);

  useEffect(() => {
    if (!deckLink.trim()) {
      setPreviewCards(null);
      return;
    }
    if (isValidDeckLink(deckLink)) {
      const cardIds = extractCardIds(deckLink);
      setPreviewCards(cardIds);
      if (!deckTitle.trim()) {
        setDeckTitle(generateDeckTitle(cardIds));
      }
    } else {
      setPreviewCards(null);
    }
  }, [deckLink]);

  const loadDecks = async () => {
    setLoading(true);
    try {
      const data = await getCommunityDecks(sortBy);
      setDecks(data.decks || []);
    } catch (err) {
      setError('Failed to load community decks');
    } finally {
      setLoading(false);
    }
  };

  const handleSortChange = (newSort) => {
    setSortBy(newSort);
    try { localStorage.setItem('cr_deck_sort', newSort); }
    catch { /* ignore */ }
  };

  const filteredDecks = decks.filter((deck) => {
    const matchesPostFilter =
      adminPostFilter === 'all' ? true :
      adminPostFilter === 'admin' ? deck.is_admin_post === 1 :
      deck.is_admin_post === 0;

    if (!searchQuery.trim()) return matchesPostFilter;

    const q = searchQuery.toLowerCase();
    const title = (deck.title || generateDeckTitle(deck.cardIds)).toLowerCase();
    const desc = (deck.description || '').toLowerCase();
    const author = (deck.author_name || '').toLowerCase();
    const matchesSearch = title.includes(q) || desc.includes(q) || author.includes(q);
    return matchesPostFilter && matchesSearch;
  });

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
        title: deckTitle.trim() || generateDeckTitle(cardIds),
        author_name: authorName.trim(),
        description: description.trim(),
        avg_elixir: calculateDynamicAvgElixir(cardIds),
        tags: generateDeckTags(cardIds)
      });
      setSubmitMessage('✅ Deck submitted successfully! It is now live on the community feed.');
      setDeckLink('');
      setDeckTitle('');
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

  const toggleComments = async (deckId) => {
    setExpandedDecks(prev => ({ ...prev, [deckId]: !prev[deckId] }));
    if (!deckComments[deckId]) {
      try {
        const data = await getDeckComments(deckId);
        setDeckComments(prev => ({ ...prev, [deckId]: data.comments || [] }));
      } catch (err) {
        console.error('Failed to load comments:', err);
      }
    }
  };

  const handleCommentChange = (deckId, field, value) => {
    setCommentInputs(prev => ({
      ...prev,
      [deckId]: { ...(prev[deckId] || {}), [field]: value }
    }));
  };

  const handleSubmitComment = async (deckId) => {
    const input = commentInputs[deckId] || {};
    const comment = (input.comment || '').trim();
    if (!comment) return;

    setCommentLoading(prev => ({ ...prev, [deckId]: true }));
    try {
      await addDeckComment(deckId, {
        author_name: input.author_name || '',
        comment
      });
      const data = await getDeckComments(deckId);
      setDeckComments(prev => ({ ...prev, [deckId]: data.comments || [] }));
      setCommentInputs(prev => ({ ...prev, [deckId]: { ...(prev[deckId] || {}), comment: '' } }));
    } catch (err) {
      alert(err.message || 'Failed to post comment');
    } finally {
      setCommentLoading(prev => ({ ...prev, [deckId]: false }));
    }
  };

  const handleShare = async (deck) => {
    const shareUrl = getCommunityDeckShareUrl(deck.id);
    try {
      if (navigator.share) {
        await navigator.share({
          title: `Community Deck by ${deck.author_name || 'Anonymous'} | RoyaleMY`,
          text: deck.description || 'Check out this community deck on RoyaleMY!',
          url: shareUrl
        });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
        alert('Deck share link copied to clipboard!');
      } else {
        window.prompt('Copy this link:', shareUrl);
      }
    } catch (err) {
      // User cancelled share or clipboard failed
      console.error('Share failed:', err);
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
        <div className="feed-controls">
          <div className="search-control">
            <input
              type="text"
              placeholder="Search decks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="deck-search-input"
            />
          </div>
          <div className="sort-control">
            <label htmlFor="deck-post-filter">Show</label>
            <select
              id="deck-post-filter"
              value={adminPostFilter}
              onChange={(e) => setAdminPostFilter(e.target.value)}
            >
              <option value="all">All Posts</option>
              <option value="admin">Admin Posts</option>
              <option value="viewer">Viewer Posts</option>
            </select>
          </div>
          <div className="sort-control">
            <label htmlFor="deck-sort">Sort by</label>
            <select
              id="deck-sort"
              value={sortBy}
              onChange={(e) => handleSortChange(e.target.value)}
            >
              <option value="top">🏆 Top Rated</option>
              <option value="trending">🔥 Trending</option>
            </select>
          </div>
          <button className="submit-deck-toggle" onClick={() => setShowSubmitForm(!showSubmitForm)}>
            {showSubmitForm ? 'Cancel' : '+ Share Your Deck'}
          </button>
        </div>
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
          <input
            type="text"
            placeholder="Deck Title (optional - auto-generated if empty)"
            value={deckTitle}
            onChange={(e) => setDeckTitle(e.target.value)}
          />
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
          {submitMessage && (
            <p className={`submit-message ${submitMessage.startsWith('❌') ? 'submit-error' : ''}`}>
              {submitMessage}
            </p>
          )}
        </form>
      )}

      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading community decks...</p>
        </div>
      ) : error ? (
        <div className="error-state">
          <div className="empty-icon">⚠️</div>
          <h3>Failed to load decks</h3>
          <p>{error}</p>
        </div>
      ) : filteredDecks.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🃏</div>
          <h3>{decks.length === 0 ? 'No community decks yet' : 'No decks match your filters'}</h3>
          <p>{decks.length === 0 ? 'Be the first to share your deck with the community!' : 'Try adjusting your search or filter.'}</p>
        </div>
      ) : (
        <div className="community-decks-grid">
          {filteredDecks.map((deck) => (
            <div
              key={deck.id}
              id={`deck-${deck.id}`}
              className={`community-deck-card ${deck.is_admin_post ? 'admin-post-card' : 'viewer-post-card'}`}
            >
              <div className="community-deck-header">
                <div className="community-deck-meta">
                  <span className="community-deck-title">{deck.title || generateDeckTitle(deck.cardIds)}</span>
                  <span className="community-deck-author">{deck.author_name || 'Anonymous'}</span>
                  <span className="community-deck-date">{new Date(deck.created_at).toLocaleDateString()}</span>
                </div>
                <div className="community-deck-badges">
                  {deck.is_admin_post ? (
                    <span className="deck-badge admin-badge">Admin Pick</span>
                  ) : (
                    <span className="deck-badge viewer-badge">Community</span>
                  )}
                  <button
                    className={`vote-btn ${votedDecks.includes(deck.id) ? 'voted' : ''}`}
                    onClick={() => handleVote(deck.id)}
                    disabled={votedDecks.includes(deck.id)}
                  >
                    ▲ {deck.votes || 0}
                  </button>
                </div>
              </div>
              {deck.description && <p className="community-deck-desc">{deck.description}</p>}
              <DeckPreview cardIds={deck.cardIds} compact />
              <div className="community-deck-footer">
                <span className="avg-elixir">💧 Avg: {deck.avg_elixir || calculateDynamicAvgElixir(deck.cardIds)}</span>
                <div className="deck-actions">
                  <button className="comment-deck-btn" onClick={() => toggleComments(deck.id)} title="Comments">
                    💬 {deckComments[deck.id]?.length || 0}
                  </button>
                  <button className="share-deck-btn" onClick={() => handleShare(deck)} title="Share deck">
                    🔗 Share
                  </button>
                  <a href={deck.deck_link} target="_blank" rel="noopener noreferrer" className="open-deck-btn">Open in CR</a>
                </div>
              </div>
              {expandedDecks[deck.id] && (
                <div className="deck-comments-section">
                  <h4>Comments</h4>
                  <div className="comment-list">
                    {(deckComments[deck.id] || []).length === 0 ? (
                      <p className="no-comments">No comments yet. Be the first!</p>
                    ) : (
                      deckComments[deck.id].map(comment => (
                        <div key={comment.id} className="deck-comment">
                          <div className="comment-header">
                            <span className="comment-author">{comment.author_name || 'Anonymous'}</span>
                            <span className="comment-date">{new Date(comment.created_at).toLocaleString()}</span>
                          </div>
                          <p className="comment-text">{comment.comment}</p>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="comment-form">
                    <input
                      type="text"
                      placeholder="Your name (optional)"
                      value={(commentInputs[deck.id]?.author_name) || ''}
                      onChange={(e) => handleCommentChange(deck.id, 'author_name', e.target.value)}
                      className="comment-name-input"
                    />
                    <textarea
                      placeholder="Add a strategy tip or comment..."
                      value={(commentInputs[deck.id]?.comment) || ''}
                      onChange={(e) => handleCommentChange(deck.id, 'comment', e.target.value)}
                      rows={2}
                    />
                    <button
                      onClick={() => handleSubmitComment(deck.id)}
                      disabled={commentLoading[deck.id] || !(commentInputs[deck.id]?.comment || '').trim()}
                    >
                      {commentLoading[deck.id] ? 'Posting...' : 'Post Comment'}
                    </button>
                  </div>
                </div>
              )}
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
        .feed-controls {
          display: flex;
          align-items: center;
          gap: var(--spacing-md);
          flex-wrap: wrap;
        }
        .search-control {
          display: flex;
          align-items: center;
        }
        .deck-search-input {
          padding: 8px 12px;
          border-radius: var(--radius-md);
          border: 1px solid var(--bg-tertiary);
          background: var(--bg-primary);
          color: var(--text-primary);
          font-size: 0.875rem;
          min-width: 180px;
        }
        .sort-control {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
        }
        .sort-control label {
          font-size: 0.875rem;
          color: var(--text-secondary);
          font-weight: 500;
        }
        .sort-control select {
          padding: 8px 12px;
          border-radius: var(--radius-md);
          border: 1px solid var(--bg-tertiary);
          background: var(--bg-primary);
          color: var(--text-primary);
          font-size: 0.875rem;
          cursor: pointer;
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
        .submit-message.submit-error {
          color: var(--accent-danger);
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
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .admin-post-card {
          border-color: rgba(255, 159, 28, 0.5);
          box-shadow: 0 2px 8px rgba(255, 159, 28, 0.08);
        }
        .viewer-post-card {
          border-color: var(--bg-tertiary);
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
        .community-deck-title {
          font-weight: 800;
          font-size: 0.9375rem;
          color: var(--text-primary);
        }
        .community-deck-author {
          font-weight: 600;
          font-size: 0.8125rem;
          color: var(--text-secondary);
        }
        .community-deck-badges {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
        }
        .deck-badge {
          font-size: 0.6875rem;
          font-weight: 700;
          padding: 3px 8px;
          border-radius: var(--radius-md);
          text-transform: uppercase;
          letter-spacing: 0.03em;
          white-space: nowrap;
        }
        .admin-badge {
          background: rgba(255, 159, 28, 0.15);
          color: #ff9f1c;
        }
        .viewer-badge {
          background: var(--bg-tertiary);
          color: var(--text-muted);
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
        .deck-actions {
          display: flex;
          gap: var(--spacing-sm);
          align-items: center;
        }
        .share-deck-btn,
        .comment-deck-btn {
          padding: 6px 12px;
          background: var(--bg-tertiary);
          color: var(--text-secondary);
          border: none;
          border-radius: var(--radius-md);
          font-size: 0.75rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .share-deck-btn:hover,
        .comment-deck-btn:hover {
          background: var(--accent-primary);
          color: white;
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
        .deck-highlight {
          animation: deckPulse 2.5s ease;
          border-color: var(--accent-primary);
        }
        @keyframes deckPulse {
          0% { box-shadow: 0 0 0 0 var(--accent-primary); }
          70% { box-shadow: 0 0 0 12px transparent; }
          100% { box-shadow: 0 0 0 0 transparent; }
        }
        .deck-comments-section {
          margin-top: var(--spacing-sm);
          padding-top: var(--spacing-md);
          border-top: 1px solid var(--bg-tertiary);
          display: flex;
          flex-direction: column;
          gap: var(--spacing-md);
        }
        .deck-comments-section h4 {
          margin: 0;
          font-size: 0.9375rem;
          color: var(--text-primary);
        }
        .comment-list {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-sm);
          max-height: 240px;
          overflow-y: auto;
        }
        .no-comments {
          margin: 0;
          font-size: 0.8125rem;
          color: var(--text-muted);
          font-style: italic;
        }
        .deck-comment {
          background: var(--bg-primary);
          border-radius: var(--radius-md);
          padding: var(--spacing-sm);
        }
        .comment-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 4px;
        }
        .comment-author {
          font-weight: 600;
          font-size: 0.8125rem;
          color: var(--text-primary);
        }
        .comment-date {
          font-size: 0.6875rem;
          color: var(--text-muted);
        }
        .comment-text {
          margin: 0;
          font-size: 0.875rem;
          color: var(--text-secondary);
          line-height: 1.4;
          white-space: pre-wrap;
        }
        .comment-form {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-sm);
        }
        .comment-form input,
        .comment-form textarea {
          padding: 8px 12px;
          border-radius: var(--radius-md);
          border: 1px solid var(--bg-tertiary);
          background: var(--bg-primary);
          color: var(--text-primary);
          font-size: 0.8125rem;
          width: 100%;
          resize: vertical;
        }
        .comment-form button {
          padding: 8px 16px;
          background: var(--accent-primary);
          color: white;
          border: none;
          border-radius: var(--radius-md);
          font-size: 0.8125rem;
          font-weight: 600;
          cursor: pointer;
          align-self: flex-start;
        }
        .comment-form button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
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
          .feed-controls {
            width: 100%;
            justify-content: space-between;
          }
        }
      `}</style>
    </div>
  );
}

export default memo(CommunityDeckFeed);
