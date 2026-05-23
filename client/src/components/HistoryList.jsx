import { useState } from 'react';
import HistoryItem from './HistoryItem';
import { clearHistory } from '../utils/storage';

function HistoryList({ history, onHistoryChange }) {
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleRemove = (id) => {
    const { removeFromHistory } = require('../utils/storage');
    removeFromHistory(id);
    onHistoryChange();
  };

  const handleClear = () => {
    if (showClearConfirm) {
      clearHistory();
      onHistoryChange();
      setShowClearConfirm(false);
    } else {
      setShowClearConfirm(true);
      setTimeout(() => setShowClearConfirm(false), 3000);
    }
  };

  if (!history || history.length === 0) {
    return (
      <div className="history-list">
        <div className="history-header">
          <div className="section-title">
            <span className="section-icon">📜</span>
            <span>Viewed History</span>
          </div>
          <span className="badge badge-secondary">0</span>
        </div>
        
        <div className="empty-state empty-state--small">
          <div className="empty-state-text">
            Reviewed decks will appear here
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="history-list">
      <div className="history-header">
        <div className="section-title">
          <span className="section-icon">📜</span>
          <span>Viewed History</span>
        </div>
        <div className="history-header-actions">
          <span className="badge badge-secondary">{history.length}</span>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="btn btn-ghost btn-sm"
            title={isCollapsed ? 'Expand' : 'Collapse'}
          >
            {isCollapsed ? '▲' : '▼'}
          </button>
          <button
            onClick={handleClear}
            className={`btn btn-sm ${showClearConfirm ? 'btn-danger' : 'btn-ghost'}`}
            title={showClearConfirm ? 'Click to confirm' : 'Clear history'}
          >
            {showClearConfirm ? '⚠️' : '🗑️'}
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <div className="history-items">
          {history.slice(0, 20).map((item) => (
            <HistoryItem
              key={item.id}
              item={item}
              onRemove={handleRemove}
            />
          ))}
          
          {history.length > 20 && (
            <div className="history-more">
              <span>+{history.length - 20} more decks in history</span>
            </div>
          )}
        </div>
      )}

      <style>{`
        .history-list {
          width: 100%;
        }

        .history-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: var(--spacing-md);
        }

        .history-header-actions {
          display: flex;
          align-items: center;
          gap: var(--spacing-xs);
        }

        .history-items {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-sm);
          max-height: 500px;
          overflow-y: auto;
          padding-right: var(--spacing-xs);
        }

        .history-more {
          text-align: center;
          padding: var(--spacing-sm);
          color: var(--text-muted);
          font-size: 0.75rem;
          font-style: italic;
        }

        .empty-state--small {
          padding: var(--spacing-md);
        }

        .empty-state--small .empty-state-text {
          font-size: 0.75rem;
        }

        .badge-secondary {
          background: rgba(148, 163, 184, 0.2);
          color: var(--text-secondary);
        }
      `}</style>
    </div>
  );
}

export default HistoryList;
