import { useState, useEffect, useRef, useMemo } from 'react';
import { getCardById, getCardImageUrl, hasEvolution, hasHero } from '../utils/cardMapping';
import { buildDeckLink, isValidDeckLink, extractCardIds } from '../utils/deckParser';
import { getPlayer, getMetaDecks, getCommunityDecks, submitCommunityDeck, voteCommunityDeck } from '../services/api';
import { getPlayerCardMap, calculateDeckScore, sortDecks, getCompatibilityColor } from '../utils/deckSuggestions';
import { generateDeckTitles, generateDeckDescription } from '../utils/deckTitleGenerator';
import { isChampionCard } from '../data/deckSources';
import DeckPreview from './DeckPreview';
import './ArenaDeckRecommender.css';



const RARITY_COLORS = {
  common: '#b8b8b8',
  rare: '#ff9f1c',
  epic: '#a855f7',
  legendary: '#3b82f6',
  champion: '#22c55e'
};

function getTagColor(tag) {
  const colors = {
    'F2P Friendly': '#4CAF50', 'Fast Cycle': '#2196F3', 'Control': '#9C27B0',
    'Beatdown': '#FF9800', 'Siege': '#795548', 'Bait': '#F44336',
    'Beginner Friendly': '#4CAF50', 'Classic': '#607D8B', 'Defensive': '#00BCD4',
    'Aggro': '#E91E63', 'Spell Cycle': '#673AB7', 'Bridge Spam': '#FF5722',
    'Air': '#03A9F4', 'Ground': '#8BC34A', 'Easy to Play': '#4CAF50',
    'Balanced': '#607D8B', 'Air Focus': '#03A9F4', 'Quick Deploy': '#2196F3',
    'Swarm': '#8BC34A', 'Splash Damage': '#FF9800', 'Spawner': '#795548',
    'Tanky': '#FF5722', 'Spell Damage': '#9C27B0', 'Combo': '#E91E63',
    'High Cost': '#F44336', 'Split Lane': '#2196F3', 'Slow Down': '#00BCD4',
    'Cheap Tank': '#4CAF50', 'Kite': '#8BC34A', 'Classic Deck': '#FFD700',
    'Trophy Push': '#FF9800', 'Meta Deck': '#9C27B0', 'Reset': '#00BCD4',
    'Stun': '#FFD700', 'Chain Damage': '#FF5722', 'Win Condition': '#4CAF50',
    'Invisible': '#9C27B0', 'Ambush': '#E91E63', 'Spooky': '#795548',
    'Splash Tank': '#FF9800', 'Spell Bait': '#F44336', 'Aggressive': '#FF5722',
    'Range': '#03A9F4', 'Pressure': '#FF9800', 'Chip Damage': '#FF5722',
    'Fast': '#2196F3', 'Healing': '#4CAF50', 'Sustain': '#8BC34A',
    'High Damage': '#FF5722', 'Champion': '#FFD700', 'Dash': '#2196F3',
    'Legendary': '#FFD700', 'Swarm Counter': '#FF9800', '1-Elixir': '#00BCD4',
    'Revive': '#4CAF50', 'Air Heavy': '#03A9F4', 'Air Splash': '#03A9F4',
    'Tank': '#FF5722', 'Heavy': '#F44336', 'Air Beatdown': '#03A9F4',
    'Devastating': '#F44336', 'Skill': '#9C27B0', 'Snare': '#8BC34A',
    'Evolutions': '#FF9800', 'Clan War': '#FF5722', 'League Ready': '#FFD700',
    'Advanced': '#9C27B0', 'High Skill': '#FF5722', 'Master Tier': '#FFD700',
    'Elite': '#FFD700', 'Double Champion': '#FFD700', 'Top Tier': '#FFD700',
    'All Champions': '#FFD700', 'Grand': '#FFD700', 'Top Meta': '#FFD700',
    'Ultimate': '#FFD700'
  };
  return colors[tag] || '#757575';
}



// ==================== SMART DECK FINDER ====================

