const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const csvParser = require('../utils/parser');

/**
 * @route   GET /api/games
 * @desc    Get all games from CSV file
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    // Path to games.csv file (in the root directory)
    const csvFilePath = path.join(__dirname, '../../games.csv');
    
    // Check if file exists
    if (!fs.existsSync(csvFilePath)) {
      return res.status(404).json({ 
        success: false, 
        message: 'Games data file not found' 
      });
    }

    // Read CSV file
    const csvData = fs.readFileSync(csvFilePath, 'utf8');
    
    // Parse CSV to JSON using the parser utility
    const allGames = await csvParser.parseGamesCsv(csvData);
    
    // Implement pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    
    // Paginated results
    const games = allGames.slice(startIndex, endIndex);
    
    // Prepare pagination metadata
    const pagination = {
      total: allGames.length,
      totalPages: Math.ceil(allGames.length / limit),
      currentPage: page,
      hasMore: endIndex < allGames.length
    };
    
    // Return JSON response with pagination
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
    
    // Path to games.csv file (in the root directory)
    const csvFilePath = path.join(__dirname, '../../games.csv');
    
    // Check if file exists
    if (!fs.existsSync(csvFilePath)) {
      return res.status(404).json({ 
        success: false, 
        message: 'Games data file not found' 
      });
    }

    // Read CSV file
    const csvData = fs.readFileSync(csvFilePath, 'utf8');
    
    // Parse CSV to JSON using the parser utility
    const games = await csvParser.parseGamesCsv(csvData);
    
    // Find the requested game
    const normalizedGameId = gameId.replace(/_/g, '-');
    const game = games.find(g => g.id === gameId || g.id === normalizedGameId);
    
    if (!game) {
      return res.status(404).json({
        success: false,
        message: `Game with ID ${gameId} not found`
      });
    }
    
    // Return the game data
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

module.exports = router;
