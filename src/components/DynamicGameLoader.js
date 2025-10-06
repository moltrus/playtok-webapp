import React, { useState, useEffect } from 'react';
import { gameRegistry } from '../utils/gameRegistry';
import { useGame } from '../context/GameContext';

/**
 * DynamicGameLoader component
 * Handles loading a game dynamically by ID and displaying loading states
 */
const DynamicGameLoader = ({ gameId, onGameReady }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const { fetchGameDetails } = useGame();

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    setLoadingProgress(0);
    let isMounted = true;
    const loadGame = async () => {
      try {
        const gameData = await fetchGameDetails(gameId);
        if (!isMounted) return;
        setLoadingProgress(30);
        const GameClass = await gameRegistry.getGameClass(gameId);
        if (!isMounted) return;
        setLoadingProgress(80);
        setTimeout(() => {
          if (isMounted) {
            setLoadingProgress(100);
            setIsLoading(false);
            onGameReady(GameClass, gameData);
          }
        }, 300);
      } catch (err) {
        if (isMounted) {
          console.error('Error loading game:', err);
          setError(`Failed to load game: ${err.message}`);
          setIsLoading(false);
        }
      }
    };
    loadGame();
    return () => {
      isMounted = false;
    };
  }, [gameId, fetchGameDetails, onGameReady]);

  if (isLoading) {
    return (
      <div className="game-loading-container" style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        padding: '20px',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        color: '#fff',
      }}>
        <div className="loading-text" style={{ marginBottom: '20px' }}>
          Loading Game...
        </div>
        <div className="progress-container" style={{
          width: '80%',
          height: '10px',
          backgroundColor: 'rgba(255, 255, 255, 0.2)',
          borderRadius: '5px',
          overflow: 'hidden',
        }}>
          <div className="progress-bar" style={{
            width: `${loadingProgress}%`,
            height: '100%',
            backgroundColor: 'rgba(0, 255, 255, 0.8)',
            transition: 'width 0.3s ease-in-out',
          }} />
        </div>
        <div className="loading-status" style={{ 
          marginTop: '10px',
          fontSize: '14px',
          color: 'rgba(255, 255, 255, 0.7)',
        }}>
          {loadingProgress < 30 && 'Initializing...'}
          {loadingProgress >= 30 && loadingProgress < 80 && 'Loading game assets...'}
          {loadingProgress >= 80 && 'Preparing game...'}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="game-error-container" style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        padding: '20px',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        color: '#fff',
      }}>
        <div style={{ 
          fontSize: '48px',
          marginBottom: '20px',
        }}>
          😕
        </div>
        <div style={{ 
          fontSize: '24px',
          marginBottom: '10px',
          color: 'rgba(255, 100, 100, 0.9)',
        }}>
          Oops!
        </div>
        <div style={{
          textAlign: 'center',
          marginBottom: '20px',
        }}>
          {error}
        </div>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: '10px 20px',
            backgroundColor: 'rgba(0, 255, 255, 0.6)',
            border: 'none',
            borderRadius: '4px',
            color: '#fff',
            cursor: 'pointer',
          }}
        >
          Try Again
        </button>
      </div>
    );
  }

  return null;
};

export default DynamicGameLoader;