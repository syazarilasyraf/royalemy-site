/**
 * LocalStorage Helpers
 * Handles persistence of queue, history, and settings
 */

const STORAGE_KEYS = {
  QUEUE: 'cr_deck_queue',
  HISTORY: 'cr_deck_history',
  STREAM_CODE: 'cr_stream_code',
  IS_UNLOCKED: 'cr_is_unlocked'
};

// Default stream code - change this for each stream
const DEFAULT_STREAM_CODE = 'LIVE2024';

/**
 * Get the current stream code
 * @returns {string}
 */
export function getStreamCode() {
  try {
    const code = localStorage.getItem(STORAGE_KEYS.STREAM_CODE);
    return code || DEFAULT_STREAM_CODE;
  } catch (error) {
    console.error('Error reading stream code:', error);
    return DEFAULT_STREAM_CODE;
  }
}

/**
 * Set a new stream code
 * @param {string} code 
 */
export function setStreamCode(code) {
  try {
    localStorage.setItem(STORAGE_KEYS.STREAM_CODE, code);
  } catch (error) {
    console.error('Error saving stream code:', error);
  }
}

/**
 * Check if user is unlocked
 * @returns {boolean}
 */
export function isUnlocked() {
  try {
    return localStorage.getItem(STORAGE_KEYS.IS_UNLOCKED) === 'true';
  } catch (error) {
    return false;
  }
}

/**
 * Set unlocked state
 * @param {boolean} unlocked 
 */
export function setUnlocked(unlocked) {
  try {
    localStorage.setItem(STORAGE_KEYS.IS_UNLOCKED, unlocked ? 'true' : 'false');
  } catch (error) {
    console.error('Error saving unlock state:', error);
  }
}

/**
 * Clear unlock state (lock the app)
 */
export function lockApp() {
  setUnlocked(false);
}

/**
 * Validate stream code
 * @param {string} inputCode 
 * @returns {boolean}
 */
export function validateStreamCode(inputCode) {
  const currentCode = getStreamCode();
  return inputCode.trim().toUpperCase() === currentCode.toUpperCase();
}

/**
 * Get queue from storage
 * @returns {array}
 */
export function getQueue() {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.QUEUE);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error reading queue:', error);
    return [];
  }
}

/**
 * Save queue to storage
 * @param {array} queue 
 */
export function saveQueue(queue) {
  try {
    localStorage.setItem(STORAGE_KEYS.QUEUE, JSON.stringify(queue));
  } catch (error) {
    console.error('Error saving queue:', error);
  }
}

/**
 * Add item to queue
 * @param {object} item 
 * @returns {object} - The added item with generated ID
 */
export function addToQueue(item) {
  const queue = getQueue();
  const newItem = {
    ...item,
    id: item.id || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    submittedAt: item.submittedAt || new Date().toISOString()
  };
  queue.push(newItem);
  saveQueue(queue);
  return newItem;
}

/**
 * Remove item from queue
 * @param {string} id 
 */
export function removeFromQueue(id) {
  const queue = getQueue();
  const filtered = queue.filter(item => item.id !== id);
  saveQueue(filtered);
}

/**
 * Clear entire queue
 */
export function clearQueue() {
  saveQueue([]);
}

/**
 * Get history from storage
 * @returns {array}
 */
export function getHistory() {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.HISTORY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error reading history:', error);
    return [];
  }
}

/**
 * Save history to storage
 * @param {array} history 
 */
export function saveHistory(history) {
  try {
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
  } catch (error) {
    console.error('Error saving history:', error);
  }
}

/**
 * Move item from queue to history
 * @param {string} id 
 * @returns {object|null} - The moved item or null if not found
 */
export function markAsReviewed(id) {
  const queue = getQueue();
  const item = queue.find(q => q.id === id);
  
  if (!item) return null;
  
  // Remove from queue
  const filteredQueue = queue.filter(q => q.id !== id);
  saveQueue(filteredQueue);
  
  // Add to history
  const history = getHistory();
  const historyItem = {
    ...item,
    reviewedAt: new Date().toISOString()
  };
  history.unshift(historyItem); // Add to beginning
  saveHistory(history);
  
  return historyItem;
}

/**
 * Add item directly to history
 * @param {object} item 
 */
export function addToHistory(item) {
  const history = getHistory();
  const historyItem = {
    ...item,
    id: item.id || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    reviewedAt: item.reviewedAt || new Date().toISOString()
  };
  history.unshift(historyItem);
  saveHistory(history);
  return historyItem;
}

/**
 * Remove item from history
 * @param {string} id 
 */
export function removeFromHistory(id) {
  const history = getHistory();
  const filtered = history.filter(item => item.id !== id);
  saveHistory(filtered);
}

/**
 * Clear entire history
 */
export function clearHistory() {
  saveHistory([]);
}

/**
 * Clear all data (for complete reset)
 */
export function clearAllData() {
  saveQueue([]);
  saveHistory([]);
  lockApp();
}

/**
 * Get stats
 * @returns {object}
 */
export function getStats() {
  return {
    queueCount: getQueue().length,
    historyCount: getHistory().length,
    totalSubmissions: getQueue().length + getHistory().length
  };
}
