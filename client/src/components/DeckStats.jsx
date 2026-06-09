import { useState, useEffect, useMemo, memo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { isValidDeckLink, extractCardIds } from '../utils/deckParser';
import { getCardById, calculateAverageElixir, hasEvolution, hasHero } from '../utils/cardMapping';
import { canHitAir, hasSplash, isWinCondition, isMelee, isDefensiveBuilding, isTank, isSmallSpell, isBigSpell } from '../utils/cardAttributes';
import SkeletonLoader from './SkeletonLoader';
import { analyzeDeck } from '../utils/archetypeAnalyzer';

// Info popup component
function InfoPopup({ title, description, onClose }) {
  if (!description) return null;
  return (
    <div className="info-popup-overlay" onClick={onClose}>
      <div className="info-popup" onClick={e => e.stopPropagation()}>
        <button className="info-popup-close" onClick={onClose}>×</button>
        <h4>{title}</h4>
        <p>{description}</p>
      </div>
    </div>
  );
}

const SAMPLE_DECKS = [
  { name: '2.6 Hog Cycle', url: 'https://link.clashroyale.com/en?clashroyale://copyDeck?deck=26000021;26000014;26000030;26000010;27000000;28000000;28000011;26000038&tt=159000000&l=Royals', archetype: 'Fast Cycle' },
  { name: 'Log Bait', url: 'https://link.clashroyale.com/en?clashroyale://copyDeck?deck=26000026;28000004;28000003;26000000;27000003;28000011;26000041;26000040&tt=159000000&l=Royals', archetype: 'Control' },
  { name: 'PEKKA Bridge Spam', url: 'https://link.clashroyale.com/en?clashroyale://copyDeck?deck=26000004;26000036;26000046;26000042;28000009;28000008;26000050;26000005&tt=159000000&l=Royals', archetype: 'Bridge Spam' },
  { name: 'Golem Beatdown', url: 'https://link.clashroyale.com/en?clashroyale://copyDeck?deck=26000009;26000015;26000039;28000007;28000012;28000011;26000035;26000030&tt=159000000&l=Royals', archetype: 'Beatdown' },
];

function DeckStats() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [deckLink, setDeckLink] = useState('');
  const [deckData, setDeckData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [infoPopup, setInfoPopup] = useState(null);

  const showInfo = (title, description) => {
    setInfoPopup({ title, description });
  };

  useEffect(() => {
    const linkFromUrl = searchParams.get('link');
    if (linkFromUrl) {
      setDeckLink(linkFromUrl);
      parseDeck(linkFromUrl);
    }
  }, [searchParams]);

  const parseDeck = async (link) => {
    setLoading(true);
    setError('');
    setDeckData(null);
    
    await new Promise(r => setTimeout(r, 300));
    
    if (!isValidDeckLink(link)) {
      setError('Invalid deck link. Must start with https://link.clashroyale.com/');
      setLoading(false);
      return;
    }

    const cardIds = extractCardIds(link);
    if (!cardIds || cardIds.length !== 8) {
      setError('Could not extract 8 cards from the link.');
      setLoading(false);
      return;
    }

    const cards = cardIds.map(id => getCardById(id));
    const avgElixir = calculateAverageElixir(cardIds);
    
    const typeCount = { troop: 0, spell: 0, building: 0 };
    const rarityCount = { common: 0, rare: 0, epic: 0, legendary: 0, champion: 0 };
    const elixirCosts = [];
    
    // Advanced stats
    let airHitterCount = 0;
    let splashCount = 0;
    let winConditionCount = 0;
    let meleeCount = 0;
    let defensiveBuildingCount = 0;
    let tankCount = 0;
    let smallSpellCount = 0;
    let bigSpellCount = 0;
    
    cards.forEach(card => {
      const type = card.type || 'troop';
      typeCount[type] = (typeCount[type] || 0) + 1;
      
      const rarity = card.rarity || 'common';
      rarityCount[rarity] = (rarityCount[rarity] || 0) + 1;
      
      elixirCosts.push(card.elixir || 0);
      
      // Count advanced attributes
      const cardId = String(card.id);
      if (canHitAir(cardId)) airHitterCount++;
      if (hasSplash(cardId)) splashCount++;
      if (isWinCondition(cardId)) winConditionCount++;
      if (isMelee(cardId)) meleeCount++;
      if (isDefensiveBuilding(cardId)) defensiveBuildingCount++;
      if (isTank(cardId)) tankCount++;
      if (isSmallSpell(cardId)) smallSpellCount++;
      if (isBigSpell(cardId)) bigSpellCount++;
    });
    
    // Calculate cycle cost (average of 4 cheapest cards)
    const sortedElixir = [...elixirCosts].sort((a, b) => a - b);
    const cycleCost = sortedElixir.slice(0, 4).reduce((a, b) => a + b, 0) / 4;
    
    const archetypeHints = [];
    if (typeCount.spell >= 3) archetypeHints.push('Spell Heavy');
    if (typeCount.building >= 2) archetypeHints.push('Defensive');
    if (avgElixir <= 3.3) archetypeHints.push('Fast Cycle');
    if (avgElixir >= 4.5) archetypeHints.push('Heavy');
    if (rarityCount.legendary + rarityCount.champion >= 3) archetypeHints.push('High Rarity');
    if (winConditionCount >= 2) archetypeHints.push('Multi-Wincon');
    if (tankCount >= 2) archetypeHints.push('Tank Heavy');
    if (smallSpellCount >= 2) archetypeHints.push('Spell Cycle');
    if (defensiveBuildingCount >= 1) archetypeHints.push('Siege/Control');
    
    const oneElixirCount = elixirCosts.filter(e => e === 1).length;
    if (oneElixirCount >= 2) archetypeHints.push('Quick Cycle');

    setDeckData({
      cards,
      avgElixir,
      cycleCost,
      typeCount,
      rarityCount,
      elixirCosts,
      archetypeHints,
      airHitterCount,
      splashCount,
      winConditionCount,
      meleeCount,
      defensiveBuildingCount,
      tankCount,
      smallSpellCount,
      bigSpellCount,
      originalLink: link,
      archetypeAnalysis: analyzeDeck(cardIds, parseFloat(avgElixir))
    });
    setLoading(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    parseDeck(deckLink);
  };

  const handleSample = (deck) => {
    setDeckLink(deck.url);
    parseDeck(deck.url);
  };

  const handleOpenInCR = () => {
    if (deckData?.originalLink) {
      window.open(deckData.originalLink, '_blank');
    }
  };

  const getRarityColor = (rarity) => {
    const colors = {
      common: '#b8b8b8',
      rare: '#ff9f1c',
      epic: '#a855f7',
      legendary: '#3b82f6',
      champion: '#22c55e'
    };
    return colors[rarity] || colors.common;
  };

  return (
    <div className="deck-stats">
      <section className="input-section">
        <form onSubmit={handleSubmit} className="deck-form">
          <div className="input-row">
            <input
              type="text"
              value={deckLink}
              onChange={(e) => setDeckLink(e.target.value)}
              placeholder="Paste Clash Royale Deck Link"
              className="deck-input"
            />
            <button type="submit" className="analyze-btn" disabled={loading || !deckLink.trim()}>
              {loading ? 'Analyzing...' : 'Analyze'}
            </button>
          </div>
          {error && <div className="error-msg">{error}</div>}
        </form>

        {/* Quick Try Section */}
        <div className="quick-try-section">
          <h4 className="section-title">⚡ Quick Try</h4>
          <div className="sample-decks">
            {SAMPLE_DECKS.map(d => (
              <button key={d.name} onClick={() => handleSample(d)} className="sample-deck-card" disabled={loading}>
                <span className="sd-name">{d.name}</span>
                <span className="sd-archetype">{d.archetype}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Smart Deck Finder CTA */}
        <div className="arena-cta">
          <div className="arena-cta-content">
            <span className="arena-cta-icon">🎯</span>
            <div className="arena-cta-text">
              <h4>Smart Deck Finder</h4>
              <p>Find live meta decks matched to your card collection</p>
            </div>
          </div>
          <button onClick={() => navigate('/arenadecks')} className="arena-cta-btn">
            Find My Decks →
          </button>
        </div>

        {/* Community Decks Link */}
        <div className="community-teaser" onClick={() => navigate('/communitydecks')} style={{ cursor: 'pointer' }}>
          <div className="teaser-content">
            <span className="teaser-icon">🌟</span>
            <div className="teaser-text">
              <h4>Community Decks</h4>
              <p>Vote for the best decks and see what's trending in the community.</p>
            </div>
          </div>
          <span className="coming-soon-badge" style={{ background: 'rgba(34, 197, 94, 0.2)', color: '#22c55e' }}>Open</span>
        </div>
      </section>

      {loading && <SkeletonLoader type="deck" />}

      {!loading && !deckData && !error && (
        <div className="empty-state">
          <div className="empty-icon">🎴</div>
          <h3>Analyze Any Deck</h3>
          <p>Paste a deck link from Clash Royale to see card details and statistics.</p>
        </div>
      )}

      {deckData && !loading && (
        <div className="results">
          {/* Main Stats */}
          <div className="main-stats">
            <div className="stat-box elixir">
              <span className="stat-label">
                Average Elixir
                <span className="info-icon" onClick={() => showInfo('Average Elixir', 'Average elixir cost of all 8 cards. Lower = faster cycle, Higher = stronger pushes')}>ⓘ</span>
              </span>
              <span className="stat-value">{deckData.avgElixir}</span>
              <div className="elixir-bar">
                <div 
                  className="elixir-fill" 
                  style={{ width: `${Math.min((deckData.avgElixir / 6) * 100, 100)}%` }}
                />
              </div>
              <span className="stat-hint">{deckData.avgElixir <= 3.3 ? 'Fast' : deckData.avgElixir >= 4.5 ? 'Heavy' : 'Balanced'}</span>
            </div>
            <div className="stat-box cycle">
              <span className="stat-label">
                Cycle Cost
                <span className="info-icon" onClick={() => showInfo('Cycle Cost', 'Average of your 4 cheapest cards. Key for cycle decks - lower means faster card rotation')}>ⓘ</span>
              </span>
              <span className="stat-value" style={{ color: '#22c55e' }}>{deckData.cycleCost.toFixed(1)}</span>
              <span className="stat-sublabel">4 cheapest cards avg</span>
              <span className="stat-hint">{deckData.cycleCost <= 2.5 ? 'Quick Rotate' : deckData.cycleCost <= 3.5 ? 'Standard' : 'Slow Cycle'}</span>
            </div>
          </div>
          
          {/* Deck Identity */}
          {deckData.archetypeAnalysis && (
            <div className="identity-section">
              <h4 className="identity-title">🎯 Deck Identity</h4>
              <div className="identity-card">
                <div className="identity-row">
                  <span className="identity-label">Primary Archetype</span>
                  <span className="identity-value identity-value--primary">{deckData.archetypeAnalysis.archetypes.primaryArchetype.name}</span>
                </div>
                <div className="identity-row">
                  <span className="identity-label">Secondary Archetype</span>
                  <span className="identity-value identity-value--secondary">{deckData.archetypeAnalysis.archetypes.secondaryArchetype.name}</span>
                </div>
                <div className="identity-row">
                  <span className="identity-label">Confidence</span>
                  <span className="identity-value identity-value--confidence">{deckData.archetypeAnalysis.archetypes.confidence}%</span>
                </div>
                <div className="confidence-bar">
                  <div 
                    className="confidence-fill" 
                    style={{ width: `${deckData.archetypeAnalysis.archetypes.confidence}%` }}
                  />
                </div>
                <p className="identity-description">{deckData.archetypeAnalysis.archetypes.description}</p>
              </div>
            </div>
          )}

          {/* Playstyle Breakdown */}
          {deckData.archetypeAnalysis && (
            <div className="breakdown-section">
              <h4>📊 Playstyle Breakdown</h4>
              <p className="section-hint">How strongly this deck matches each archetype</p>
              <div className="playstyle-list">
                {deckData.archetypeAnalysis.archetypes.breakdown.map((arch) => (
                  <div key={arch.key} className="playstyle-item">
                    <span className="ps-label">{arch.key === 'dualLane' ? 'Dual Lane' : arch.key === 'bridgespam' ? 'Bridge Spam' : arch.key === 'minerControl' ? 'Miner Control' : arch.key.charAt(0).toUpperCase() + arch.key.slice(1)}</span>
                    <div className="ps-bar-wrap">
                      <div 
                        className="ps-bar" 
                        style={{ 
                          width: `${arch.score}%`,
                          background: arch.score >= 60 ? '#22c55e' : arch.score >= 35 ? '#3b82f6' : arch.score >= 15 ? '#f59e0b' : '#64748b'
                        }}
                      />
                    </div>
                    <span className="ps-value">{arch.score}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {deckData.archetypeHints.length > 0 && (
            <div className="archetype-tags">
              {deckData.archetypeHints.map((hint, i) => (
                <span key={i} className="tag">{hint}</span>
              ))}
            </div>
          )}

          {/* Deck Preview */}
          <div className="preview-section">
            <h4>Cards ({deckData.cards.length})</h4>
            <div className="deck-grid">
              {deckData.cards.map((card, i) => (
                <div key={`${card.id}-${i}`} className="dcard">
                  <div className="dcard-img-wrap" style={{ borderColor: getRarityColor(card.rarity) }}>
                    <img 
                      src={card.image || `/cards/${card.id}.webp`}
                      alt={card.name}
                      onError={(e) => { e.target.src = '/cards/placeholder.webp'; }}
                    />
                    <span className="dcard-elixir">{card.elixir || '?'}</span>
                  </div>
                  <span className="dcard-name">{card.name}</span>
                  <span className="dcard-rarity" style={{ color: getRarityColor(card.rarity) }}>
                    {card.rarity}
                  </span>
                  <div className="dcard-badges">
                    {hasEvolution(card.id) && <span className="dcard-badge dcard-badge--evo">Evo</span>}
                    {hasHero(card.id) && <span className="dcard-badge dcard-badge--hero">Hero</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Type Breakdown */}
          <div className="breakdown-section">
            <h4>Type Breakdown</h4>
            <div className="breakdown-grid">
              <div className="break-item">
                <span className="bi-icon">⚔️</span>
                <span className="bi-value">{deckData.typeCount.troop || 0}</span>
                <span className="bi-label">Troops</span>
              </div>
              <div className="break-item">
                <span className="bi-icon">✨</span>
                <span className="bi-value">{deckData.typeCount.spell || 0}</span>
                <span className="bi-label">Spells</span>
              </div>
              <div className="break-item">
                <span className="bi-icon">🏰</span>
                <span className="bi-value">{deckData.typeCount.building || 0}</span>
                <span className="bi-label">Buildings</span>
              </div>
            </div>
          </div>

          {/* Elixir Distribution */}
          <div className="breakdown-section">
            <h4>Elixir Cost Distribution</h4>
            <p className="section-hint">How many cards at each elixir cost</p>
            <div className="elixir-distribution">
              {useMemo(() => [1, 2, 3, 4, 5, 6, 7, 8, 9].map(cost => {
                const count = deckData.elixirCosts.filter(e => e === cost).length;
                return (
                  <div key={cost} className="dist-bar">
                    <div className="dist-count">{count > 0 ? count : '·'}</div>
                    <div
                      className="dist-fill"
                      style={{
                        height: count > 0 ? `${Math.max((count / 4) * 40, 4)}px` : '4px',
                        maxHeight: '40px'
                      }}
                    />
                    <div className="dist-label">{cost}⚡</div>
                  </div>
                );
              }), [deckData.elixirCosts])}
            </div>
          </div>

          {/* Combat Stats */}
          <div className="breakdown-section">
            <h4>Combat Analysis</h4>
            <p className="section-hint">Deck strengths and coverage analysis</p>
            <div className="combat-grid">
              <div className="combat-item">
                <span className="ci-label">
                  Air Defense
                  <span className="info-icon small" onClick={() => showInfo('Air Defense', 'Cards that can attack flying troops. Need at least 3-4 to counter Balloons/Lava Hounds')}>ⓘ</span>
                </span>
                <div className="ci-bar-wrap">
                  <div 
                    className="ci-bar" 
                    style={{ 
                      width: `${(deckData.airHitterCount / 8) * 100}%`,
                      background: deckData.airHitterCount >= 5 ? '#22c55e' : deckData.airHitterCount >= 3 ? '#f59e0b' : '#ef4444'
                    }}
                  />
                </div>
                <span className="ci-value" style={{ 
                  color: deckData.airHitterCount >= 5 ? '#22c55e' : deckData.airHitterCount >= 3 ? '#f59e0b' : '#ef4444'
                }}>{deckData.airHitterCount}/8</span>
                <span className="ci-badge" style={{ 
                  background: deckData.airHitterCount >= 5 ? 'rgba(34, 197, 94, 0.2)' : deckData.airHitterCount >= 3 ? 'rgba(245, 158, 11, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                  color: deckData.airHitterCount >= 5 ? '#22c55e' : deckData.airHitterCount >= 3 ? '#f59e0b' : '#ef4444'
                }}>
                  {deckData.airHitterCount >= 5 ? 'Strong' : deckData.airHitterCount >= 3 ? 'Okay' : 'Weak'}
                </span>
              </div>
              <div className="combat-item">
                <span className="ci-label">
                  Splash Damage
                  <span className="info-icon small" onClick={() => showInfo('Splash Damage', 'Cards with area damage. Good against swarms (Skeleton Army, Goblin Gang)')}>ⓘ</span>
                </span>
                <div className="ci-bar-wrap">
                  <div 
                    className="ci-bar" 
                    style={{ 
                      width: `${(deckData.splashCount / 8) * 100}%`,
                      background: deckData.splashCount >= 3 ? '#22c55e' : deckData.splashCount >= 2 ? '#a855f7' : '#6b7280'
                    }}
                  />
                </div>
                <span className="ci-value" style={{ 
                  color: deckData.splashCount >= 3 ? '#22c55e' : deckData.splashCount >= 2 ? '#a855f7' : '#6b7280'
                }}>{deckData.splashCount}/8</span>
                <span className="ci-badge" style={{ 
                  background: deckData.splashCount >= 3 ? 'rgba(34, 197, 94, 0.2)' : deckData.splashCount >= 2 ? 'rgba(168, 85, 247, 0.2)' : 'rgba(107, 114, 128, 0.2)',
                  color: deckData.splashCount >= 3 ? '#22c55e' : deckData.splashCount >= 2 ? '#a855f7' : '#9ca3af'
                }}>
                  {deckData.splashCount >= 3 ? 'Strong' : deckData.splashCount >= 2 ? 'Good' : 'Low'}
                </span>
              </div>
              <div className="combat-item">
                <span className="ci-label">
                  Win Conditions
                  <span className="info-icon small" onClick={() => showInfo('Win Conditions', 'Primary tower damage dealers (Hog, Golem, Balloon, etc.). Most decks need 1-2')}>ⓘ</span>
                </span>
                <div className="ci-bar-wrap">
                  <div 
                    className="ci-bar" 
                    style={{ 
                      width: `${(deckData.winConditionCount / 3) * 100}%`,
                      background: deckData.winConditionCount >= 1 ? '#3b82f6' : '#ef4444'
                    }}
                  />
                </div>
                <span className="ci-value" style={{ 
                  color: deckData.winConditionCount >= 1 ? '#3b82f6' : '#ef4444'
                }}>{deckData.winConditionCount}</span>
                <span className="ci-badge" style={{ 
                  background: deckData.winConditionCount >= 1 ? 'rgba(59, 130, 246, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                  color: deckData.winConditionCount >= 1 ? '#3b82f6' : '#ef4444'
                }}>
                  {deckData.winConditionCount >= 1 ? (deckData.winConditionCount >= 2 ? 'Multiple' : 'Good') : 'Missing!'}
                </span>
              </div>
              <div className="combat-item">
                <span className="ci-label">
                  Tanks
                  <span className="info-icon small" onClick={() => showInfo('Tanks', 'High HP units that absorb damage (Giant, Golem, P.E.K.K.A). Protects your support troops')}>ⓘ</span>
                </span>
                <div className="ci-bar-wrap">
                  <div 
                    className="ci-bar" 
                    style={{ 
                      width: `${Math.min((deckData.tankCount / 2) * 100, 100)}%`,
                      background: deckData.tankCount > 0 ? '#f97316' : '#6b7280'
                    }}
                  />
                </div>
                <span className="ci-value" style={{ 
                  color: deckData.tankCount > 0 ? '#f97316' : '#6b7280'
                }}>{deckData.tankCount}</span>
                <span className="ci-badge" style={{ 
                  background: deckData.tankCount > 0 ? 'rgba(249, 115, 22, 0.2)' : 'rgba(107, 114, 128, 0.2)',
                  color: deckData.tankCount > 0 ? '#f97316' : '#9ca3af'
                }}>
                  {deckData.tankCount > 0 ? (deckData.tankCount >= 2 ? 'Tank Heavy' : 'Has Tank') : 'No Tank'}
                </span>
              </div>
              <div className="combat-item">
                <span className="ci-label">
                  Range Balance
                  <span className="info-icon small" onClick={() => showInfo('Range Balance', 'Mix of melee (close-range) and ranged cards. Balanced decks usually have both')}>ⓘ</span>
                </span>
                <span className="ci-range-text">
                  {deckData.meleeCount} Melee / {8 - deckData.meleeCount} Ranged
                </span>
                <span className="ci-badge" style={{ 
                  background: (deckData.meleeCount >= 3 && deckData.meleeCount <= 5) ? 'rgba(34, 197, 94, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                  color: (deckData.meleeCount >= 3 && deckData.meleeCount <= 5) ? '#22c55e' : '#f59e0b'
                }}>
                  {(deckData.meleeCount >= 3 && deckData.meleeCount <= 5) ? 'Balanced' : deckData.meleeCount < 3 ? 'Ranged Heavy' : 'Melee Heavy'}
                </span>
              </div>
              <div className="combat-item">
                <span className="ci-label">
                  Spell Split
                  <span className="info-icon small" onClick={() => showInfo('Spell Split', 'Small spells (Zap, Log, 2 elixir) for cheap reset vs Big spells (Rocket, Lightning) for heavy damage')}>ⓘ</span>
                </span>
                <span className="ci-range-text">
                  {deckData.smallSpellCount} Small / {deckData.bigSpellCount} Big
                </span>
                <span className="ci-badge" style={{ 
                  background: (deckData.smallSpellCount >= 1 && deckData.bigSpellCount >= 1) ? 'rgba(34, 197, 94, 0.2)' : 'rgba(107, 114, 128, 0.2)',
                  color: (deckData.smallSpellCount >= 1 && deckData.bigSpellCount >= 1) ? '#22c55e' : '#9ca3af'
                }}>
                  {(deckData.smallSpellCount >= 1 && deckData.bigSpellCount >= 1) ? 'Balanced' : deckData.smallSpellCount >= 2 ? 'Cycle Heavy' : deckData.bigSpellCount >= 2 ? 'Spell Heavy' : 'Basic'}
                </span>
              </div>
            </div>
          </div>

          {/* How This Deck Wins */}
          {deckData.archetypeAnalysis?.howToWin.length > 0 && (
            <div className="breakdown-section">
              <h4>🏆 How This Deck Wins</h4>
              <ul className="win-list">
                {deckData.archetypeAnalysis.howToWin.map((tip, i) => (
                  <li key={i} className="win-item">{tip}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Strengths & Weaknesses */}
          {deckData.archetypeAnalysis && (
            <div className="breakdown-section">
              <h4>⚖️ Strengths & Weaknesses</h4>
              <div className="sw-grid">
                <div className="sw-column">
                  <h5 className="sw-heading sw-heading--strength">Strengths</h5>
                  <ul className="sw-list">
                    {deckData.archetypeAnalysis.strengthsWeaknesses.strengths.map((s, i) => (
                      <li key={i} className="sw-item sw-item--strength">{s}</li>
                    ))}
                  </ul>
                </div>
                <div className="sw-column">
                  <h5 className="sw-heading sw-heading--weakness">Weaknesses</h5>
                  <ul className="sw-list">
                    {deckData.archetypeAnalysis.strengthsWeaknesses.weaknesses.map((w, i) => (
                      <li key={i} className="sw-item sw-item--weakness">{w}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Similar Decks */}
          {deckData.archetypeAnalysis?.similarDecks.length > 0 && (
            <div className="breakdown-section">
              <h4>🔍 Similar Decks</h4>
              <p className="section-hint">Top meta decks that match your build</p>
              <div className="similar-list">
                {deckData.archetypeAnalysis.similarDecks.map((deck, i) => (
                  <div key={i} className="similar-item">
                    <div className="similar-info">
                      <span className="similar-name">{deck.name}</span>
                      <span className="similar-meta">{deck.sharedCount}/8 cards shared • {deck.archetypes.map(a => a.charAt(0).toUpperCase() + a.slice(1)).join(', ')}</span>
                    </div>
                    <div className="similar-score">
                      <span className="similar-percent">{deck.similarity}%</span>
                      <div className="similar-bar-wrap">
                        <div 
                          className="similar-bar" 
                          style={{ 
                            width: `${deck.similarity}%`,
                            background: deck.similarity >= 70 ? '#22c55e' : deck.similarity >= 40 ? '#3b82f6' : '#f59e0b'
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Rarity Breakdown */}
          <div className="breakdown-section">
            <h4>Rarity</h4>
            <div className="rarity-list">
              {useMemo(() => Object.entries(deckData.rarityCount)
                .filter(([, count]) => count > 0)
                .map(([rarity, count]) => (
                  <div key={rarity} className="rarity-item">
                    <span
                      className="rarity-dot"
                      style={{ background: getRarityColor(rarity) }}
                    />
                    <span className="rarity-name">{rarity}</span>
                    <span className="rarity-count">{count}</span>
                  </div>
                )), [deckData.rarityCount])}
            </div>
          </div>

          <button onClick={handleOpenInCR} className="open-cr-btn">
            <span>🎮</span>
            <span>Open in Clash Royale</span>
          </button>
        </div>
      )}

      {/* Info Popup */}
      <InfoPopup 
        title={infoPopup?.title} 
        description={infoPopup?.description} 
        onClose={() => setInfoPopup(null)} 
      />

      <style>{`
        .deck-stats {
          max-width: 700px;
          margin: 0 auto;
          display: block;
        }

        .input-section {
          margin-bottom: var(--spacing-lg);
          width: 100%;
          max-width: 100%;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          gap: var(--spacing-sm);
        }

        .deck-form {
          margin-bottom: var(--spacing-sm);
        }

        .input-row {
          display: flex;
          gap: var(--spacing-sm);
        }

        .deck-input {
          flex: 1;
          padding: var(--spacing-md);
          font-size: 1rem;
          background: var(--bg-secondary);
          border: 2px solid var(--bg-tertiary);
          border-radius: var(--radius-lg);
          color: var(--text-primary);
          min-width: 0;
        }

        .deck-input:focus {
          outline: none;
          border-color: var(--accent-primary);
        }

        .analyze-btn {
          padding: var(--spacing-md) var(--spacing-lg);
          background: var(--accent-primary);
          color: white;
          font-weight: 700;
          border: none;
          border-radius: var(--radius-lg);
          cursor: pointer;
          white-space: nowrap;
        }

        .analyze-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .error-msg {
          margin-top: var(--spacing-sm);
          padding: var(--spacing-sm);
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: var(--radius-md);
          color: #fca5a5;
          font-size: 0.875rem;
        }

        /* Enhanced Samples Section */
        .section-title {
          font-size: 0.875rem;
          color: var(--text-muted);
          margin: 0 0 var(--spacing-sm) 0;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        /* Quick Try Section */
        .quick-try-section {
          margin-top: var(--spacing-md);
          padding-top: var(--spacing-md);
          border-top: 1px solid var(--bg-tertiary);
        }

        .sample-decks {
          display: flex;
          gap: var(--spacing-sm);
          flex-wrap: wrap;
        }

        .sample-deck-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          padding: var(--spacing-sm) var(--spacing-md);
          background: var(--bg-secondary);
          border: 1px solid var(--bg-tertiary);
          border-radius: var(--radius-lg);
          cursor: pointer;
          transition: all 0.2s;
          min-width: 100px;
        }

        .sample-deck-card:hover:not(:disabled) {
          background: var(--accent-primary);
          border-color: var(--accent-primary);
          transform: translateY(-2px);
        }

        .sample-deck-card:hover:not(:disabled) .sd-name,
        .sample-deck-card:hover:not(:disabled) .sd-archetype {
          color: white;
        }

        .sd-name {
          font-size: 0.9rem;
          font-weight: 600;
          color: var(--text-primary);
        }

        .sd-archetype {
          font-size: 0.7rem;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        /* Arena CTA */
        .arena-cta {
          margin-top: var(--spacing-md);
          padding: var(--spacing-md);
          background: linear-gradient(135deg, rgba(34, 197, 94, 0.1), var(--bg-secondary));
          border: 1px solid rgba(34, 197, 94, 0.3);
          border-radius: var(--radius-xl);
          display: flex;
          flex-direction: column;
          gap: var(--spacing-sm);
        }

        .arena-cta-content {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
        }

        .arena-cta-icon {
          font-size: 2rem;
        }

        .arena-cta-text h4 {
          margin: 0;
          color: #22c55e;
          font-size: 1rem;
        }

        .arena-cta-text p {
          margin: 4px 0 0 0;
          font-size: 0.875rem;
          color: var(--text-secondary);
        }

        .arena-cta-btn {
          padding: var(--spacing-sm) var(--spacing-md);
          background: linear-gradient(135deg, #22c55e, #16a34a);
          color: white;
          border: none;
          border-radius: var(--radius-lg);
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .arena-cta-btn:hover {
          filter: brightness(1.1);
          transform: translateY(-2px);
        }

        /* Community Teaser */
        .community-teaser {
          margin-top: var(--spacing-md);
          padding: var(--spacing-md);
          background: var(--bg-secondary);
          border: 1px dashed var(--bg-tertiary);
          border-radius: var(--radius-xl);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--spacing-sm);
          opacity: 0.8;
        }

        .teaser-content {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
        }

        .teaser-icon {
          font-size: 1.5rem;
        }

        .teaser-text h4 {
          margin: 0;
          color: var(--text-primary);
          font-size: 0.9rem;
        }

        .teaser-text p {
          margin: 4px 0 0 0;
          font-size: 0.8rem;
          color: var(--text-muted);
        }

        .coming-soon-badge {
          font-size: 0.65rem;
          padding: 4px 10px;
          background: rgba(255, 215, 0, 0.2);
          color: #FFD700;
          border-radius: var(--radius-full);
          font-weight: 600;
          white-space: nowrap;
        }

        .empty-state {
          text-align: center;
          padding: var(--spacing-xl);
          color: var(--text-secondary);
        }

        .empty-icon {
          font-size: 3rem;
          margin-bottom: var(--spacing-md);
          opacity: 0.5;
        }

        .empty-state h3 {
          color: var(--text-primary);
          margin-bottom: var(--spacing-sm);
        }

        .results {
          display: block;
        }

        .results > * {
          margin-bottom: var(--spacing-lg);
        }

        .results > *:last-child {
          margin-bottom: 0;
        }

        .main-stats {
          display: flex;
          flex-direction: column;
          align-items: stretch;
          gap: var(--spacing-md);
          width: 100%;
          max-width: 100%;
          box-sizing: border-box;
        }

        .stat-box {
          background: var(--bg-secondary);
          border: 2px solid var(--bg-tertiary);
          border-radius: var(--radius-xl);
          padding: var(--spacing-lg);
          text-align: center;
          width: 100%;
        }

        .stat-box.elixir {
          background: linear-gradient(135deg, rgba(168, 85, 247, 0.1), var(--bg-secondary));
          border-color: #a855f7;
        }

        .stat-box.cycle {
          background: linear-gradient(135deg, rgba(34, 197, 94, 0.1), var(--bg-secondary));
          border-color: #22c55e;
        }

        .stat-sublabel {
          display: block;
          font-size: 0.625rem;
          color: var(--text-muted);
          margin-top: var(--spacing-xs);
        }

        .stat-hint {
          display: block;
          font-size: 0.75rem;
          color: var(--accent-primary);
          margin-top: var(--spacing-xs);
          font-weight: 600;
        }

        .stat-label {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--spacing-xs);
        }

        .info-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 18px;
          height: 18px;
          background: var(--bg-tertiary);
          color: var(--text-muted);
          font-size: 0.75rem;
          border-radius: 50%;
          cursor: pointer;
          transition: all 0.2s;
        }

        .info-icon:hover {
          background: var(--accent-primary);
          color: white;
        }

        .info-icon.small {
          width: 14px;
          height: 14px;
          font-size: 0.625rem;
        }

        /* Custom Info Popup */
        .info-popup-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: var(--spacing-md);
          animation: fadeIn 0.2s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .info-popup {
          background: var(--bg-secondary);
          border: 1px solid var(--bg-tertiary);
          border-radius: var(--radius-xl);
          padding: var(--spacing-lg);
          max-width: 320px;
          width: 100%;
          position: relative;
          animation: slideUp 0.2s ease;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
        }

        @keyframes slideUp {
          from { 
            opacity: 0;
            transform: translateY(20px);
          }
          to { 
            opacity: 1;
            transform: translateY(0);
          }
        }

        .info-popup-close {
          position: absolute;
          top: var(--spacing-sm);
          right: var(--spacing-sm);
          width: 28px;
          height: 28px;
          background: var(--bg-tertiary);
          border: none;
          border-radius: 50%;
          color: var(--text-muted);
          font-size: 1.25rem;
          line-height: 1;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }

        .info-popup-close:hover {
          background: var(--accent-primary);
          color: white;
        }

        .info-popup h4 {
          margin: 0 0 var(--spacing-sm);
          color: var(--accent-primary);
          font-size: 1.1rem;
          padding-right: 30px;
        }

        .info-popup p {
          margin: 0;
          color: var(--text-secondary);
          font-size: 0.9rem;
          line-height: 1.5;
        }

        .stat-label {
          display: block;
          font-size: 0.75rem;
          color: var(--text-muted);
          text-transform: uppercase;
          margin-bottom: var(--spacing-xs);
        }

        .stat-value {
          display: block;
          font-size: 2.5rem;
          font-weight: 800;
          color: #a855f7;
          line-height: 1;
        }

        .elixir-bar {
          height: 4px;
          background: var(--bg-tertiary);
          border-radius: var(--radius-full);
          margin-top: var(--spacing-sm);
          overflow: hidden;
        }

        .elixir-fill {
          height: 100%;
          background: linear-gradient(90deg, #a855f7, #ec4899);
          border-radius: var(--radius-full);
          transition: width 0.5s ease;
        }

        .archetype-tags {
          display: flex;
          flex-wrap: wrap;
          gap: var(--spacing-xs);
          justify-content: center;
        }

        .tag {
          padding: var(--spacing-xs) var(--spacing-sm);
          background: var(--bg-secondary);
          border: 1px solid var(--bg-tertiary);
          border-radius: var(--radius-full);
          font-size: 0.75rem;
          color: var(--accent-primary);
          font-weight: 600;
        }

        .preview-section {
          background: var(--bg-secondary);
          border: 1px solid var(--bg-tertiary);
          border-radius: var(--radius-xl);
          padding: var(--spacing-lg);
        }

        .preview-section h4 {
          margin: 0 0 var(--spacing-md);
          font-size: 1rem;
          color: var(--text-primary);
        }

        .deck-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: var(--spacing-sm);
        }

        .dcard {
          text-align: center;
        }

        .dcard-img-wrap {
          position: relative;
          aspect-ratio: 1;
          border-radius: var(--radius-md);
          overflow: hidden;
          background: var(--bg-tertiary);
          border: 2px solid;
          margin-bottom: var(--spacing-xs);
        }

        .dcard-img-wrap img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .dcard-elixir {
          position: absolute;
          bottom: 4px;
          left: 4px;
          background: rgba(0,0,0,0.8);
          color: #a855f7;
          font-size: 0.75rem;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: var(--radius-sm);
        }

        .dcard-name {
          display: block;
          font-size: 0.75rem;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .dcard-rarity {
          font-size: 0.625rem;
          text-transform: uppercase;
        }

        .dcard-badges {
          display: flex;
          gap: 4px;
          justify-content: center;
          margin-top: 2px;
        }

        .dcard-badge {
          font-size: 0.5rem;
          font-weight: 800;
          padding: 1px 4px;
          border-radius: 3px;
          line-height: 1;
          text-transform: uppercase;
        }

        .dcard-badge--evo {
          background: linear-gradient(135deg, #a855f7, #7c3aed);
          color: white;
        }

        .dcard-badge--hero {
          background: linear-gradient(135deg, #f59e0b, #d97706);
          color: white;
        }

        .breakdown-section {
          background: var(--bg-secondary);
          border: 1px solid var(--bg-tertiary);
          border-radius: var(--radius-xl);
          padding: var(--spacing-md);
        }

        .breakdown-section h4 {
          margin: 0 0 var(--spacing-xs);
          font-size: 1rem;
          color: var(--text-primary);
        }

        .section-hint {
          margin: 0 0 var(--spacing-md);
          font-size: 0.875rem;
          color: var(--text-muted);
        }



        .breakdown-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: var(--spacing-md);
        }

        .break-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: var(--spacing-sm);
          background: var(--bg-primary);
          border-radius: var(--radius-lg);
        }

        .bi-icon {
          font-size: 1.5rem;
          margin-bottom: var(--spacing-xs);
        }

        .bi-value {
          font-size: 1.5rem;
          font-weight: 800;
          color: var(--text-primary);
        }

        .bi-label {
          font-size: 0.75rem;
          color: var(--text-muted);
        }

        .elixir-distribution {
          display: flex;
          justify-content: center;
          align-items: flex-end;
          gap: var(--spacing-sm);
          height: 80px;
          padding: var(--spacing-sm);
          background: var(--bg-primary);
          border-radius: var(--radius-lg);
        }

        .dist-bar {
          flex: 1;
          max-width: 40px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }

        .dist-count {
          font-size: 0.875rem;
          font-weight: 700;
          color: var(--text-primary);
          min-height: 18px;
        }

        .dist-fill {
          width: 100%;
          background: linear-gradient(180deg, #a855f7, #7c3aed);
          border-radius: var(--radius-sm) var(--radius-sm) 0 0;
          min-height: 3px;
          max-height: 40px;
          transition: height 0.3s ease;
        }

        .dist-label {
          font-size: 0.625rem;
          color: var(--text-muted);
        }

        .combat-grid {
          display: grid;
          gap: var(--spacing-sm);
        }

        .combat-item {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
          padding: var(--spacing-xs) var(--spacing-sm);
          background: var(--bg-primary);
          border-radius: var(--radius-md);
        }

        .ci-label {
          width: 110px;
          font-size: 0.875rem;
          color: var(--text-secondary);
          flex-shrink: 0;
          display: flex;
          align-items: center;
          gap: var(--spacing-xs);
        }

        .ci-bar-wrap {
          flex: 1;
          height: 8px;
          background: var(--bg-tertiary);
          border-radius: var(--radius-full);
          overflow: hidden;
        }

        .ci-bar {
          height: 100%;
          border-radius: var(--radius-full);
          transition: width 0.3s ease;
        }

        .ci-value {
          width: 32px;
          text-align: right;
          font-size: 0.875rem;
          font-weight: 700;
          flex-shrink: 0;
        }

        .ci-range-text {
          flex: 1;
          text-align: right;
          font-size: 0.875rem;
          color: var(--text-primary);
        }

        .ci-badge {
          padding: 2px 8px;
          border-radius: var(--radius-full);
          font-size: 0.7rem;
          font-weight: 700;
          text-transform: uppercase;
          white-space: nowrap;
          flex-shrink: 0;
        }

        .rarity-list {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-xs);
        }

        .rarity-item {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
          padding: var(--spacing-xs) var(--spacing-sm);
          background: var(--bg-primary);
          border-radius: var(--radius-md);
        }

        .rarity-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
        }

        .rarity-name {
          flex: 1;
          text-transform: capitalize;
          font-size: 0.875rem;
        }

        .rarity-count {
          font-weight: 700;
          color: var(--text-primary);
        }

        .open-cr-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--spacing-sm);
          width: 100%;
          padding: var(--spacing-md);
          background: linear-gradient(135deg, #22c55e, #16a34a);
          color: white;
          font-weight: 700;
          font-size: 1rem;
          border: none;
          border-radius: var(--radius-lg);
          cursor: pointer;
        }

        .open-cr-btn:hover {
          filter: brightness(1.1);
        }

        /* Responsive Fixes */
        @media (max-width: 640px) {
          .input-section {
            padding: 0 var(--spacing-sm);
            margin-bottom: var(--spacing-md);
          }

          .input-row {
            flex-direction: column;
            gap: var(--spacing-xs);
          }

          .deck-input {
            width: 100%;
            font-size: 0.9rem;
            padding: var(--spacing-sm);
          }

          .analyze-btn {
            width: 100%;
            padding: var(--spacing-sm);
          }

          /* Sample sections mobile */
          .sample-decks {
            justify-content: center;
          }

          .sample-deck-card {
            flex: 1;
            min-width: 80px;
            max-width: 120px;
          }

          .arena-cta,
          .community-teaser {
            margin-left: var(--spacing-xs);
            margin-right: var(--spacing-xs);
          }

          .arena-cta-content,
          .teaser-content {
            flex-direction: column;
            text-align: center;
          }

          .stat-box {
            padding: var(--spacing-md);
          }

          .stat-value {
            font-size: 2rem;
          }

          .deck-grid {
            gap: var(--spacing-xs);
          }

          .breakdown-grid {
            gap: var(--spacing-sm);
          }

          /* Combat items mobile fix */
          .combat-item {
            flex-wrap: wrap;
            padding: var(--spacing-xs);
          }

          .ci-label {
            width: 100px;
            font-size: 0.8rem;
          }

          .ci-value {
            width: 28px;
            font-size: 0.8rem;
          }

          .ci-badge {
            font-size: 0.65rem;
            padding: 2px 6px;
          }
        }

        /* Deck Identity */
        .identity-section {
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.08), var(--bg-secondary));
          border: 1px solid rgba(59, 130, 246, 0.25);
          border-radius: var(--radius-xl);
          padding: var(--spacing-lg);
        }

        .identity-title {
          margin: 0 0 var(--spacing-md);
          font-size: 1rem;
          color: var(--text-primary);
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
        }

        .identity-card {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-sm);
        }

        .identity-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--spacing-sm);
        }

        .identity-label {
          font-size: 0.875rem;
          color: var(--text-secondary);
        }

        .identity-value {
          font-size: 0.9rem;
          font-weight: 700;
        }

        .identity-value--primary {
          color: #3b82f6;
        }

        .identity-value--secondary {
          color: #a855f7;
        }

        .identity-value--confidence {
          color: #22c55e;
        }

        .confidence-bar {
          height: 6px;
          background: var(--bg-tertiary);
          border-radius: var(--radius-full);
          overflow: hidden;
          margin-top: 2px;
        }

        .confidence-fill {
          height: 100%;
          background: linear-gradient(90deg, #3b82f6, #22c55e);
          border-radius: var(--radius-full);
          transition: width 0.6s ease;
        }

        .identity-description {
          margin: var(--spacing-sm) 0 0;
          font-size: 0.875rem;
          color: var(--text-secondary);
          line-height: 1.5;
        }

        /* Playstyle Breakdown */
        .playstyle-list {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-sm);
        }

        .playstyle-item {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
        }

        .ps-label {
          width: 110px;
          font-size: 0.875rem;
          color: var(--text-secondary);
          flex-shrink: 0;
        }

        .ps-bar-wrap {
          flex: 1;
          height: 10px;
          background: var(--bg-primary);
          border-radius: var(--radius-full);
          overflow: hidden;
        }

        .ps-bar {
          height: 100%;
          border-radius: var(--radius-full);
          transition: width 0.5s ease;
        }

        .ps-value {
          width: 40px;
          text-align: right;
          font-size: 0.875rem;
          font-weight: 700;
          color: var(--text-primary);
          flex-shrink: 0;
        }

        /* How This Deck Wins */
        .win-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: var(--spacing-sm);
        }

        .win-item {
          position: relative;
          padding-left: var(--spacing-lg);
          font-size: 0.875rem;
          color: var(--text-secondary);
          line-height: 1.5;
        }

        .win-item::before {
          content: '•';
          position: absolute;
          left: 0;
          color: var(--accent-primary);
          font-weight: 800;
          font-size: 1.2rem;
          line-height: 1;
        }

        /* Strengths & Weaknesses */
        .sw-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--spacing-md);
        }

        .sw-column {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-sm);
        }

        .sw-heading {
          font-size: 0.875rem;
          font-weight: 700;
          margin: 0;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .sw-heading--strength {
          color: #22c55e;
        }

        .sw-heading--weakness {
          color: #ef4444;
        }

        .sw-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: var(--spacing-xs);
        }

        .sw-item {
          position: relative;
          padding-left: var(--spacing-md);
          font-size: 0.8rem;
          color: var(--text-secondary);
          line-height: 1.4;
        }

        .sw-item::before {
          content: '';
          position: absolute;
          left: 0;
          top: 6px;
          width: 6px;
          height: 6px;
          border-radius: 50%;
        }

        .sw-item--strength::before {
          background: #22c55e;
        }

        .sw-item--weakness::before {
          background: #ef4444;
        }

        /* Similar Decks */
        .similar-list {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-sm);
        }

        .similar-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--spacing-sm);
          padding: var(--spacing-sm) var(--spacing-md);
          background: var(--bg-primary);
          border-radius: var(--radius-lg);
        }

        .similar-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }

        .similar-name {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .similar-meta {
          font-size: 0.75rem;
          color: var(--text-muted);
        }

        .similar-score {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 4px;
          flex-shrink: 0;
        }

        .similar-percent {
          font-size: 0.875rem;
          font-weight: 800;
          color: var(--text-primary);
        }

        .similar-bar-wrap {
          width: 80px;
          height: 5px;
          background: var(--bg-tertiary);
          border-radius: var(--radius-full);
          overflow: hidden;
        }

        .similar-bar {
          height: 100%;
          border-radius: var(--radius-full);
          transition: width 0.4s ease;
        }

        /* Responsive Fixes */
        @media (max-width: 640px) {
          .ps-label {
            width: 90px;
            font-size: 0.8rem;
          }

          .ps-value {
            width: 36px;
            font-size: 0.8rem;
          }

          .sw-grid {
            grid-template-columns: 1fr;
            gap: var(--spacing-md);
          }

          .similar-item {
            flex-direction: column;
            align-items: flex-start;
            gap: var(--spacing-xs);
          }

          .similar-score {
            flex-direction: row;
            align-items: center;
            width: 100%;
          }

          .similar-bar-wrap {
            flex: 1;
          }
        }

        /* Extra small screens */
        @media (max-width: 380px) {
          .deck-grid {
            grid-template-columns: repeat(4, 1fr);
            gap: 4px;
          }

          .dcard-name {
            font-size: 0.65rem;
          }
        }
      `}</style>
    </div>
  );
}

export default memo(DeckStats);
