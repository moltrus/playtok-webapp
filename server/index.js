const express = require('express');
const cors = require('cors');
const path = require('path');
const gamesRoutes = require('./routes/games');
const statsRoutes = require('./routes/stats');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files if needed in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../build')));
}

// API Routes
app.use('/api/games', gamesRoutes);
app.use('/api/stats', statsRoutes);

// Root API route to show available endpoints
app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'PlayTok API is running',
    endpoints: [
      '/api/games',
      '/api/stats'
    ]
  });
});

// Default route for production - serves the React app
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../build', 'index.html'));
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Server error',
    error: process.env.NODE_ENV === 'production' ? {} : err
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`🎮 PlayTok API server running on port ${PORT}`);
  console.log(`📊 API endpoints available at http://localhost:${PORT}/api`);
});

module.exports = app;
