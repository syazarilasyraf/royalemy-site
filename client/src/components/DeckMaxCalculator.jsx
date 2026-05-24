import { useState, useEffect, useCallback } from 'react';
import { getPlayer } from '../services/api';
import SkeletonLoader from './SkeletonLoader';

// ==================== CONFIG ====================
// Upgrade requirements per rarity (cards needed to reach NEXT level from CURRENT level)
// Source: Official Supercell Clash Royale Level 16 update (Nov 2025)
// Easily updatable — edit these values when Supercell changes requirements
const UPGRADE_REQUIREMENTS = {
  common:    { 1: 1, 2: 2, 3: 4, 4: 10, 5: 20, 6: 50, 7: 100, 8: 200, 9: 400, 10: 800, 11: 1000, 12: 1500, 13: 2500, 14: 3500, 15: 7500 },
  rare:      { 3: 1, 4: 2, 5: 4, 6: 10, 7: 20, 8: 50, 9: 100, 10: 200, 11: 300, 12: 400, 13: 550, 14: 750, 15: 1400 },
  epic:      { 6: 1, 7: 2, 8: 4, 9: 10, 10: 20, 11: 30, 12: 50, 13: 70, 14: 100, 15: 180 },
  legendary: { 9: 1, 10: 2, 11: 4, 12: 6, 13: 9, 14: 12, 15: 20 },
  champion:  { 11: 1, 12: 2, 13: 5, 14: 8, 15: 15 }
};

const MAX_LEVEL = 16;

// The Clash Royale API returns relative levels (starting at 1 for each rarity).
// We must convert to display levels before looking up upgrade costs.
const DISPLAY_BASE_LEVELS = {
  common: 1,
  rare: 3,
  epic: 6,
  legendary: 9,
  champion: 11
};

// Gold cost to upgrade FROM display level TO next level
// Source: Official Supercell Nov 2025 update
const GOLD_REQUIREMENTS = {
  1: 0, 2: 5, 3: 20, 4: 50, 5: 150, 6: 400, 7: 1000, 8: 2000,
  9: 4000, 10: 8000, 11: 15000, 12: 25000, 13: 40000, 14: 60000, 15: 90000, 16: 120000
};

const WEEKLY_GAIN = {
  common: 720,
  rare: 72,
  epic: 4,
  legendary: 0,
  champion: 0
};

// Trade token values (cards per token)
const TRADE_TOKENS = {
  common: 250,
  rare: 50,
  epic: 10,
  legendary: 1
};

// How many cards a Wild Card of each rarity gives
const WILD_CARDS = {
  common: 50,
  rare: 10,
  epic: 5,
  legendary: 1
};

const RARITY_COLORS = {
  common: '#b8b8b8',
  rare: '#ff9f1c',
  epic: '#a855f7',
  legendary: '#3b82f6',
  champion: '#22c55e'
};

const CACHE_KEY = 'deckMaxCalculator:lastResult';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

const SAMPLE_TAGS = ['L88RC989', '2P0JJQ0Y', '8L9L9GL', '9CQ2U8QJ'];

// ==================== CALCULATION HELPERS ====================

function normalizeRarity(rarity) {
  const r = rarity?.toLowerCase?.() || '';
  if (r.includes('common')) return 'common';
  if (r.includes('rare')) return 'rare';
  if (r.includes('epic')) return 'epic';
  if (r.includes('legendary')) return 'legendary';
  if (r.includes('champion')) return 'champion';
  return 'common';
}

function getDisplayLevel(rarity, relativeLevel) {
  const base = DISPLAY_BASE_LEVELS[rarity] || 1;
  return base + relativeLevel - 1;
}

function getCardsToNextLevel(rarity, relativeLevel, count) {
  const displayLevel = getDisplayLevel(rarity, relativeLevel);
  const req = UPGRADE_REQUIREMENTS[rarity]?.[displayLevel];
  if (req === undefined) return 0;
  return Math.max(0, req - (count || 0));
}

function getCardsToMax(rarity, relativeLevel, count) {
  const displayLevel = getDisplayLevel(rarity, relativeLevel);
  let cards = getCardsToNextLevel(rarity, relativeLevel, count);
  for (let l = displayLevel + 1; l < MAX_LEVEL; l++) {
    const req = UPGRADE_REQUIREMENTS[rarity]?.[l];
    if (req !== undefined) cards += req;
  }
  return cards;
}

