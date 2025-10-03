/**
 * Game Service
 * Handles API communication with the backend server
 */

const API_URL = 'http://localhost:5000/api';

/**
 * Fetches the list of games from the server with pagination support
 * @param {number} page - The page number to fetch (starts at 1)
 * @param {number} limit - Number of games per page
 * @returns {Promise<Object>} Object containing games array and pagination metadata
 */
export const fetchGames = async (page = 1, limit = 20) => {
  try {
    const response = await fetch(`${API_URL}/games?page=${page}&limit=${limit}`);
    
    if (!response.ok) {
      throw new Error(`Error fetching games: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch games:', error);
    throw error;
  }
};

/**
 * Fetches a single game by ID
 * @param {string} gameId - The ID of the game to fetch
 * @returns {Promise<Object>} Game object
 */
export const fetchGameById = async (gameId) => {
  try {
    const response = await fetch(`${API_URL}/games/${gameId}`);
    
    if (!response.ok) {
      throw new Error(`Error fetching game: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Failed to fetch game ${gameId}:`, error);
    throw error;
  }
};

/**
 * Fetches the stats from the server
 * @returns {Promise<Object>} Stats object containing game data
 */
export const fetchStats = async () => {
  try {
    const response = await fetch(`${API_URL}/stats`);
    
    if (!response.ok) {
      throw new Error(`Error fetching stats: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch stats:', error);
    throw error;
  }
};