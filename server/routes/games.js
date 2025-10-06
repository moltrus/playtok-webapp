import { Router } from 'express';
const router = Router();
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import path from 'path';
import { fileURLToPath } from 'url';
import parser from '../utils/parser.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { parseGamesCsv } = parser;

/**
 * @route   GET /api/games
 * @desc    Get paginated list of all games from games.csv
 * @access  Public
 * @query   page - Page number (default: 1)
 * @query   limit - Games per page (default: 20)
 * 
 * This endpoint:
 * 1. Reads the games.csv file from the project root
 * 2. Parses it into structured JSON objects
 * 3. Filters out tap-jump and tilt-maze games
 * 4. Returns a paginated response with metadata
 */
router.get('/', async (req, res) => {
  try {
    const csvFilePath = join(__dirname, '../../games.csv');

    if (!existsSync(csvFilePath)) {
      return res.status(404).json({ 
        success: false, 
        message: 'Games data file not found' 
      });
    }

    // Read CSV file synchronously (re-reads on every request, no caching)
    const csvData = readFileSync(csvFilePath, 'utf8');

    // Parse CSV into structured game objects (also filters out tap-jump and tilt-maze)
    const allGames = await parseGamesCsv(csvData);

    // Handle pagination - extract page and limit from query params
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;

    // Slice the array to get only the requested page
    const games = allGames.slice(startIndex, endIndex);

    const pagination = {
      total: allGames.length,
      totalPages: Math.ceil(allGames.length / limit),
      currentPage: page,
      hasMore: endIndex < allGames.length
    };

    return res.json({
      success: true,
      count: allGames.length,
      pagination,
      games
    });
  } catch (err) {
    console.error('Error reading games CSV:', err);
    return res.status(500).json({ 
      success: false, 
      message: 'Server error while fetching games data',
      error: process.env.NODE_ENV === 'production' ? {} : err.message
    });
  }
});

/**
 * @route   GET /api/games/:id
 * @desc    Get a single game by ID
 * @access  Public
 * @param   id - Game identifier (supports both underscore and hyphen formats)
 * 
 * This endpoint:
 * 1. Reads the games.csv file from the project root
 * 2. Parses it into structured JSON objects
 * 3. Normalizes the requested ID (underscores → hyphens)
 * 4. Finds and returns the matching game
 */
router.get('/:id', async (req, res) => {
  try {
    const gameId = req.params.id;

    const csvFilePath = join(__dirname, '../../games.csv');

    if (!existsSync(csvFilePath)) {
      return res.status(404).json({ 
        success: false, 
        message: 'Games data file not found' 
      });
    }

    // Read CSV file synchronously
    const csvData = readFileSync(csvFilePath, 'utf8');

    // Parse CSV into structured game objects
    const games = await parseGamesCsv(csvData);

    // Normalize game ID to support both underscore and hyphen formats
    // e.g., "fruit_slice" → "fruit-slice"
    const normalizedGameId = gameId.replace(/_/g, '-');
    const game = games.find(g => g.id === gameId || g.id === normalizedGameId);

    if (!game) {
      return res.status(404).json({
        success: false,
        message: `Game with ID ${gameId} not found`
      });
    }

    return res.json({
      success: true,
      game
    });
  } catch (err) {
    console.error(`Error fetching game ${req.params.id}:`, err);
    return res.status(500).json({ 
      success: false, 
      message: 'Server error while fetching game data',
      error: process.env.NODE_ENV === 'production' ? {} : err.message
    });
  }
});

export default router;
