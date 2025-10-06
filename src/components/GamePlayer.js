import { useEffect, useState } from 'react';
import { useGame } from '../context/GameContext';
import { PlaytokGameCanvas } from './PlaytokGameCanvas';

export default function GamePlayer({ gameId, onExit }) {
  console.log('GamePlayer rendered with gameId:', gameId);
  const { games, finishGame } = useGame();
  const meta = games.find(g => g.id === gameId);
  console.log('Game metadata found:', meta);
  const [status, setStatus] = useState('loading');
  const [score, setScore] = useState(0);
  const [gameKey, setGameKey] = useState(0); // Add key to force remount
  // const [playerName, setPlayerName] = useState(() => {
  //   return localStorage.getItem('playerName') || '';
  // });

  function handleScoreUpdate(newScore) {
    setScore(newScore);
  }

  function handleGameEnd(finalScore) {
    setScore(finalScore || score);
    setStatus('ended');
  }

  function handleReplay() {
    setScore(0);
    setStatus('running');
    setGameKey(prev => prev + 1); // Increment key to force remount
  }

  function handleExit(win) {
    finishGame(gameId, { won: !!win });
    onExit();
  }

  useEffect(() => {
    if (gameId) {
      setStatus('running');
    }
  }, [gameId]);

  if (!meta) return null;

  return (
    <div className="player-wrapper">
      <div className="player-header" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0 10px'
      }}>
        <button onClick={() => handleExit(false)}>Back</button>
        <h2>{meta.name}</h2>
      </div>
      <div className="player-surface" style={{padding: '20px', flex: 'none', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 'calc(100vh - 120px)'}}>
        <div style={{width:'100%', maxWidth:480, aspectRatio:'9/16', position:'relative', margin: '0 auto'}}>
          <PlaytokGameCanvas 
            key={gameKey}
            gameId={gameId}
            onScoreUpdate={handleScoreUpdate}
            onGameEnd={handleGameEnd}
          />
          {/* Preload indicator positioned within the game canvas */}
          <div id="preload-indicator" style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            background: 'rgba(0, 0, 0, 0.7)',
            color: '#00ffff',
            padding: '5px 10px',
            borderRadius: '4px',
            fontSize: '12px',
            fontFamily: 'VT323, monospace',
            border: '1px solid rgba(0, 255, 255, 0.3)',
            zIndex: 10,
            display: 'none'
          }}>Loading...</div>
          {status === 'ended' && (
            <div style={{
              position:'absolute', 
              inset:0, 
              background:'linear-gradient(145deg, rgba(26, 10, 45, 0.95) 0%, rgba(15, 10, 26, 0.98) 30%, rgba(45, 26, 61, 0.95) 70%, rgba(10, 10, 31, 0.98) 100%)', 
              display:'flex', 
              flexDirection:'column', 
              alignItems:'center', 
              justifyContent:'center', 
              gap:20,
              border: '2px solid rgba(0, 255, 255, 0.6)',
              borderRadius: '8px',
              backdropFilter: 'blur(12px) saturate(1.5)',
              boxShadow: '0 0 30px rgba(0, 255, 255, 0.3), 0 0 60px rgba(138, 43, 226, 0.2), inset 0 0 20px rgba(0, 255, 255, 0.1)'
            }}>
              <h3 style={{
                margin:0, 
                fontFamily: 'Press Start 2P, monospace', 
                color: '#ffd700', 
                textShadow: '0 0 12px rgba(255, 215, 0, 0.8)',
                fontSize: '18px',
                letterSpacing: '1px',
                marginBottom: '20px'
              }}>Score: {score}</h3>
              <div className="result-buttons" style={{
                display: 'flex',
                gap: '10px'
              }}>
                <button 
                  onClick={handleReplay}
                  style={{
                    background: 'rgba(0, 255, 136, 0.2)',
                    border: '2px solid rgba(0, 255, 136, 0.6)',
                    borderRadius: '4px',
                    color: '#00ff88',
                    padding: '8px 16px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontFamily: 'Press Start 2P, monospace',
                    fontSize: '12px'
                  }}
                >
                  Replay
                </button>
                <button 
                  onClick={() => handleExit(false)}
                  style={{
                    background: 'rgba(255, 100, 100, 0.2)',
                    border: '2px solid rgba(255, 100, 100, 0.6)',
                    borderRadius: '4px',
                    color: '#fff',
                    padding: '8px 16px',
                    cursor: 'pointer'
                  }}
                >
                  Exit
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

