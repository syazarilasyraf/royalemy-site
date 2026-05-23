/**
 * Clash Royale Deck Link Parser
 * Parses official Clash Royale deck share links
 * Supports both old and new link formats
 */

/**
 * Extract deck parameter from various link formats
 * @param {string} url 
 * @returns {string|null} - Raw deck parameter or null
 */
function extractDeckParam(url) {
  try {
    const urlObj = new URL(url.trim());
    
    // Format 1: Old format - direct deck param
    // https://link.clashroyale.com/deck/en?deck=27000010;26000007...
    let deckParam = urlObj.searchParams.get('deck');
    if (deckParam) return deckParam;
    
    // Format 2: New format - nested clashroyale:// URL
    // https://link.clashroyale.com/en?clashroyale://copyDeck?deck=27000010;26000007...
    // The entire query string after '?' contains the nested URL
    const fullQuery = urlObj.search;
    
    // Look for deck= in the full query string (handles encoded URLs)
    if (fullQuery.includes('deck=')) {
      const match = fullQuery.match(/deck=([^&]+)/);
      if (match) {
        // Decode in case it's URL encoded
        return decodeURIComponent(match[1]);
      }
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Validates if a URL is a valid Clash Royale deck link
 * @param {string} url 
 * @returns {boolean}
 */
export function isValidDeckLink(url) {
  if (!url || typeof url !== 'string') return false;
  
  try {
    const urlObj = new URL(url.trim());
    
    // Check if it's a clashroyale.com domain
    if (!urlObj.hostname.includes('link.clashroyale.com')) {
      return false;
    }
    
    // Extract deck parameter (handles both old and new formats)
    const deckParam = extractDeckParam(url);
    if (!deckParam) {
      return false;
    }
    
    // Validate deck format (should have 8 card IDs separated by semicolons)
    const cardIds = deckParam.split(';');
    if (cardIds.length !== 8) {
      return false;
    }
    
    // Validate each card ID is a number
    return cardIds.every(id => /^\d+$/.test(id.trim()));
    
  } catch (error) {
    return false;
  }
}

/**
 * Extracts card IDs from a Clash Royale deck link
 * @param {string} url 
 * @returns {array|null} - Array of 8 card IDs or null if invalid
 */
export function extractCardIds(url) {
  if (!isValidDeckLink(url)) {
    return null;
  }
  
  try {
    const deckParam = extractDeckParam(url.trim());
    
    if (!deckParam) return null;
    
    const cardIds = deckParam.split(';').map(id => id.trim());
    
    // Ensure we have exactly 8 cards
    if (cardIds.length !== 8) {
      return null;
    }
    
    return cardIds;
  } catch (error) {
    return null;
  }
}

/**
 * Gets the full deck link from card IDs (for reconstructing links)
 * Uses the new format that Clash Royale app recognizes
 * @param {array} cardIds 
 * @returns {string}
 */
export function buildDeckLink(cardIds) {
  if (!cardIds || cardIds.length !== 8) {
    return '';
  }
  
  const deckString = cardIds.join(';');
  // Use a fixed timestamp like RoyaleAPI - this ensures links work for copy/paste
  // Clash Royale validates the timestamp format but doesn't check if it's recent
  const timestamp = 159000000;
  return `https://link.clashroyale.com/en?clashroyale://copyDeck?deck=${deckString}&tt=${timestamp}&l=Royals`;
}

/**
 * Parse a deck link and return full deck info
 * @param {string} url 
 * @returns {object|null}
 */
export function parseDeckLink(url) {
  const cardIds = extractCardIds(url);
  
  if (!cardIds) {
    return null;
  }
  
  return {
    cardIds,
    originalLink: url.trim(),
    reconstructedLink: buildDeckLink(cardIds)
  };
}

/**
 * Get error message for invalid deck link
 * @param {string} url 
 * @returns {string}
 */
export function getDeckLinkError(url) {
  if (!url || typeof url !== 'string' || url.trim() === '') {
    return 'Please enter a deck link';
  }
  
  try {
    const urlObj = new URL(url.trim());
    
    if (!urlObj.hostname.includes('link.clashroyale.com')) {
      return 'Link must be from link.clashroyale.com';
    }
    
    const deckParam = extractDeckParam(url);
    if (!deckParam) {
      return 'Deck link is missing card data. Make sure you copied the full link.';
    }
    
    const cardIds = deckParam.split(';');
    if (cardIds.length !== 8) {
      return `Deck must have 8 cards (found ${cardIds.length})`;
    }
    
    return 'Invalid deck link format';
  } catch (error) {
    return 'Please enter a valid URL';
  }
}

/**
 * Format timestamp for display
 * @param {string|number|Date} timestamp 
 * @returns {string}
 */
export function formatTimestamp(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) {
    return 'Just now';
  } else if (diffMins < 60) {
    return `${diffMins}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else if (diffDays < 7) {
    return `${diffDays}d ago`;
  } else {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}

/**
 * Generate unique ID for deck submissions
 * @returns {string}
 */
export function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
