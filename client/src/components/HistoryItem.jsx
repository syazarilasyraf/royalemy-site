import { useState } from 'react';
import { formatTimestamp } from '../utils/deckParser';
import DeckPreview from './DeckPreview';

function HistoryItem({ item, onRemove }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showConfirmRemove, setShowConfirmRemove] = useState(false);

  const handleOpen = () => {
    if (item.deckLink) {
      window.open(item.deckLink, '_blank');
    }
  };

  const handleRemove = () => {
    if (showConfirmRemove) {
      if (onRemove) onRemove(item.id);
      setShowConfirmRemove(false);
    } else {
      setShowConfirmRemove(true);
      setTimeout(() => setShowConfirmRemove(false), 3000);
    }
  };

  return (
    <div className={`history-item ${isExpanded ? 'history-item--expanded' : ''}`}>
      {/* Header */}
      <div className="history-item__header" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="history-item__info">
          <span className="history-item__name">{item.viewerName || 'Anonymous'}</span>
          <span className="history-item__time">
            Reviewed {formatTimestamp(item.reviewedAt || item.submittedAt)}
          </span>
        </div>
        <div className="history-item__actions-preview">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleOpen();
            }}
            className="btn btn-ghost btn-sm"
            title="Open in Clash Royale"
          >
            🎮
          </button>
          <button className="history-item__expand-btn">
            {isExpanded ? '▲' : '▼'}
          </button>
        </div>
      </div>

      {/* Preview */}
      <div className="history-item__preview" onClick={() => setIsExpanded(!isExpanded)}>
        <DeckPreview cardIds={item.cardIds} compact={!isExpanded} showElixir={isExpanded} />
      </div>

      {/* Expanded Actions */}
      {isExpanded && (
        <div className="history-item__actions animate-slideUp">
          <button
            onClick={handleOpen}
            className="btn btn-primary btn-sm"
          >
            <span>🎮</span>
            <span>Open in Clash Royale</span>
          </button>
          
          <button
            onClick={() => navigator.clipboard.writeText(item.deckLink)}
            className="btn btn-secondary btn-sm"
          >
            <span>📋</span>
            <span>Copy Link</span>
          </button>
          
          <button
            onClick={handleRemove}
            className={`btn btn-sm ${showConfirmRemove ? 'btn-danger' : 'btn-ghost'}`}
          >
            <span>{showConfirmRemove ? '⚠️' : '🗑️'}</span>
            <span>{showConfirmRemove ? 'Confirm Remove' : 'Remove'}</span>
          </button>
        </div>
      )}

      <style>{`
        .history-item {
          background: var(--bg-secondary);
          border-radius: var(--radius-lg);
          padding: var(--spacing-sm) var(--spacing-md);
          border: 1px solid var(--bg-tertiary);
          opacity: 0.8;
          transition: all var(--transition-fast);
        }

        .history-item:hover {
          opacity: 1;
          border-color: var(--bg-hover);
        }

        .history-item__header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--spacing-sm);
          cursor: pointer;
          margin-bottom: var(--spacing-sm);
        }

        .history-item__info {
          flex: 1;
          min-width: 0;
        }

        .history-item__name {
          display: block;
          font-weight: 600;
          color: var(--text-primary);
          font-size: 0.875rem;
        }

        .history-item__time {
          display: block;
          font-size: 0.75rem;
          color: var(--text-muted);
          margin-top: 2px;
        }

        .history-item__actions-preview {
          display: flex;
          align-items: center;
          gap: var(--spacing-xs);
        }

        .history-item__expand-btn {
          background: none;
          border: none;
          color: var(--text-muted);
          font-size: 0.75rem;
          cursor: pointer;
          padding: var(--spacing-xs);
          transition: color var(--transition-fast);
        }

        .history-item__expand-btn:hover {
          color: var(--text-primary);
        }

        .history-item__preview {
          cursor: pointer;
        }

        .history-item__actions {
          display: flex;
          gap: var(--spacing-sm);
          flex-wrap: wrap;
          margin-top: var(--spacing-sm);
          padding-top: var(--spacing-sm);
          border-top: 1px solid var(--bg-tertiary);
        }
      `}</style>
    </div>
  );
}

export default HistoryItem;
