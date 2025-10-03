const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

// Path to stats.json file
const statsFilePath = path.join(__dirname, '../data/stats.json');

/**
 * @route   GET /api/stats
 * @desc    Get all game stats and leaderboards
 * @access  Public
 */
router.get('/', (req, res) => {
  try {
    // Check if file exists
    if (!fs.existsSync(statsFilePath)) {
      return res.status(404).json({ 
        success: false, 
        message: 'Stats data file not found' 
      });
    }

    // Read stats.json file
    const statsData = fs.readFileSync(statsFilePath, 'utf8');
    const stats = JSON.parse(statsData);
    
    return res.json({
      success: true,
      stats
    });
  } catch (err) {
    console.error('Error reading stats JSON:', err);
    return res.status(500).json({ 
      success: false, 
      message: 'Server error while fetching stats data',
      error: process.env.NODE_ENV === 'production' ? {} : err.message
    });
  }
});

/**
 * @route   POST /api/stats
 * @desc    Submit a new score
 * @access  Public
 * @body    { player, game, score }
 */
router.post('/', (req, res) => {
  try {
    const { player, game, score } = req.body;
    
    // Validate required fields
    if (!player || !game || score === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Please provide player, game and score'
      });
    }

    // Check if file exists
    if (!fs.existsSync(statsFilePath)) {
      return res.status(404).json({ 
        success: false, 
        message: 'Stats data file not found' 
      });
    }

    // Read stats.json file
    const statsData = fs.readFileSync(statsFilePath, 'utf8');
    const stats = JSON.parse(statsData);
    
    // Find the game in the stats data
    const gameStats = stats.games.find(g => g.id === game);
    if (!gameStats) {
      return res.status(404).json({
        success: false,
        message: `Game with ID "${game}" not found`
      });
    }

    // Add timestamp to the new score entry
    const newScoreEntry = {
      name: player,
      score: parseInt(score, 10),
      timestamp: new Date().toISOString()
    };

    // Add the new score to the leaderboard
    if (!gameStats.leaderboard) {
      gameStats.leaderboard = [];
    }

    // Add to leaderboard and sort by score (descending)
    gameStats.leaderboard.push(newScoreEntry);
    gameStats.leaderboard.sort((a, b) => b.score - a.score);
    
    // Keep only top scores (optional)
    if (gameStats.leaderboard.length > 10) {
      gameStats.leaderboard = gameStats.leaderboard.slice(0, 10);
    }

    // Update base stats
    gameStats.baseStats.plays = (gameStats.baseStats.plays || 0) + 1;
    
    // Write updated stats back to file
    fs.writeFileSync(statsFilePath, JSON.stringify(stats, null, 2));
    
    return res.json({
      success: true,
      message: 'Score submitted successfully',
      entry: newScoreEntry
    });
  } catch (err) {
    console.error('Error updating stats JSON:', err);
    return res.status(500).json({ 
      success: false, 
      message: 'Server error while updating stats data',
      error: process.env.NODE_ENV === 'production' ? {} : err.message
    });
  }
});

module.exports = router;
