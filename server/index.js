import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import gamesRoutes from './routes/games.js';
import statsRoutes from './routes/stats.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

app.use((err, _req, res, _next) => {
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
