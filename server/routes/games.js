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

router.get('/', async (req, res) => {
  try {
    const csvFilePath = join(__dirname, '../../games.csv');

    if (!existsSync(csvFilePath)) {
      return res.status(404).json({ 
        success: false, 
        message: 'Games data file not found' 
      });
    }

    const csvData = readFileSync(csvFilePath, 'utf8');

    const allGames = await parseGamesCsv(csvData);

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;

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

    const csvData = readFileSync(csvFilePath, 'utf8');

    const games = await parseGamesCsv(csvData);

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
