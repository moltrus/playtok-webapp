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

  

  function handleScoreUpdate(newScore) {
    setScore(newScore);
  }

  function handleGameEnd(finalScore) {
    setScore(finalScore || score);
    setStatus('ended');
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
      <div className="player-header">
        <button onClick={() => handleExit(false)}>Back</button>
        <h2>{meta.name}</h2>
      </div>
      <div className="player-surface" style={{padding:0}}>
        <div style={{width:'100%', maxWidth:480, aspectRatio:'9/16', position:'relative'}}>
          <PlaytokGameCanvas 
            gameId={gameId}
            onScoreUpdate={handleScoreUpdate}
            onGameEnd={handleGameEnd}
          />
          
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
                letterSpacing: '1px'
              }}>Score: {score}</h3>
              <div className="result-buttons">
                <button onClick={() => handleExit(true)}>Claim Win</button>
                <button onClick={() => handleExit(false)}>Exit</button>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="ad-slot">Ad Placeholder</div>
    </div>
  );
}