function getGoldToMax(displayLevel) {
  let gold = 0;
  for (let l = displayLevel + 1; l <= MAX_LEVEL; l++) {
    gold += GOLD_REQUIREMENTS[l] || 0;
  }
  return gold;
}

function getWeeksToMax(rarity, level, count) {
  const weekly = WEEKLY_GAIN[rarity];
  if (weekly === 0) return Infinity;
  const cards = getCardsToMax(rarity, level, count);
  return cards / weekly;
}

function analyzeDeck(currentDeck) {
  const cards = currentDeck.map((card) => {
    const rarity = normalizeRarity(card.rarity);
    const relativeLevel = card.level || 1;
    const displayLevel = getDisplayLevel(rarity, relativeLevel);
    const count = card.count || 0;
    const cardsToNext = getCardsToNextLevel(rarity, relativeLevel, count);
    const cardsToMax = getCardsToMax(rarity, relativeLevel, count);
    const weeks = getWeeksToMax(rarity, relativeLevel, count);
    const goldToMax = getGoldToMax(displayLevel);
    const req = UPGRADE_REQUIREMENTS[rarity]?.[displayLevel] || 1;
    const progressPct = Math.min(100, Math.round(((count || 0) / req) * 100));

    return {
      name: card.name,
      rarity,
      level: displayLevel,
      count,
      cardsToNext,
      cardsToMax,
      weeks,
      goldToMax,
      progressPct,
      maxLevel: card.maxLevel || MAX_LEVEL
    };
  });

  // Priority rank: longest to max = rank 1 (bottleneck)
  const sorted = [...cards].sort((a, b) => b.weeks - a.weeks);
  const ranked = sorted.map((c, i) => ({ ...c, rank: i + 1 }));
  const rankedByName = new Map(ranked.map((c) => [c.name, c]));
  const cardsWithRank = cards.map((c) => ({ ...c, rank: rankedByName.get(c.name).rank }));

  const bottleneck = sorted[0];
  const totalCards = cards.reduce((sum, c) => sum + c.cardsToMax, 0);
  const totalGold = cards.reduce((sum, c) => sum + c.goldToMax, 0);
  const maxWeeks = bottleneck?.weeks ?? 0;
  const fullDeckMaxTime = maxWeeks === Infinity ? '∞' : Math.ceil(maxWeeks);

  // Group by rarity
  const commons = cards.filter((c) => c.rarity === 'common');
  const rares = cards.filter((c) => c.rarity === 'rare');
  const epics = cards.filter((c) => c.rarity === 'epic');
  const legendaries = cards.filter((c) => c.rarity === 'legendary');
  const champions = cards.filter((c) => c.rarity === 'champion');

  // Targets: the card with the most cards remaining in each rarity
  const commonTarget = commons.sort((a, b) => b.cardsToMax - a.cardsToMax)[0];
  const rareTarget = rares.sort((a, b) => b.cardsToMax - a.cardsToMax)[0];
  const epicTarget = epics.sort((a, b) => b.cardsToMax - a.cardsToMax)[0];

  // Request strategy: prioritize the rarity of the overall bottleneck
  // unless it's legendary/champion (can't be requested)
  const requestable = cards.filter((c) => c.weeks !== Infinity);
  const requestBottleneck = requestable.sort((a, b) => b.weeks - a.weeks)[0];
  const primaryRarity = requestBottleneck?.rarity || 'common';

  // Days split: if bottleneck is common, request it 5 days; otherwise split evenly
  const isCommonBottleneck = primaryRarity === 'common';
  const primaryDays = isCommonBottleneck ? 5 : 3;
  const secondaryDays = isCommonBottleneck ? 1 : 3;
  const secondaryRarity = isCommonBottleneck ? 'rare' : 'common';

  // Trade token recommendations
  const tokenRecs = [];
  if (legendaries.length > 0) {
    const legCards = legendaries.reduce((sum, c) => sum + c.cardsToMax, 0);
    tokenRecs.push({ rarity: 'legendary', cards: legCards, tokens: legCards });
  }
  if (rares.length > 0) {
    const rareCards = rares.reduce((sum, c) => sum + c.cardsToMax, 0);
    tokenRecs.push({ rarity: 'rare', cards: rareCards, tokens: Math.ceil(rareCards / TRADE_TOKENS.rare) });
  }
  if (epics.length > 0) {
    const epicCards = epics.reduce((sum, c) => sum + c.cardsToMax, 0);
    tokenRecs.push({ rarity: 'epic', cards: epicCards, tokens: Math.ceil(epicCards / TRADE_TOKENS.epic) });
  }

  // Wild Card recommendation: which rarity saves the most time?
  const wildRecs = ['common', 'rare', 'epic', 'legendary']
    .map((r) => {
      const rarityCards = cards.filter((c) => c.rarity === r);
      const totalCards = rarityCards.reduce((sum, c) => sum + c.cardsToMax, 0);
      const weeksSaved = rarityCards.length > 0 ? WILD_CARDS[r] / (WEEKLY_GAIN[r] || 1) : 0;
      return { rarity: r, cards: totalCards, weeksSaved };
    })
    .filter((r) => r.cards > 0)
    .sort((a, b) => b.weeksSaved - a.weeksSaved);

  return {
    cards: cardsWithRank,
    totalCards,
    totalGold,
    fullDeckMaxTime,
    bottleneck,
    strategy: {
      primaryRarity,
      primaryDays,
      secondaryRarity,
      secondaryDays,
      commonTarget,
      rareTarget,
      epicTarget,
      requestBottleneck,
      hasLegendary: legendaries.length > 0,
      hasChampion: champions.length > 0,
      tokenRecs,
      wildRecs,
      legendaries,
      champions
    }
  };
}