function SmartDeckFinder() {
  const [playerTag, setPlayerTag] = useState('');
  const [playerData, setPlayerData] = useState(null);
  const [playerCardMap, setPlayerCardMap] = useState({});
  const [metaDecks, setMetaDecks] = useState([]);
  const [metaInfo, setMetaInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [sortBy, setSortBy] = useState('recommended');
  const [onlyPlayable, setOnlyPlayable] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  const handleLoadProfile = async (e) => {
    e.preventDefault();
    if (!playerTag.trim()) return;
    setLoading(true);
    setError(null);

    try {
      // Fetch player and meta decks in parallel
      const [playerRes, metaRes] = await Promise.all([
        getPlayer(playerTag.trim()),
        getMetaDecks()
      ]);

      setPlayerData(playerRes);
      setPlayerCardMap(getPlayerCardMap(playerRes));
      setMetaInfo(metaRes);

      // Enrich meta decks with titles and compatibility
      const titles = generateDeckTitles(metaRes.decks);
      const enriched = metaRes.decks.map((deck, idx) => ({
        ...deck,
        title: titles[idx],
        description: generateDeckDescription(deck.cardIds),
        tags: generateDeckTags(deck.cardIds),
        avgElixir: calculateDynamicAvgElixir(deck.cardIds),
        hasChampion: deck.cardIds.some(id => isChampionCard(id))
      }));

      const scored = sortDecks(enriched, sortBy, getPlayerCardMap(playerRes));
      setMetaDecks(scored);
    } catch (err) {
      setError(err.message || 'Failed to load data. Please try again.');
      setPlayerData(null);
      setPlayerCardMap({});
      setMetaDecks([]);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setPlayerData(null); setPlayerCardMap({}); setPlayerTag(''); setError(null);
    setMetaDecks([]); setMetaInfo(null);
  };

  const handleSortChange = (newSort) => {
    setSortBy(newSort);
    const rescored = sortDecks(
      metaDecks.map(r => ({ ...r, analysis: undefined })),
      newSort,
      playerCardMap
    );
    setMetaDecks(rescored);
  };

  const handleCopyDeckLink = async (deck) => {
    try { await navigator.clipboard.writeText(buildDeckLink(deck.cardIds)); setCopiedId(deck.id); setTimeout(() => setCopiedId(null), 2000); }
    catch (err) { console.error('Failed to copy:', err); }
  };

  const visibleResults = useMemo(() => {
    if (!onlyPlayable) return metaDecks;
    return metaDecks.filter(r => (r.analysis?.score || 0) === 100);
  }, [metaDecks, onlyPlayable]);

  const hasResults = playerData && metaDecks.length > 0;

  return (
    <div className="smart-deck-finder">
      {/* Player Tag Input */}
      {!hasResults && (
        <div className="finder-step">
          <div className="finder-step-header">
            <h2>🎯 Smart Deck Finder</h2>
            <p>Enter your player tag to see live meta decks extracted from real battles of top-ranked pro players</p>
          </div>

          <form className="player-tag-form" onSubmit={handleLoadProfile}>
            <div className="player-tag-input-wrapper">
              <span className="player-tag-hash">#</span>
              <input type="text" placeholder="Enter your player tag (e.g. 2P0JJQ0Y)" value={playerTag}
                onChange={(e) => setPlayerTag(e.target.value.replace('#', '').toUpperCase())}
                className="player-tag-input" disabled={loading} />
            </div>
            <button type="submit" className="player-tag-btn" disabled={loading || !playerTag.trim()}>
              {loading ? '⏳ Analyzing...' : '🔍 Find My Decks'}
            </button>
          </form>

          {error && <div className="player-tag-error">⚠️ {error}</div>}

          <div className="how-it-works">
            <h4>How it works</h4>
            <ol>
              <li>We pull live battle logs from <strong>20 elite pro players</strong> (Global Top 100 & CRL pros)</li>
              <li>Extract every 8-card deck they actually use in ranked battles</li>
              <li>Calculate real win rates and usage stats from their match history</li>
              <li>Match decks against your card collection and show compatibility</li>
            </ol>
          </div>

          <div className="source-info">
            <div className="source-info-header">
              <span className="source-info-icon">📡</span>
              <span className="source-info-title">Live Data Source</span>
              <span className="source-info-badge">Real Battles</span>
            </div>
            <p className="source-info-desc">
              Decks are built from the actual battle logs of top global players. 
              We randomly sample 20 players each refresh to keep the meta fresh.
            </p>
            <div className="source-players">
              <span className="player-chip">Ian77</span>
              <span className="player-chip">Morten</span>
              <span className="player-chip">Mohamed Light</span>
              <span className="player-chip">Dominik</span>
              <span className="player-chip">Guriko</span>
              <span className="player-chip">Pedro</span>
              <span className="player-chip">Osama</span>
              <span className="player-chip">Jonah</span>
              <span className="player-chip">Dess</span>
              <span className="player-chip">JorZ</span>
              <span className="player-chip">Rakan</span>
              <span className="player-chip">Surgical Goblin</span>
              <span className="player-chip">Anaban</span>
              <span className="player-chip">Mugi</span>
              <span className="player-chip">Thegod_rf</span>
              <span className="player-chip">Tourist</span>
              <span className="player-chip">Fan</span>
              <span className="player-chip">Betfas</span>
              <span className="player-chip">Morten Alt</span>
              <span className="player-chip">Ian77 Alt</span>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {hasResults && (
        <div className="finder-step">
          <div className="player-profile-summary">
            <div className="player-profile-info">
              <div className="player-avatar">👤</div>
              <div>
                <div className="player-name">{playerData.name || 'Unknown Player'}</div>
                <div className="player-meta">
                  {playerData.trophies && <span>🏆 {playerData.trophies.toLocaleString()} trophies</span>}
                  {playerData.expLevel && <span>⭐ Level {playerData.expLevel}</span>}
                  <span>🃏 {Object.keys(playerCardMap).length} cards</span>
                </div>
              </div>
            </div>
            <button className="player-clear-btn" onClick={handleClear}>✕ New Search</button>
          </div>

          {metaInfo?.source === 'fallback' && (
            <div className="fallback-banner">
              <span>⚠️ {metaInfo.fallbackReason || 'Live rankings temporarily unavailable. Showing curated meta decks.'}</span>
            </div>
          )}

          <div className="meta-info-bar">
            {metaInfo?.source === 'live' ? (
              <>
                <span>📊 Live meta from top {metaInfo?.playerSampleSize || '?'} players</span>
                <span>🎮 {metaInfo?.totalBattlesAnalyzed || '?'} battles analyzed</span>
              </>
            ) : (
              <span>📊 Curated meta decks</span>
            )}
            <span>🕒 Updated {metaInfo?.lastUpdated ? new Date(metaInfo.lastUpdated).toLocaleTimeString() : 'recently'}</span>
          </div>

          <div className="results-toolbar">
            <div className="results-filters">
              <label className="config-toggle inline">
                <input type="checkbox" checked={onlyPlayable} onChange={(e) => setOnlyPlayable(e.target.checked)} />
                <span className="toggle-slider"></span>
                <span className="toggle-label">Only playable decks</span>
              </label>
            </div>
            <div className="results-sort-wrapper">
              <span className="sort-label">Sort by</span>
              <select className="results-sort" value={sortBy} onChange={(e) => handleSortChange(e.target.value)}>
                <option value="recommended">Recommended</option>
                <option value="compatibility">Compatibility</option>
                <option value="winRate">Win Rate</option>
                <option value="usage">Usage</option>
                <option value="elixir-asc">Elixir: Low→High</option>
                <option value="elixir-desc">Elixir: High→Low</option>
              </select>
            </div>
          </div>

          {visibleResults.length === 0 ? (
            <div className="no-decks-found">
              <div className="no-decks-icon">🔍</div>
              <h3>No playable decks found</h3>
              <p>Try disabling "Only playable decks" to see decks you're close to completing.</p>
            </div>
          ) : (
            <div className="results-count">
              Showing <strong>{visibleResults.length}</strong> of <strong>{metaDecks.length}</strong> live meta decks
            </div>
          )}

          <div className="decks-grid results-grid">
            {visibleResults.map((deck) => {
              const analysis = deck.analysis || calculateDeckScore(deck, playerCardMap);
              const isReady = analysis.score === 100;

              return (
                <div key={deck.id} className={`deck-card ${isReady ? 'fully-compatible' : ''}`}>
                  <div className="deck-header">
                    <div className="deck-title-row">
                      <h3>{deck.title}</h3>
                      {analysis && (
                        <div className="compatibility-badge" style={{ backgroundColor: getCompatibilityColor(analysis.finalScore) }}>
                          {isReady ? '✓ Ready' : `${analysis.score}%`}
                        </div>
                      )}
                    </div>
                    <div className="deck-meta-row">
                      <div className="deck-tags">
                        {deck.tags.slice(0, 3).map((tag, idx) => <span key={idx} className="deck-tag" style={{ backgroundColor: getTagColor(tag) }}>{tag}</span>)}
                      </div>
                      <div className="deck-source-meta">
                        <span className="source-badge">🎮 {deck.usageCount} uses</span>
                        <span className="source-badge winrate">{deck.winRate}% WR</span>
                        {deck.hasChampion && <span className="source-badge champion-badge">👑 Champion</span>}
                      </div>
                    </div>
                  </div>

                  <p className="deck-description">{deck.description}</p>

                  {deck.usedBy && deck.usedBy.length > 0 && (
                    <div className="deck-used-by">
                      <span className="used-by-label">Used by</span>
                      <span className="used-by-players">
                        {deck.usedBy.slice(0, 5).join(', ')}
                        {deck.usedBy.length > 5 && ` +${deck.usedBy.length - 5} more`}
                      </span>
                    </div>
                  )}

                  {analysis?.missing.length > 0 && (
                    <div className="deck-missing-cards">
                      <span className="missing-label">Missing ({analysis.missing.length}):</span>
                      {analysis.missing.map(cardId => {
                        const card = getCardById(cardId);
                        return <span key={cardId} className="missing-card-chip">{card?.name || '?'}</span>;
                      })}
                    </div>
                  )}

                  <div className="deck-cards">
                    {deck.cardIds.map((cardId, idx) => {
                      const card = getCardById(cardId);
                      const playerCard = playerCardMap[cardId];
                      const isMissing = !playerCard;
                      const isChampion = isChampionCard(cardId);

                      return (
                        <div key={idx} className={`deck-card-item ${isMissing ? 'missing' : ''} ${isChampion ? 'champion-card' : ''}`} title={card?.name || 'Unknown'}>
                          <img src={getCardImageUrl(cardId)} alt={card?.name || 'Card'} loading="lazy"
                            onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
                          <div className="card-fallback" style={{ display: 'none', background: RARITY_COLORS[card?.rarity] || '#757575' }}>
                            <span className="fallback-name">{card?.name || '?'}</span>
                          </div>
                          {card && <span className="card-elixir"><span className="elixir-icon">💧</span>{card.elixir}</span>}
                          {playerCard && <span className="card-level-badge">Lv.{playerCard.level}</span>}
                          {isMissing && <span className="card-missing-badge">❌</span>}
                          {isChampion && <span className="card-champion-badge">👑</span>}
                          <div className="deck-card-badges">
                            {hasEvolution(cardId) && <span className="deck-card-badge deck-card-badge--evo">Evo</span>}
                            {hasHero(cardId) && <span className="deck-card-badge deck-card-badge--hero">Hero</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="deck-footer">
                    <div className="deck-stats">
                      <span className="avg-elixir" title="Average elixir cost"><span className="elixir-icon">💧</span>Avg: {deck.avgElixir}</span>
                      {analysis && analysis.owned > 0 && (
                        <span className="avg-level" title={`Average level of owned cards (${analysis.owned}/8)`}>
                          <span className="level-icon">⚔️</span>
                          {analysis.owned}/8 cards · Avg Lv {analysis.avgLevelOwned}
                        </span>
                      )}
                    </div>
                    <div className="deck-actions">
                      <a href={buildDeckLink(deck.cardIds)} target="_blank" rel="noopener noreferrer" className="action-btn open-btn">Open in CR</a>
                      <button className={`action-btn copy-btn ${copiedId === deck.id ? 'copied' : ''}`} onClick={() => handleCopyDeckLink(deck)}>
                        {copiedId === deck.id ? '✓ Copied!' : 'Copy Link'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="disclaimer">
        <p>⚠️ <strong>Disclaimer:</strong> This tool is not affiliated with Supercell. Deck recommendations are built from live top-player battle logs and matched to your card collection. They do not guarantee ladder success. Use at your own discretion.</p>
      </div>
    </div>
  );
}

// ==================== COMMUNITY DECK FEED ====================

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
    <div className="community-deck-feed">
      <div className="feed-header">
        <div>
          <h2>🌟 Community Decks</h2>
          <p>Decks shared by the community. Vote for your favorites!</p>
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
        .community-deck-feed {
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
        .feed-header h2 {
          margin: 0 0 4px;
          font-size: 1.5rem;
        }
        .feed-header p {
          margin: 0;
          color: var(--text-secondary);
          font-size: 0.875rem;
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
      `}</style>
    </div>
  );
}

// ==================== HELPERS ====================

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

// ==================== MAIN COMPONENT ====================

function ArenaDeckRecommender() {
  const [activeTab, setActiveTab] = useState('smart');

  return (
    <div className="arena-deck-recommender">
      <div className="arena-header">
        <h1>🏟️ Arena Deck Recommender</h1>
        <p className="arena-subtitle">Find the best live meta decks matched to your card collection</p>
      </div>

      <div className="arena-tabs">
        <button 
          className={`arena-tab ${activeTab === 'smart' ? 'active' : ''}`}
          onClick={() => setActiveTab('smart')}
        >
          🎯 Smart Deck Finder
        </button>
        <button 
          className={`arena-tab ${activeTab === 'community' ? 'active' : ''}`}
          onClick={() => setActiveTab('community')}
        >
          🌟 Community Decks
        </button>
      </div>

      {activeTab === 'smart' && <SmartDeckFinder />}
      {activeTab === 'community' && <CommunityDeckFeed />}

      <style>{`
        .arena-tabs {
          display: flex;
          gap: var(--spacing-xs);
          margin-bottom: var(--spacing-lg);
          overflow-x: auto;
          padding-bottom: var(--spacing-xs);
        }
        .arena-tab {
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
        .arena-tab:hover {
          background: var(--bg-hover);
          color: var(--text-primary);
        }
        .arena-tab.active {
          background: var(--accent-primary);
          border-color: var(--accent-primary);
          color: white;
        }
        @media (max-width: 640px) {
          .arena-tabs {
            justify-content: flex-start;
          }
        }
      `}</style>
    </div>
  );
}

export default ArenaDeckRecommender;
