/**
 * Clash Royale Card ID Mapping
 * Uses local cards.json data and local images from /cards/
 */

// Import card data
import cardsData from '../data/cards.json';

// Export the card mapping
export const cardMapping = cardsData;

// Rarity colors for UI (used for card borders and styling)
// Since our simple cards.json doesn't include rarity, we use a default
export const rarityColors = {
  common: '#b8b8b8',
  rare: '#ff9f1c',
  epic: '#a855f7',
  legendary: '#3b82f6',
  champion: '#22c55e',
  default: '#b8b8b8'
};

// Placeholder image path (relative to public folder)
const PLACEHOLDER_PATH = '/cards/placeholder.png';

// Default elixir cost for unknown cards
const DEFAULT_ELIXIR = 0;

/**
 * Get card info by ID
 * @param {string|number} cardId 
 * @returns {object|null}
 */
export function getCardById(cardId) {
  const id = typeof cardId === 'string' ? cardId : String(cardId);
  return cardMapping[id] || { 
    id: cardId,
    name: `Unknown (${id})`, 
    image: PLACEHOLDER_PATH,
    rarity: 'common',
    elixir: DEFAULT_ELIXIR
  };
}

/**
 * Get local card image path
 * @param {string|number} cardId 
 * @returns {string}
 */
export function getCardImageUrl(cardId) {
  const id = typeof cardId === 'string' ? cardId : String(cardId);
  const card = cardMapping[id];
  return card?.image || PLACEHOLDER_PATH;
}

/**
 * Get placeholder image path
 * @returns {string}
 */
export function getPlaceholderImageUrl() {
  return PLACEHOLDER_PATH;
}

/**
 * Get elixir cost for a card
 * Note: Since cards.json doesn't include elixir, we return default
 * You can extend cards.json to include elixir costs
 * @param {string|number} cardId 
 * @returns {number}
 */
export function getCardElixir(cardId) {
  const card = getCardById(cardId);
  return card?.elixir ?? DEFAULT_ELIXIR;
}

/**
 * Calculate average elixir cost for a deck
 * @param {array} cardIds - Array of card IDs
 * @returns {string}
 */
export function calculateAverageElixir(cardIds) {
  if (!cardIds || cardIds.length === 0) return '0.0';
  const total = cardIds.reduce((sum, id) => sum + getCardElixir(id), 0);
  return (total / cardIds.length).toFixed(1);
}

/**
 * Get all available card IDs
 * @returns {array}
 */
export function getAllCardIds() {
  return Object.keys(cardMapping);
}

/**
 * Search cards by name
 * @param {string} query 
 * @returns {array} - Array of {id, ...card} objects
 */
export function searchCards(query) {
  const lowerQuery = query.toLowerCase();
  return Object.entries(cardMapping)
    .filter(([_, card]) => card.name.toLowerCase().includes(lowerQuery))
    .map(([id, card]) => ({ id, ...card }));
}