function buildStrategyText(result, playerTag) {
  const s = result.strategy;
  let text = `Deck Max Strategy for #${playerTag}\n`;
  text += `Full Deck Max Time: ${result.fullDeckMaxTime === '∞' ? '∞' : result.fullDeckMaxTime + ' weeks'}\n`;
  text += `Total Cards Needed: ${result.totalCards.toLocaleString()}\n`;
  text += `Total Gold Needed: ${result.totalGold.toLocaleString()}\n`;
  text += `Biggest Bottleneck: ${result.bottleneck.name} (${result.bottleneck.rarity})\n\n`;

  text += `Weekly Request Strategy:\n`;
  text += `Mon–Sat: Request ${s[`${s.primaryRarity}Target`]?.name || s.primaryRarity} ${s.primaryDays} days, ${s[`${s.secondaryRarity}Target`]?.name || s.secondaryRarity} ${s.secondaryDays} days\n`;
  if (s.epicTarget) {
    text += `Sunday: Request ${s.epicTarget.name} (Epic)\n`;
  }
  if (s.hasLegendary) {
    text += `Legendary: Use shop, trade tokens, and chests\n`;
  }
  if (s.hasChampion) {
    text += `Champion: Use shop, trade tokens, and chests\n`;
  }

  if (s.tokenRecs.length > 0) {
    text += `\nTrade Token Plan:\n`;
    s.tokenRecs.forEach((t) => {
      text += `- ${t.rarity.charAt(0).toUpperCase() + t.rarity.slice(1)}: ${t.tokens.toLocaleString()} tokens (${t.cards.toLocaleString()} cards)\n`;
    });
  }

  text += `\nCard Breakdown:\n`;
  result.cards.forEach((c) => {
    text += `- ${c.name} [${c.rarity}] Lv${c.level} → ${c.cardsToMax.toLocaleString()} cards, ${c.goldToMax.toLocaleString()} gold (${c.weeks === Infinity ? '∞' : Math.ceil(c.weeks) + ' wks'})\n`;
  });

  return text;
}

// ==================== COMPONENT ====================

