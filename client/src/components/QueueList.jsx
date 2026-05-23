import { useState } from 'react';
import QueueItem from './QueueItem';
import { clearQueue } from '../utils/storage';

function QueueList({ queue, onQueueChange }) {
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleReview = (id) => {
    // Import dynamically to avoid circular deps
    const { markAsReviewed } = require('../utils/storage');
    markAsReviewed(id);
    onQueueChange();
  };

  const handleRemove = (id) => {
    const { removeFromQueue } = require('../utils/storage');
    removeFromQueue(id);
    onQueueChange();
  };

  const handleClear = () => {
    if (showClearConfirm) {
      clearQueue();
      onQueueChange();
      setShowClearConfirm(false);
    } else {
      setShowClearConfirm(true);
      setTimeout(() => setShowClearConfirm(false), 3000);
    }
  };

  if (!queue || queue.length === 0) {
    return (
      <div className="queue-list">
        <div className="queue-header">
          <div className="section-title">
            <span className="section-icon">📥</span>
            <span>Incoming Queue</span>
          </div>
          <span className="badge badge-primary">0</span>
        </div>
        
        <div className="empty-state">
          <div className="empty-state-icon">📭</div>
          <div className="empty-state-title">No decks in queue</div>
          <div className="empty-state-text">
            Submitted decks will appear here
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="queue-list">
      <div className="queue-header">
        <div className="section-title">
          <span className="section-icon">📥</span>
          <span>Incoming Queue</span>
        </div>
        <div className="queue-header-actions">
          <span className="badge badge-primary">{queue.length}</span>
          {queue.length > 0 && (
            <button
              onClick={handleClear}
              className={`btn btn-sm ${showClearConfirm ? 'btn-danger' : 'btn-ghost'}`}
              title={showClearConfirm ? 'Click to confirm' : 'Clear all'}
            >
              {showClearConfirm ? '⚠️ Confirm' : 'Clear All'}
            </button>
          )}
        </div>
      </div>

      <div className="queue-items">
        {queue.map((item, index) => (
          <QueueItem
            key={item.id}
            item={item}
            isNext={index === 0}
            onReview={handleReview}
            onRemove={handleRemove}
          />
        ))}
      </div>

      <style>{`
        .queue-list {
          width: 100%;
        }

        .queue-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: var(--spacing-md);
        }

        .queue-header-actions {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
        }

        .queue-items {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-md);
        }
      `}</style>
    </div>
  );
}

export default QueueList;
