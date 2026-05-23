import { useState } from 'react';
import { formatTimestamp } from '../utils/deckParser';
import DeckPreview from './DeckPreview';

function QueueItem({ 
  item, 
  isNext = false, 
  onOpen, 
  onReview, 
  onRemove,
  showActions = true 
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showConfirmRemove, setShowConfirmRemove] = useState(false);

  const handleOpen = () => {
    if (item.deckLink) {
      window.open(item.deckLink, '_blank');
    }
    if (onOpen) onOpen(item);
  };

  const handleReview = () => {
    if (onReview) onReview(item.id);
  };

  const handleRemove = () => {
    if (showConfirmRemove) {
      if (onRemove) onRemove(item.id);
      setShowConfirmRemove(false);
    } else {
      setShowConfirmRemove(true);
      // Auto-hide confirmation after 3 seconds
      setTimeout(() => setShowConfirmRemove(false), 3000);
    }
  };

  return (
    <div className={`queue-item ${isNext ? 'queue-item--next' : ''} ${isExpanded ? 'queue-item--expanded' : ''}`}>
      {/* Next Badge */}
      {isNext && (
        <div className="queue-item__next-badge">
          <span>👑</span>
          <span>NEXT</span>
        </div>
      )}

      {/* Header */}
      <div className="queue-item__header" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="queue-item__info">
          <div className="queue-item__name-row">
            <span className="queue-item__name">{item.viewerName || 'Anonymous'}</span>
            {item.trophyRange && (
              <span className="queue-item__trophies">🏆 {item.trophyRange}</span>
            )}
          </div>
          <span className="queue-item__time">
            {formatTimestamp(item.submittedAt)}
          </span>
        </div>
        <button className="queue-item__expand-btn">
          {isExpanded ? '▲' : '▼'}
        </button>
      </div>

      {/* Preview (always visible) */}
      <div className="queue-item__preview" onClick={() => setIsExpanded(!isExpanded)}>
        <DeckPreview cardIds={item.cardIds} compact={!isExpanded} />
      </div>

      {/* Actions */}
      {showActions && (
        <div className="queue-item__actions">
          <button
            onClick={handleOpen}
            className="btn btn-primary btn-sm queue-item__btn"
            title="Open in Clash Royale"
          >
            <span>🎮</span>
            <span>Open</span>
          </button>
          
          <button
            onClick={handleReview}
            className="btn btn-success btn-sm queue-item__btn"
            title="Mark as reviewed"
          >
            <span>✓</span>
            <span>Reviewed</span>
          </button>
          
          <button
            onClick={handleRemove}
            className={`btn btn-sm queue-item__btn ${showConfirmRemove ? 'btn-danger' : 'btn-ghost'}`}
            title={showConfirmRemove ? 'Click again to confirm' : 'Remove from queue'}
          >
            <span>{showConfirmRemove ? '⚠️' : '✕'}</span>
            <span>{showConfirmRemove ? 'Confirm' : 'Remove'}</span>
          </button>
        </div>
      )}

      {/* Expanded Details */}
      {isExpanded && (
        <div className="queue-item__details animate-slideUp">
          <div className="queue-item__detail-row">
            <span className="queue-item__detail-label">Deck Link:</span>
            <div className="queue-item__link-group">
              <code className="queue-item__link">{item.deckLink}</code>
              <button
                onClick={() => navigator.clipboard.writeText(item.deckLink)}
                className="btn btn-ghost btn-sm"
                title="Copy link"
              >
                📋
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .queue-item {
          background: var(--bg-secondary);
          border-radius: var(--radius-lg);
          padding: var(--spacing-md);
          border: 2px solid transparent;
          transition: all var(--transition-fast);
        }

        .queue-item:hover {
          border-color: var(--bg-tertiary);
        }

        .queue-item--next {
          border-color: var(--accent-primary);
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, var(--bg-secondary) 100%);
          box-shadow: 0 0 20px rgba(59, 130, 246, 0.2);
        }

        .queue-item__next-badge {
          display: inline-flex;
          align-items: center;
          gap: var(--spacing-xs);
          background: linear-gradient(135deg, var(--accent-primary) 0%, #8b5cf6 100%);
          color: white;
          font-size: 0.625rem;
          font-weight: 800;
          padding: var(--spacing-xs) var(--spacing-sm);
          border-radius: var(--radius-full);
          margin-bottom: var(--spacing-sm);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .queue-item__header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: var(--spacing-sm);
          cursor: pointer;
          margin-bottom: var(--spacing-sm);
        }

        .queue-item__info {
          flex: 1;
          min-width: 0;
        }

        .queue-item__name-row {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
          flex-wrap: wrap;
        }

        .queue-item__name {
          font-weight: 700;
          color: var(--text-primary);
          font-size: 1rem;
        }

        .queue-item__trophies {
          font-size: 0.75rem;
          color: var(--accent-warning);
          background: rgba(245, 158, 11, 0.1);
          padding: 2px 8px;
          border-radius: var(--radius-full);
        }

        .queue-item__time {
          display: block;
          font-size: 0.75rem;
          color: var(--text-muted);
          margin-top: 2px;
        }

        .queue-item__expand-btn {
          background: none;
          border: none;
          color: var(--text-muted);
          font-size: 0.75rem;
          cursor: pointer;
          padding: var(--spacing-xs);
          transition: color var(--transition-fast);
        }

        .queue-item__expand-btn:hover {
          color: var(--text-primary);
        }

        .queue-item__preview {
          cursor: pointer;
          margin-bottom: var(--spacing-md);
        }

        .queue-item__actions {
          display: flex;
          gap: var(--spacing-sm);
          flex-wrap: wrap;
        }

        .queue-item__btn {
          flex: 1;
          min-width: 80px;
          white-space: nowrap;
        }

        .queue-item__details {
          margin-top: var(--spacing-md);
          padding-top: var(--spacing-md);
          border-top: 1px solid var(--bg-tertiary);
        }

        .queue-item__detail-row {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-xs);
        }

        .queue-item__detail-label {
          font-size: 0.75rem;
          color: var(--text-muted);
          font-weight: 600;
        }

        .queue-item__link-group {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
        }

        .queue-item__link {
          flex: 1;
          font-size: 0.625rem;
          background: var(--bg-primary);
          padding: var(--spacing-xs) var(--spacing-sm);
          border-radius: var(--radius-sm);
          color: var(--text-secondary);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-family: monospace;
        }
      `}</style>
    </div>
  );
}

export default QueueItem;
