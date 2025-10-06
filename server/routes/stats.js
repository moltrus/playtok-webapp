import express from 'express';
const router = express.Router();
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const statsFilePath = path.join(__dirname, '../data/stats.json');

/**
 * @route   GET /api/stats
 * @desc    Get all game stats and leaderboards
 * @access  Public
 */
router.get('/', (req, res) => {
  try {
    if (!fs.existsSync(statsFilePath)) {
      return res.status(404).json({ 
        success: false, 
        message: 'Stats data file not found' 
      });
    }

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
    if (!player || !game || score === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Please provide player, game and score'
      });
    }

    if (!fs.existsSync(statsFilePath)) {
      return res.status(404).json({ 
        success: false, 
        message: 'Stats data file not found' 
      });
    }

    const statsData = fs.readFileSync(statsFilePath, 'utf8');
    const stats = JSON.parse(statsData);
    const gameStats = stats.games.find(g => g.id === game);
    if (!gameStats) {
      return res.status(404).json({
        success: false,
        message: `Game with ID "${game}" not found`
      });
    }

    const newScoreEntry = {
      name: player,
      score: parseInt(score, 10),
      timestamp: new Date().toISOString()
    };

    if (!gameStats.leaderboard) {
      gameStats.leaderboard = [];
    }

    gameStats.leaderboard.push(newScoreEntry);
    gameStats.leaderboard.sort((a, b) => b.score - a.score);
    if (gameStats.leaderboard.length > 10) {
      gameStats.leaderboard = gameStats.leaderboard.slice(0, 10);
    }

    gameStats.baseStats.plays = (gameStats.baseStats.plays || 0) + 1;
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

export default router;