function DeckMaxCalculator() {
  const [playerTag, setPlayerTag] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const [lastTag, setLastTag] = useState('');

  // Load cached result on mount
  useEffect(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const { tag, data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_TTL_MS) {
          setResult(data);
          setLastTag(tag);
          setPlayerTag(tag);
        } else {
          localStorage.removeItem(CACHE_KEY);
        }
      }
    } catch {
      // ignore corrupt cache
    }
  }, []);

  const handleAnalyze = useCallback(async (tagOverride) => {
    const tag = (tagOverride || playerTag).trim().replace('#', '').toUpperCase();
    if (!tag) return;

    setLoading(true);
    setError('');
    setResult(null);
    setLastTag(tag);

    try {
      const data = await getPlayer(tag);
      const deck = data?.currentDeck;
      if (!deck || !Array.isArray(deck) || deck.length === 0) {
        throw new Error('No current deck found for this player.');
      }
      const analysis = analyzeDeck(deck);
      setResult(analysis);
      localStorage.setItem(CACHE_KEY, JSON.stringify({ tag, data: analysis, timestamp: Date.now() }));
    } catch (err) {
      setError(err.message || 'Failed to fetch player data. Check the tag and try again.');
    } finally {
      setLoading(false);
    }
  }, [playerTag]);

  const handleSubmit = (e) => {
    e.preventDefault();
    handleAnalyze();
  };

  const handleSampleClick = (tag) => {
    setPlayerTag(tag);
    handleAnalyze(tag);
  };

  const handleCopy = async () => {
    if (!result || !lastTag) return;
    try {
      await navigator.clipboard.writeText(buildStrategyText(result, lastTag));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const textarea = document.createElement('textarea');
      textarea.value = buildStrategyText(result, lastTag);
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatWeeks = (weeks) => {
    if (weeks === Infinity) return '∞';
    if (weeks < 1) return '<1 wk';
    return `${Math.ceil(weeks)} wks`;
  };

  return (
    <div className="deck-max-calc">
      {/* Header */}
      <div className="calc-header">
        <h2 className="section-title">Deck Max Calculator</h2>
        <p className="section-desc">Enter your player tag to see how long it takes to max your current deck</p>

        <form onSubmit={handleSubmit} className="search-form">
          <div className="input-group">
            <span className="input-prefix">#</span>
            <input
              type="text"
              value={playerTag}
              onChange={(e) => setPlayerTag(e.target.value.replace('#', '').toUpperCase())}
              placeholder="Player Tag (e.g., 2P0JJQ0Y)"
              className="input tag-input"
            />
            <button type="submit" className="btn btn-primary" disabled={loading || !playerTag.trim()}>
              {loading ? 'Analyzing...' : 'Analyze'}
            </button>
          </div>
          {error && (
            <div className="error-box">
              <span className="error-icon">⚠️</span>
              <span>{error}</span>
            </div>
          )}
        </form>

        <div className="sample-tags">
          <span className="sample-label">Try:</span>
          {SAMPLE_TAGS.map((tag) => (
            <button key={tag} className="sample-tag" onClick={() => handleSampleClick(tag)}>
              #{tag}
            </button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="loading-area">
          <SkeletonLoader type="grid" />
          <p className="loading-text">Fetching deck and crunching numbers...</p>
        </div>
      )}

      {/* Results */}
      {result && !loading && (
        <div className="results animate-fadeIn">
          {/* Summary Cards */}
          <div className="summary-grid">
            <div className="summary-card">
              <span className="sc-label">Full Deck Max Time</span>
              <span className="sc-value">
                {result.fullDeckMaxTime === '∞' ? '∞ weeks' : `${result.fullDeckMaxTime} weeks`}
              </span>
            </div>
            <div className="summary-card">
              <span className="sc-label">Total Cards Needed</span>
              <span className="sc-value">{result.totalCards.toLocaleString()}</span>
            </div>
            <div className="summary-card">
              <span className="sc-label">Biggest Bottleneck</span>
              <span className="sc-value bottleneck">
                <span className="bottleneck-name">{result.bottleneck.name}</span>
                <span
                  className="bottleneck-badge"
                  style={{ background: RARITY_COLORS[result.bottleneck.rarity] }}
                >
                  {result.bottleneck.rarity}
                </span>
              </span>
            </div>
            <div className="summary-card">
              <span className="sc-label">Gold Needed</span>
              <span className="sc-value">{result.totalGold.toLocaleString()}</span>
            </div>
          </div>

          {/* Copy Strategy */}
          <div className="copy-row">
            <button className="btn btn-secondary btn-sm" onClick={handleCopy}>
              {copied ? '✅ Copied!' : '📋 Copy Strategy'}
            </button>
          </div>

          {/* Strategy Panel */}
          <div className="strategy-panel">
            <h3 className="panel-title">📋 Smart Request Strategy</h3>
            <div className="strategy-grid">
              <div className="strategy-block">
                <div className="sb-header">Mon – Sat Priority</div>
                <div className="sb-body">
                  <div className="sb-line">
                    <span className="sb-dot" style={{ background: RARITY_COLORS[result.strategy.primaryRarity] }} />
                    <span>Request <strong>{result.strategy[`${result.strategy.primaryRarity}Target`]?.name || result.strategy.primaryRarity}</strong></span>
                    <span className="sb-days">{result.strategy.primaryDays} days</span>
                  </div>
                  {result.strategy.secondaryDays > 0 && (
                    <div className="sb-line">
                      <span className="sb-dot" style={{ background: RARITY_COLORS[result.strategy.secondaryRarity] }} />
                      <span>Request <strong>{result.strategy[`${result.strategy.secondaryRarity}Target`]?.name || result.strategy.secondaryRarity}</strong></span>
                      <span className="sb-days">{result.strategy.secondaryDays} day{result.strategy.secondaryDays > 1 ? 's' : ''}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="strategy-block">
                <div className="sb-header">Sunday Only</div>
                <div className="sb-body">
                  {result.strategy.epicTarget ? (
                    <div className="sb-line">
                      <span className="sb-dot" style={{ background: RARITY_COLORS.epic }} />
                      <span>Request <strong>{result.strategy.epicTarget.name}</strong></span>
                      <span className="sb-days">Epic</span>
                    </div>
                  ) : (
                    <div className="sb-line muted">No epics in deck</div>
                  )}
                </div>
              </div>

              {(result.strategy.hasLegendary || result.strategy.hasChampion) && (
                <div className="strategy-block special">
                  <div className="sb-header">Cannot Request</div>
                  <div className="sb-body">
                    {result.strategy.hasLegendary && (
                      <div className="sb-line">
                        <span className="sb-dot" style={{ background: RARITY_COLORS.legendary }} />
                        <span>Legendary: shop, chests, trade tokens</span>
                      </div>
                    )}
                    {result.strategy.hasChampion && (
                      <div className="sb-line">
                        <span className="sb-dot" style={{ background: RARITY_COLORS.champion }} />
                        <span>Champion: shop, chests, wild cards</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Weekly Schedule Visual */}
            <div className="weekly-schedule">
              <div className="ws-label">Weekly Schedule</div>
              <div className="ws-days">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, i) => {
                  const isPrimary = i < result.strategy.primaryDays;
                  return (
                    <div key={day} className={`ws-day ${isPrimary ? result.strategy.primaryRarity : result.strategy.secondaryRarity}`}>
                      <span className="ws-day-name">{day}</span>
                      <span className="ws-day-type">{isPrimary ? result.strategy.primaryRarity.charAt(0).toUpperCase() + result.strategy.primaryRarity.slice(1) : result.strategy.secondaryRarity.charAt(0).toUpperCase() + result.strategy.secondaryRarity.slice(1)}</span>
                    </div>
                  );
                })}
                <div className="ws-day sunday">
                  <span className="ws-day-name">Sun</span>
                  <span className="ws-day-type">{result.strategy.epicTarget ? 'Epic' : '—'}</span>
                </div>
              </div>
            </div>

            {/* Trade Tokens */}
            {result.strategy.tokenRecs.length > 0 && (
              <div className="token-panel">
                <div className="panel-subtitle">🔁 Trade Token Plan</div>
                <div className="token-list">
                  {result.strategy.tokenRecs.map((rec) => (
                    <div key={rec.rarity} className="token-line">
                      <span className="sb-dot" style={{ background: RARITY_COLORS[rec.rarity] }} />
                      <span className="token-rarity">{rec.rarity.charAt(0).toUpperCase() + rec.rarity.slice(1)}</span>
                      <span className="token-amount">{rec.tokens.toLocaleString()} tokens</span>
                      <span className="token-detail">({rec.cards.toLocaleString()} cards)</span>
                    </div>
                  ))}
                </div>
                <p className="token-note">Trade tokens at King Level 16+. 1 Rare trade ≈ 4 days of requests. 1 Epic trade ≈ 10 days.</p>
              </div>
            )}

            {/* Wild Cards */}
            {result.strategy.wildRecs.length > 0 && (
              <div className="wild-panel">
                <div className="panel-subtitle">🃏 Wild Card Priority</div>
                <div className="wild-list">
                  {result.strategy.wildRecs.map((rec) => (
                    <div key={rec.rarity} className="wild-line">
                      <span className="sb-dot" style={{ background: RARITY_COLORS[rec.rarity] }} />
                      <span className="wild-rarity">{rec.rarity.charAt(0).toUpperCase() + rec.rarity.slice(1)}</span>
                      <span className="wild-time">≈ {rec.weeksSaved.toFixed(1)} weeks saved each</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Gold bottleneck warning */}
            {result.totalGold > 1000000 && (
              <div className="gold-warning">
                <span className="gold-icon">⚠️</span>
                <span>Your deck needs <strong>{result.totalGold.toLocaleString()}</strong> gold to max. Consider playing Gold Rush events, Clan War rewards, and maxing out daily gold from battles.</span>
              </div>
            )}
          </div>

          {/* Detailed Table */}
          <div className="details-panel">
            <h3 className="panel-title">🃏 Card Breakdown</h3>
            <div className="card-table-wrapper">
              <table className="card-table">
                <thead>
                  <tr>
                    <th>Priority</th>
                    <th>Card</th>
                    <th>Level</th>
                    <th>To Next</th>
                    <th>To Max (16)</th>
                    <th>Gold</th>
                    <th>Time</th>
                    <th>Progress</th>
                  </tr>
                </thead>
                <tbody>
                  {result.cards.map((card) => (
                    <tr key={card.name} className={card.rank === 1 ? 'bottleneck-row' : ''}>
                      <td>
                        <span className={`rank-badge rank-${card.rank}`}>{card.rank}</span>
                      </td>
                      <td>
                        <div className="card-name-cell">
                          <span className="card-name">{card.name}</span>
                          <span
                            className="rarity-badge"
                            style={{
                              background: `${RARITY_COLORS[card.rarity]}22`,
                              color: RARITY_COLORS[card.rarity],
                              border: `1px solid ${RARITY_COLORS[card.rarity]}44`
                            }}
                          >
                            {card.rarity}
                          </span>
                        </div>
                      </td>
                      <td>{card.level}</td>
                      <td>{card.cardsToNext.toLocaleString()}</td>
                      <td>{card.cardsToMax.toLocaleString()}</td>
                      <td>{card.goldToMax.toLocaleString()}</td>
                      <td className={card.weeks === Infinity ? 'time-infinity' : ''}>
                        {formatWeeks(card.weeks)}
                      </td>
                      <td>
                        <div className="progress-bar">
                          <div
                            className="progress-fill"
                            style={{
                              width: `${card.progressPct}%`,
                              background: RARITY_COLORS[card.rarity]
                            }}
                          />
                          <span className="progress-text">{card.progressPct}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .deck-max-calc {
          max-width: 900px;
          margin: 0 auto;
          padding: var(--spacing-md);
        }

        .calc-header {
          margin-bottom: var(--spacing-xl);
        }

        .section-title {
          font-size: 1.5rem;
          font-weight: 700;
          margin: 0 0 var(--spacing-xs);
          background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .section-desc {
          color: var(--text-secondary);
          margin: 0 0 var(--spacing-md);
          font-size: 0.9375rem;
        }

        .search-form {
          margin-bottom: var(--spacing-sm);
        }

        .input-group {
          display: flex;
          gap: var(--spacing-sm);
          align-items: center;
        }

        .input-prefix {
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--text-muted);
          user-select: none;
        }

        .tag-input {
          flex: 1;
          min-width: 0;
        }

        .error-box {
          margin-top: var(--spacing-sm);
          padding: var(--spacing-sm) var(--spacing-md);
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: var(--radius-lg);
          color: var(--accent-danger);
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
          font-size: 0.875rem;
        }

        .sample-tags {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
          flex-wrap: wrap;
          margin-top: var(--spacing-sm);
        }

        .sample-label {
          font-size: 0.875rem;
          color: var(--text-muted);
        }

        .sample-tag {
          padding: 4px 10px;
          background: var(--bg-secondary);
          border: 1px solid var(--bg-tertiary);
          border-radius: var(--radius-full);
          color: var(--text-secondary);
          font-size: 0.8125rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .sample-tag:hover {
          border-color: var(--accent-primary);
          color: var(--accent-primary);
        }

        .loading-area {
          text-align: center;
          padding: var(--spacing-xl) 0;
        }

        .loading-text {
          color: var(--text-secondary);
          font-size: 0.9375rem;
          margin-top: var(--spacing-md);
        }

        /* Summary Cards */
        .summary-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: var(--spacing-md);
          margin-bottom: var(--spacing-lg);
        }

        .summary-card {
          background: var(--bg-secondary);
          border: 1px solid var(--bg-tertiary);
          border-radius: var(--radius-xl);
          padding: var(--spacing-lg);
          display: flex;
          flex-direction: column;
          gap: var(--spacing-xs);
        }

        .sc-label {
          font-size: 0.8125rem;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .sc-value {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--text-primary);
        }

        .bottleneck {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
          flex-wrap: wrap;
        }

        .bottleneck-name {
          font-size: 1.25rem;
        }

        .bottleneck-badge {
          padding: 2px 8px;
          border-radius: var(--radius-full);
          font-size: 0.6875rem;
          font-weight: 700;
          text-transform: uppercase;
          color: white;
        }

        .copy-row {
          display: flex;
          justify-content: flex-end;
          margin-bottom: var(--spacing-lg);
        }

        /* Strategy Panel */
        .strategy-panel {
          background: var(--bg-secondary);
          border: 1px solid var(--bg-tertiary);
          border-radius: var(--radius-xl);
          padding: var(--spacing-lg);
          margin-bottom: var(--spacing-lg);
        }

        .panel-title {
          font-size: 1.125rem;
          font-weight: 700;
          margin: 0 0 var(--spacing-md);
          color: var(--text-primary);
        }

        .strategy-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: var(--spacing-md);
          margin-bottom: var(--spacing-lg);
        }

        .strategy-block {
          background: var(--bg-primary);
          border: 1px solid var(--bg-tertiary);
          border-radius: var(--radius-lg);
          padding: var(--spacing-md);
        }

        .strategy-block.special {
          border-color: rgba(245, 158, 11, 0.3);
        }

        .sb-header {
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--text-muted);
          margin-bottom: var(--spacing-sm);
        }

        .sb-body {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-xs);
        }

        .sb-line {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
          font-size: 0.9375rem;
          color: var(--text-primary);
        }

        .sb-line.muted {
          color: var(--text-muted);
        }

        .sb-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .sb-days {
          margin-left: auto;
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--text-muted);
          background: var(--bg-secondary);
          padding: 2px 8px;
          border-radius: var(--radius-full);
        }

        /* Weekly Schedule */
        .weekly-schedule {
          border-top: 1px solid var(--bg-tertiary);
          padding-top: var(--spacing-md);
        }

        .ws-label {
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--text-muted);
          margin-bottom: var(--spacing-sm);
        }

        .ws-days {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: var(--spacing-xs);
        }

        .ws-day {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          padding: var(--spacing-sm);
          border-radius: var(--radius-lg);
          background: var(--bg-primary);
          border: 1px solid var(--bg-tertiary);
        }

        .ws-day.sunday {
          border-color: rgba(168, 85, 247, 0.3);
          background: rgba(168, 85, 247, 0.08);
        }

        .ws-day-name {
          font-size: 0.6875rem;
          font-weight: 700;
          color: var(--text-muted);
        }

        .ws-day-type {
          font-size: 0.6875rem;
          font-weight: 600;
          color: var(--text-secondary);
        }

        /* Details Panel */
        .details-panel {
          background: var(--bg-secondary);
          border: 1px solid var(--bg-tertiary);
          border-radius: var(--radius-xl);
          padding: var(--spacing-lg);
        }

        .card-table-wrapper {
          overflow-x: auto;
        }

        .card-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.875rem;
          min-width: 600px;
        }

        .card-table th {
          text-align: left;
          padding: var(--spacing-sm) var(--spacing-md);
          color: var(--text-muted);
          font-weight: 600;
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-bottom: 1px solid var(--bg-tertiary);
          white-space: nowrap;
        }

        .card-table td {
          padding: var(--spacing-sm) var(--spacing-md);
          border-bottom: 1px solid var(--bg-tertiary);
          color: var(--text-primary);
          vertical-align: middle;
        }

        .card-table tr:last-child td {
          border-bottom: none;
        }

        .card-table tr.bottleneck-row td {
          background: rgba(239, 68, 68, 0.06);
        }

        .rank-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          font-size: 0.75rem;
          font-weight: 700;
          background: var(--bg-tertiary);
          color: var(--text-secondary);
        }

        .rank-badge.rank-1 {
          background: var(--accent-danger);
          color: white;
        }

        .rank-badge.rank-2 {
          background: var(--accent-warning);
          color: white;
        }

        .rank-badge.rank-3 {
          background: var(--accent-primary);
          color: white;
        }

        .card-name-cell {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .card-name {
          font-weight: 600;
        }

        .rarity-badge {
          display: inline-block;
          width: fit-content;
          padding: 1px 6px;
          border-radius: var(--radius-full);
          font-size: 0.625rem;
          font-weight: 700;
          text-transform: uppercase;
        }

        .time-infinity {
          color: var(--accent-danger);
          font-weight: 700;
        }

        .progress-bar {
          position: relative;
          height: 20px;
          background: var(--bg-primary);
          border-radius: var(--radius-full);
          overflow: hidden;
          min-width: 80px;
        }

        .progress-fill {
          height: 100%;
          border-radius: var(--radius-full);
          transition: width 0.6s ease;
        }

        .progress-text {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.6875rem;
          font-weight: 700;
          color: var(--text-primary);
          text-shadow: 0 1px 2px rgba(0,0,0,0.5);
        }

        /* Token & Wild Panels */
        .token-panel,
        .wild-panel {
          margin-top: var(--spacing-md);
          padding: var(--spacing-md);
          background: var(--bg-secondary);
          border-radius: var(--radius-lg);
          border: 1px solid var(--bg-tertiary);
        }

        .panel-subtitle {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: var(--spacing-sm);
        }

        .token-list,
        .wild-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .token-line,
        .wild-line {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
          font-size: 0.8125rem;
        }

        .token-rarity,
        .wild-rarity {
          font-weight: 600;
          min-width: 80px;
          text-transform: capitalize;
        }

        .token-amount {
          font-weight: 700;
          color: var(--accent-primary);
        }

        .token-detail {
          color: var(--text-muted);
        }

        .wild-time {
          color: var(--text-secondary);
        }

        .token-note {
          font-size: 0.75rem;
          color: var(--text-muted);
          margin-top: var(--spacing-sm);
          font-style: italic;
        }

        /* Gold Warning */
        .gold-warning {
          display: flex;
          gap: var(--spacing-sm);
          align-items: flex-start;
          margin-top: var(--spacing-md);
          padding: var(--spacing-md);
          background: rgba(239, 68, 68, 0.08);
          border: 1px solid rgba(239, 68, 68, 0.2);
          border-radius: var(--radius-lg);
          font-size: 0.8125rem;
          color: var(--text-primary);
          line-height: 1.5;
        }

        .gold-icon {
          font-size: 1.125rem;
          flex-shrink: 0;
        }

        /* Rarity-colored schedule days */
        .ws-day.common { background: rgba(59, 130, 246, 0.08); border-color: rgba(59, 130, 246, 0.3); }
        .ws-day.rare { background: rgba(168, 85, 247, 0.08); border-color: rgba(168, 85, 247, 0.3); }
        .ws-day.epic { background: rgba(239, 68, 68, 0.08); border-color: rgba(239, 68, 68, 0.3); }
        .ws-day.legendary { background: rgba(234, 179, 8, 0.08); border-color: rgba(234, 179, 8, 0.3); }
        .ws-day.champion { background: rgba(6, 182, 212, 0.08); border-color: rgba(6, 182, 212, 0.3); }

        /* Animations */
        .animate-fadeIn {
          animation: fadeIn 0.4s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* Mobile */
        @media (max-width: 640px) {
          .deck-max-calc {
            padding: var(--spacing-sm);
          }

          .summary-grid {
            grid-template-columns: 1fr;
          }

          .sc-value {
            font-size: 1.25rem;
          }

          .strategy-grid {
            grid-template-columns: 1fr;
          }

          .ws-days {
            grid-template-columns: repeat(4, 1fr);
          }

          .input-group {
            flex-direction: column;
          }

          .input-prefix {
            display: none;
          }

          .btn {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}

export default DeckMaxCalculator;
