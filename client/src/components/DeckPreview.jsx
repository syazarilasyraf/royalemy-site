import { useState } from 'react';
import { getCardById, getCardImageUrl, getPlaceholderImageUrl, rarityColors } from '../utils/cardMapping';

function DeckPreview({ cardIds, showElixir = true, compact = false }) {
  const [failedImages, setFailedImages] = useState(new Set());

  if (!cardIds || cardIds.length === 0) {
    return (
      <div className={`deck-preview deck-preview--empty ${compact ? 'deck-preview--compact' : ''}`}>
        <span className="deck-preview__empty-text">No cards</span>
      </div>
    );
  }

  // Note: Elixir calculation requires elixir data in cards.json
  // For now, we show a placeholder or calculate if available
  const avgElixir = cardIds.length > 0 ? 
    (cardIds.reduce((sum, id) => {
      const card = getCardById(id);
      return sum + (card.elixir || 0);
    }, 0) / cardIds.length).toFixed(1) 
    : '0.0';

  const handleImageError = (cardId) => {
    setFailedImages(prev => new Set([...prev, cardId]));
  };

  return (
    <div className={`deck-preview ${compact ? 'deck-preview--compact' : ''}`}>
      <div className="deck-preview__grid">
        {cardIds.map((cardId, index) => {
          const card = getCardById(cardId);
          const imageUrl = failedImages.has(cardId) 
            ? getPlaceholderImageUrl() 
            : getCardImageUrl(cardId);
          const elixirCost = card.elixir || 0;
          
          return (
            <div
              key={`${cardId}-${index}`}
              className="deck-preview__card"
              title={card.name}
              style={{
                '--rarity-color': rarityColors[card.rarity] || rarityColors.default
              }}
            >
              <div className="deck-preview__card-inner">
                <img
                  src={imageUrl}
                  alt={card.name}
                  className="deck-preview__card-image"
                  loading="lazy"
                  onError={() => handleImageError(cardId)}
                />
                {elixirCost > 0 && (
                  <span className="deck-preview__card-elixir">{elixirCost}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
      
      {showElixir && (
        <div className="deck-preview__elixir">
          <span className="deck-preview__elixir-icon">💧</span>
          <span className="deck-preview__elixir-value">{avgElixir}</span>
          <span className="deck-preview__elixir-label">avg elixir</span>
        </div>
      )}

      <style>{`
        .deck-preview {
          width: 100%;
        }

        .deck-preview--empty {
          padding: var(--spacing-lg);
          text-align: center;
          color: var(--text-muted);
          background: var(--bg-secondary);
          border-radius: var(--radius-md);
        }

        .deck-preview__grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: var(--spacing-xs);
        }

        .deck-preview--compact .deck-preview__grid {
          gap: 2px;
        }

        .deck-preview__card {
          position: relative;
          aspect-ratio: 1;
          border-radius: var(--radius-sm);
          overflow: hidden;
          background: linear-gradient(135deg, var(--bg-tertiary) 0%, var(--bg-secondary) 100%);
          border: 2px solid var(--rarity-color);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
          transition: transform 0.15s ease;
        }

        .deck-preview__card:hover {
          transform: scale(1.05);
          z-index: 1;
        }

        .deck-preview--compact .deck-preview__card {
          border-width: 1px;
        }

        .deck-preview__card-inner {
          position: relative;
          width: 100%;
          height: 100%;
        }

        .deck-preview__card-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .deck-preview__card-elixir {
          position: absolute;
          bottom: 2px;
          left: 2px;
          background: rgba(0, 0, 0, 0.8);
          color: #a855f7;
          font-size: 0.625rem;
          font-weight: 700;
          padding: 1px 4px;
          border-radius: var(--radius-sm);
          line-height: 1;
        }

        .deck-preview--compact .deck-preview__card-elixir {
          font-size: 0.5rem;
          padding: 0 2px;
        }

        .deck-preview__elixir {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--spacing-xs);
          margin-top: var(--spacing-sm);
          padding: var(--spacing-xs) var(--spacing-sm);
          background: rgba(168, 85, 247, 0.1);
          border-radius: var(--radius-full);
          font-size: 0.75rem;
        }

        .deck-preview__elixir-icon {
          font-size: 0.875rem;
        }

        .deck-preview__elixir-value {
          font-weight: 700;
          color: #a855f7;
        }

        .deck-preview__elixir-label {
          color: var(--text-muted);
          font-size: 0.625rem;
          text-transform: uppercase;
        }

        .deck-preview--compact .deck-preview__elixir {
          margin-top: var(--spacing-xs);
          font-size: 0.625rem;
        }
      `}</style>
    </div>
  );
}

export default DeckPreview;
