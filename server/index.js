const express = require('express');
const cors = require('cors');
const path = require('path');
const gamesRoutes = require('./routes/games').default;
const statsRoutes = require('./routes/stats');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../build')));
}

app.use('/api/games', gamesRoutes);
app.use('/api/stats', statsRoutes);

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

if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../build', 'index.html'));
  });
}

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Server error',
    error: process.env.NODE_ENV === 'production' ? {} : err
  });
});

app.listen(PORT, () => {
  console.log(`PlayTok API server running on port ${PORT}`);
  console.log(`API endpoints available at http://localhost:${PORT}/api`);
});

export default app;
