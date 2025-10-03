import React, { useState, useEffect } from 'react';
import { fetchGameLeaderboard } from '../services/gameService';
import './Leaderboard.css';

/**
 * A component to display a game's leaderboard
 * 
 * @param {string} gameId - The ID of the game to show the leaderboard for
 * @param {number} limit - Number of leaderboard entries to display (default: 5)
 * @param {boolean} autoRefresh - Whether to refresh the leaderboard automatically (default: false)
 * @param {Function} onClose - Optional callback when the user wants to close the leaderboard
 */
const Leaderboard = ({ gameId, limit = 5, autoRefresh = false, onClose }) => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [gameName, setGameName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let intervalId;
    
    const loadLeaderboard = async () => {
      try {
        setLoading(true);
        const response = await fetchGameLeaderboard(gameId);
        
        if (response && response.game) {
          setGameName(response.game.name);
          setLeaderboard(response.game.leaderboard || []);
        } else {
          setError('Could not load leaderboard data');
        }
      } catch (err) {
        console.error('Failed to load leaderboard:', err);
        setError('Error loading leaderboard');
      } finally {
        setLoading(false);
      }
    };

    loadLeaderboard();
    
    // Set up auto-refresh if enabled
    if (autoRefresh) {
      intervalId = setInterval(loadLeaderboard, 30000); // Refresh every 30 seconds
    }
    
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [gameId, autoRefresh]);

  if (loading && !leaderboard.length) {
    return (
      <div className="leaderboard-container">
        <div className="leaderboard-header">
          <h3>Loading Leaderboard...</h3>
          {onClose && (
            <button className="close-button" onClick={onClose}>×</button>
          )}
        </div>
        <div className="loading-indicator">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="leaderboard-container" style={{
      background: 'rgba(10, 10, 31, 0.9)',
      borderRadius: '8px',
      padding: '15px',
      boxShadow: '0 0 20px rgba(0, 255, 255, 0.3), 0 0 40px rgba(138, 43, 226, 0.2)',
      border: '1px solid rgba(0, 255, 255, 0.4)',
      width: '100%',
      maxWidth: '380px'
    }}>
      <div className="leaderboard-header" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '12px',
        borderBottom: '1px solid rgba(0, 255, 255, 0.3)',
        paddingBottom: '8px'
      }}>
        <h3 style={{
          margin: 0,
          fontSize: '18px',
          color: 'rgba(0, 255, 255, 0.9)',
          textShadow: '0 0 8px rgba(0, 255, 255, 0.6)'
        }}>
          {gameName || gameId} Leaderboard
          {autoRefresh && <span style={{
            fontSize: '10px',
            background: 'rgba(0, 255, 255, 0.2)',
            padding: '2px 5px',
            borderRadius: '4px',
            marginLeft: '8px',
            verticalAlign: 'middle'
          }}>LIVE</span>}
        </h3>
        
        {onClose && (
          <button 
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'rgba(255, 255, 255, 0.6)',
              fontSize: '20px',
              cursor: 'pointer',
              padding: '0 5px'
            }}
          >
            ×
          </button>
        )}
      </div>
      
      {error && (
        <div className="error-message" style={{
          color: '#ff6b6b',
          padding: '10px',
          textAlign: 'center',
          fontSize: '14px'
        }}>
          {error}
        </div>
      )}
      
      {leaderboard.length === 0 && !error ? (
        <div className="empty-leaderboard" style={{
          textAlign: 'center',
          padding: '20px 10px',
          color: 'rgba(255, 255, 255, 0.6)',
          fontStyle: 'italic'
        }}>
          No scores yet. Be the first to play!
        </div>
      ) : (
        <table style={{
          width: '100%',
          borderCollapse: 'collapse'
        }}>
          <thead>
            <tr style={{ 
              borderBottom: '1px solid rgba(138, 43, 226, 0.4)'
            }}>
              <th style={{ 
                padding: '8px', 
                textAlign: 'center',
                color: 'rgba(138, 43, 226, 0.9)'
              }}>Rank</th>
              <th style={{ 
                padding: '8px', 
                textAlign: 'left',
                color: 'rgba(138, 43, 226, 0.9)'
              }}>Player</th>
              <th style={{ 
                padding: '8px', 
                textAlign: 'right',
                color: 'rgba(138, 43, 226, 0.9)'
              }}>Score</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard
              .slice(0, limit)
              .map((entry, index) => (
                <tr key={`${entry.name}-${index}`} style={{
                  borderBottom: '1px solid rgba(0, 255, 255, 0.1)',
                  background: index < 3 ? `rgba(${index === 0 ? '255, 215, 0' : index === 1 ? '192, 192, 192' : '205, 127, 50'}, 0.1)` : 'transparent'
                }}>
                  <td style={{ 
                    padding: '8px', 
                    textAlign: 'center',
                    color: index < 3 ? 
                      `rgba(${index === 0 ? '255, 215, 0' : index === 1 ? '192, 192, 192' : '205, 127, 50'}, 0.8)` : 
                      'rgba(255, 255, 255, 0.7)',
                    fontWeight: index < 3 ? 'bold' : 'normal'
                  }}>
                    {index + 1}
                  </td>
                  <td style={{ 
                    padding: '8px', 
                    textAlign: 'left',
                    color: 'rgba(255, 255, 255, 0.9)'
                  }}>
                    {entry.name}
                  </td>
                  <td style={{ 
                    padding: '8px', 
                    textAlign: 'right',
                    fontFamily: 'monospace',
                    fontSize: '16px',
                    color: 'rgba(0, 255, 255, 0.9)'
                  }}>
                    {entry.score.toLocaleString()}
                  </td>
                </tr>
              ))
            }
          </tbody>
        </table>
      )}
      
      <div style={{
        fontSize: '10px',
        color: 'rgba(255, 255, 255, 0.4)',
        textAlign: 'right',
        marginTop: '10px',
        fontStyle: 'italic'
      }}>
        Last updated: {new Date().toLocaleTimeString()}
      </div>
    </div>
  );
};

export default Leaderboard;