import React, { useCallback, useState, useEffect } from 'react';
import GameCard from './GameCard';
import { useGame } from '../context/GameContext';
import { fetchGames } from '../services/gameService';

export default function GameFeed({ onEnterGame }) {
  const { games } = useGame();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handlePlay = useCallback((id) => {
    onEnterGame(id);
  }, [onEnterGame]);

  if (loading) {
    return (
      <div className="feed-container loading" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '300px'
      }}>
        <div className="loading-spinner" style={{
          width: '40px',
          height: '40px',
          border: '4px solid rgba(0, 255, 255, 0.2)',
          borderTop: '4px solid rgba(0, 255, 255, 0.8)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div className="feed-container error" style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '300px',
        padding: '20px',
        textAlign: 'center',
        color: 'rgba(255, 100, 100, 0.9)'
      }}>
        <div style={{ marginBottom: '15px', fontSize: '20px' }}>⚠️</div>
        <div>Error loading games. Please try again later.</div>
        <button 
          onClick={() => window.location.reload()} 
          style={{
            marginTop: '15px',
            padding: '8px 16px',
            background: 'rgba(0, 0, 0, 0.5)',
            border: '2px solid rgba(0, 255, 255, 0.6)',
            borderRadius: '4px',
            color: '#fff',
            cursor: 'pointer'
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  if (!games || games.length === 0) {
    return (
      <div className="feed-container empty" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '300px',
        color: 'rgba(255, 255, 255, 0.6)'
      }}>
        No games available right now.
      </div>
    );
  }

  return (
    <div className="feed-container">
      {games.map(g => (
        <section key={g.id} className="feed-slide">
          <GameCard game={g} onPlay={handlePlay} />
        </section>
      ))}
    </div>
  );
}
